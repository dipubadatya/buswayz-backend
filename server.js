

require("dotenv").config();

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

// Security & performance packages
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const mongoSanitize = require("mongo-sanitize");

const hpp = require("hpp");
const morgan = require("morgan");

const connectDB = require("./config/db");
const Bus = require("./models/Bus");

const app = express();
const server = http.createServer(app);

// ===== TRUST PROXY  =====
app.set("trust proxy", 1);

// ===== DATABASE =====
connectDB();

// ===== ALLOWED ORIGINS =====
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL
];

// ===== SOCKET.IO =====
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  },
  transports: ["websocket", "polling"]
});

// ===== SECURITY MIDDLEWARE =====

// Secure HTTP headers
app.use(helmet());

// Logging (development only)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP. Please try again later."
});

app.use("/api", limiter);

// CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookies
app.use(cookieParser());

// Prevent NoSQL injection
app.use((req, res, next) => {
  req.body = mongoSanitize(req.body);
  req.query = mongoSanitize(req.query);
  req.params = mongoSanitize(req.params);
  next();
});



// Prevent HTTP param pollution
app.use(hpp());

// Enable compression
app.use(compression());

// ===== ROUTES =====
app.use("/api", require("./routes/trackingRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

// ===== SOCKET.IO =====
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinBusRoom", async (busId) => {
    socket.join(busId);

    try {
      const bus = await Bus.findById(busId);

      if (!bus) return;

      socket.emit("trackingStatus", {
        status: bus.trackingStarted ? "started" : "stopped"
      });

      if (bus.currentLocation?.lat && bus.currentLocation?.lng) {
        socket.emit("locationUpdate", {
          lat: bus.currentLocation.lat,
          lng: bus.currentLocation.lng
        });
      }

    } catch (err) {
      console.error("Join room error:", err);
    }
  });

  socket.on("startTracking", async ({ busId }) => {
    try {
      await Bus.findByIdAndUpdate(busId, { trackingStarted: true });

      io.to(busId).emit("trackingStatus", { status: "started" });
      io.emit("trackingStatusUpdate", { busId, status: "started" });

    } catch (err) {
      console.error("Start tracking error:", err);
    }
  });

  socket.on("stopTracking", async ({ busId }) => {
    try {
      await Bus.findByIdAndUpdate(busId, { trackingStarted: false });

      io.to(busId).emit("trackingStatus", { status: "stopped" });
      io.emit("trackingStatusUpdate", { busId, status: "stopped" });

    } catch (err) {
      console.error("Stop tracking error:", err);
    }
  });

  socket.on("updateLocation", async ({ busId, coords }) => {
    try {
      await Bus.findByIdAndUpdate(busId, {
        "currentLocation.lat": coords.lat,
        "currentLocation.lng": coords.lng
      });

      io.to(busId).emit("locationUpdate", coords);

    } catch (err) {
      console.error("Location update error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ===== GLOBAL ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// ===== GRACEFUL SHUTDOWN =====
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully.");

  server.close(() => {
    console.log("Process terminated");
  });
});

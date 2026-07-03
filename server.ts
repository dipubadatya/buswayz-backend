import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import http from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

// Security & performance packages
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import mongoSanitize from "mongo-sanitize";
import hpp from "hpp";
import morgan from "morgan";

import connectDB from "./config/db";
import Bus from "./models/Bus";
import { updateBusRealtimeFields } from "./utils/trackingUtils";

// Routes imports
import trackingRoutes from "./routes/trackingRoutes";
import authRoutes from "./routes/authRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import adminRoutes from "./routes/adminRoutes";

const app = express();
const server = http.createServer(app);

// ===== TRUST PROXY =====
app.set("trust proxy", 1);

// ===== DATABASE =====
connectDB();

// ===== ALLOWED ORIGINS =====
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

// ===== SOCKET.IO =====
const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  transports: ["websocket", "polling"],
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
  message: "Too many requests from this IP. Please try again later.",
});

app.use("/api", limiter);

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookies parsing
app.use(cookieParser());

// Prevent NoSQL injection
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.body) mongoSanitize(req.body);
  if (req.query) mongoSanitize(req.query);
  if (req.params) mongoSanitize(req.params);
  next();
});

// Prevent HTTP param pollution
app.use(hpp());

// Enable compression
app.use(compression());

// ===== ROUTES =====
app.use("/api", trackingRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);

console.log("Database ATLAS URL check (masked/defined):", !!process.env.MONGODB_ATLAS);

// ===== SOCKET.IO =====
io.on("connection", (socket: Socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinBusRoom", async (busId: string) => {
    socket.join(busId);

    try {
      const bus = await Bus.findById(busId);

      if (!bus) return;

      socket.emit("trackingStatusUpdate", {
        status: bus.trackingStarted ? "started" : "stopped"
      });

      if (bus.currentLocation?.lat && bus.currentLocation?.lng) {
        socket.emit("locationUpdate", {
          lat: bus.currentLocation.lat,
          lng: bus.currentLocation.lng,
          speed: bus.speed,
          nextStopName: bus.nextStopName,
          nextStopDistance: bus.nextStopDistance,
          nextStopEta: bus.nextStopEta,
          nextStopEtaMinutes: bus.nextStopEtaMinutes,
          delayStatus: bus.delayStatus,
          delayText: bus.delayText,
          delayColor: bus.delayColor,
          arrivedStops: bus.arrivedStops
        });
      }

    } catch (err) {
      console.error("Join room error:", err);
    }
  });

  socket.on("startTracking", async ({ busId }: { busId: string }) => {
    try {
      const bus = await Bus.findById(busId);
      if (bus) {
        bus.trackingStarted = true;
        bus.arrivedStops = [];
        bus.speed = 0;
        bus.nextStopName = bus.stops?.[0]?.name || "Calculating...";
        bus.nextStopDistance = 0;
        bus.nextStopEtaMinutes = 0;
        bus.nextStopEta = bus.stops?.[0]?.scheduledTime || "--:--";
        bus.delayStatus = "";
        bus.delayText = "";
        bus.delayColor = "";
        await bus.save();

        io.to(busId).emit("trackingStatus", { status: "started" });
        io.emit("trackingStatusUpdate", { busId, status: "started" });

        // Emit initial global location update
        io.emit("globalLocationUpdate", {
          busId,
          currentLocation: bus.currentLocation,
          speed: bus.speed,
          nextStopName: bus.nextStopName,
          nextStopDistance: bus.nextStopDistance,
          nextStopEta: bus.nextStopEta,
          nextStopEtaMinutes: bus.nextStopEtaMinutes,
          delayStatus: bus.delayStatus,
          delayText: bus.delayText,
          delayColor: bus.delayColor,
          arrivedStops: bus.arrivedStops
        });
      }
    } catch (err) {
      console.error("Start tracking error:", err);
    }
  });

  socket.on("stopTracking", async ({ busId }: { busId: string }) => {
    try {
      const bus = await Bus.findById(busId);
      if (bus) {
        bus.trackingStarted = false;
        bus.speed = 0;
        bus.arrivedStops = [];
        bus.nextStopName = "";
        bus.nextStopDistance = 0;
        bus.nextStopEtaMinutes = 0;
        bus.nextStopEta = "";
        bus.delayStatus = "";
        bus.delayText = "";
        bus.delayColor = "";
        await bus.save();

        io.to(busId).emit("trackingStatus", { status: "stopped" });
        io.emit("trackingStatusUpdate", { busId, status: "stopped" });

        // Emit updated state to clear metrics on clients
        io.emit("globalLocationUpdate", {
          busId,
          currentLocation: bus.currentLocation,
          speed: 0,
          nextStopName: "",
          nextStopDistance: 0,
          nextStopEtaMinutes: 0,
          nextStopEta: "",
          delayStatus: "",
          delayText: "",
          delayColor: "",
          arrivedStops: []
        });
      }
    } catch (err) {
      console.error("Stop tracking error:", err);
    }
  });

  socket.on("updateLocation", async ({ busId, coords }: { busId: string; coords: { lat: number; lng: number } }) => {
    try {
      const bus = await Bus.findById(busId);
      if (!bus) return;

      updateBusRealtimeFields(bus, coords);
      await bus.save();

      const updatePayload = {
        lat: coords.lat,
        lng: coords.lng,
        speed: bus.speed,
        nextStopName: bus.nextStopName,
        nextStopDistance: bus.nextStopDistance,
        nextStopEta: bus.nextStopEta,
        nextStopEtaMinutes: bus.nextStopEtaMinutes,
        delayStatus: bus.delayStatus,
        delayText: bus.delayText,
        delayColor: bus.delayColor,
        arrivedStops: bus.arrivedStops
      };

      // Emit to the specific bus room
      io.to(busId).emit("locationUpdate", updatePayload);

      // Emit to everyone globally
      io.emit("globalLocationUpdate", {
        busId,
        currentLocation: coords,
        ...updatePayload
      });

    } catch (err) {
      console.error("Location update error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ===== GLOBAL ERROR HANDLER =====
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;

server.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

// ===== GRACEFUL SHUTDOWN =====
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully.");

  server.close(() => {
    console.log("Process terminated");
  });
});

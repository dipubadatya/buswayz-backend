const Driver = require("../models/Driver");
const Admin = require("../models/Admin");
const Bus = require("../models/Bus");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ================= REGISTER =================
// Repurposed to create the College Admin account
exports.postRegister = async (req, res) => {
  try {
    const { username, password } = req.body;

    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(409).json({ success: false, message: "Username exists." });
    }

    const admin = new Admin({ username, password });
    await admin.save();

    return res.status(201).json({ success: true, message: "Admin registered successfully. Please login." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error during registration." });
  }
};

// ================= LOGIN (JWT) =================
exports.postLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    let user = await Admin.findOne({ username });
    let role = 'admin';

    if (!user) {
      user = await Driver.findOne({ username });
      role = 'driver';
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid username or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid username or password." });
    }

    const token = jwt.sign(
      { id: user._id, role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // true in production
      sameSite: "lax"
    });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: { id: user._id, username: user.username, role }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error during login." });
  }
};

// ================= LOGOUT (JWT) =================
exports.postLogout = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role === 'driver' || !decoded.role) {
        const bus = await Bus.findOne({ driver: decoded.id });
        if (bus) {
          bus.trackingStarted = false;
          await bus.save();
        }
      }
    }
  } catch (err) {
    console.error("Logout cleanup error:", err);
  }

  res.clearCookie("token");

  return res.status(200).json({
    success: true,
    message: "Logged out successfully."
  });
};

import { Request, Response } from "express";
import Driver from "../models/Driver";
import Admin from "../models/Admin";
import Bus from "../models/Bus";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

interface JwtPayloadWithUser {
  id: string;
  role?: string;
}

// ================= REGISTER =================

/**
 * Endpoint to create the College Admin account.
 */
export const postRegister = async (req: Request, res: Response) => {
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

// ================= LOGIN =================

/**
 * Handles credentials authentication for both Admin and Driver users.
 * Issues a HTTP-only cookie with the JWT token.
 */
export const postLogin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    let user: any = await Admin.findOne({ username });
    let role = "admin";

    if (!user) {
      user = await Driver.findOne({ username });
      role = "driver";
    }

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid username or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid username or password." });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET environment variable is not defined");
    }

    const token = jwt.sign(
      { id: user._id, role },
      jwtSecret,
      { expiresIn: "7d" }
    );

    // Find assigned bus if user is a driver
    let bus = null;
    if (role === "driver") {
      bus = await Bus.findOne({ driver: user._id });
    }

    const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
    res.cookie("token", token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: isSecure ? "none" : "lax"
    });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      user: {
        id: user._id,
        username: user.username,
        role,
        busId: bus?._id || null, 
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error during login." });
  }
};

// ================= LOGOUT =================

/**
 * Invalidates the authentication cookie.
 * Resets the active tracking state for Driver logouts.
 */
export const postLogout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token;
    if (token) {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error("JWT_SECRET environment variable is not defined");
      }

      const decoded = jwt.verify(token, jwtSecret) as JwtPayloadWithUser;
      if (decoded.role === "driver" || !decoded.role) {
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

  const isSecure = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.clearCookie("token", {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? "none" : "lax"
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully."
  });
};

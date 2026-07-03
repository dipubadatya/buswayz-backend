import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayloadWithUser {
  id: string;
  role?: string;
}

/**
 * Middleware to check if the user is authenticated via cookie JWT token.
 * Extends the request object with user/driver credentials upon validation.
 */
export const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login."
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET environment variable is not defined");
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayloadWithUser;
    req.user = {
      id: decoded.id,
      role: decoded.role || "driver"
    };

    if (req.user.role === "driver") {
      req.driverId = decoded.id;
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token."
    });
  }
};

/**
 * Middleware to check if the authenticated user has Admin privileges.
 */
export const isAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: "Forbidden. Admin access required."
    });
  }
};

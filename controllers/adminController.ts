import { Request, Response } from "express";
import Driver from "../models/Driver";
import Bus from "../models/Bus";
import Admin from "../models/Admin";

// ================= ADMIN CREDENTIALS =================

/**
 * Updates the admin credentials (username and/or password).
 */
export const updateCredentials = async (req: Request, res: Response) => {
  try {
    const { username, newPassword } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found." });
    }

    if (username) admin.username = username;
    if (newPassword) admin.password = newPassword;

    await admin.save();

    return res.status(200).json({ success: true, message: "Admin credentials updated successfully." });
  } catch (err: any) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Username already taken." });
    }
    return res.status(500).json({ success: false, message: "Error updating credentials." });
  }
};

// ================= DRIVERS =================

/**
 * Retrieves all drivers from the database, excluding their passwords.
 */
export const getDrivers = async (req: Request, res: Response) => {
  try {
    const drivers = await Driver.find().select("-password");
    return res.status(200).json({ success: true, drivers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Error fetching drivers." });
  }
};

/**
 * Creates a new driver with the provided username and password.
 */
export const createDriver = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password required." });
    }

    const existing = await Driver.findOne({ username });
    if (existing) {
      return res.status(409).json({ success: false, message: "Driver username already exists." });
    }

    const driver = new Driver({ username, password });
    await driver.save();

    return res.status(201).json({
      success: true,
      message: "Driver created successfully.",
      driver: { id: driver._id, username: driver.username }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Error creating driver." });
  }
};

/**
 * Deletes a driver by ID and removes their assigned bus.
 */
export const deleteDriver = async (req: Request, res: Response) => {
  try {
    const driverId = req.params.id;
    await Driver.findByIdAndDelete(driverId);

    // Remove the bus associated with this driver as well
    await Bus.findOneAndDelete({ driver: driverId });

    return res.status(200).json({ success: true, message: "Driver deleted successfully." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Error deleting driver." });
  }
};

// ================= BUSES =================

/**
 * Retrieves all buses populated with driver username details.
 */
export const getBuses = async (req: Request, res: Response) => {
  try {
    const buses = await Bus.find().populate("driver", "username");
    return res.status(200).json({ success: true, buses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Error fetching buses." });
  }
};

/**
 * Retrieves details for a specific bus by ID.
 */
export const getBusById = async (req: Request, res: Response) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ success: false, message: "Bus not found." });
    }
    return res.status(200).json({ success: true, bus });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Error fetching bus." });
  }
};

/**
 * Updates a specific bus details (bus number, route name, and stops).
 */
export const updateBus = async (req: Request, res: Response) => {
  try {
    const { busNumber, routeName, stops } = req.body;
    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      { busNumber, routeName, stops },
      { new: true, runValidators: true }
    );
    if (!bus) {
      return res.status(404).json({ success: false, message: "Bus not found." });
    }
    return res.status(200).json({ success: true, message: "Bus updated successfully.", bus });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Error updating bus." });
  }
};

/**
 * Creates or assigns a bus details to a driver.
 */
export const createBus = async (req: Request, res: Response) => {
  try {
    const { busNumber, routeName, driverId, stops } = req.body;

    if (!busNumber || !routeName || !driverId) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const processedStops = Array.isArray(stops) ? stops : [];

    const bus = await Bus.findOneAndUpdate(
      { driver: driverId },
      { busNumber, routeName, driver: driverId, stops: processedStops },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ success: true, message: "Bus assigned to driver successfully.", bus });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Error creating/assigning bus." });
  }
};

/**
 * Deletes a specific bus by ID.
 */
export const deleteBus = async (req: Request, res: Response) => {
  try {
    await Bus.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, message: "Bus deleted successfully." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Error deleting bus." });
  }
};

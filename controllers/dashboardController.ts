import { Request, Response } from "express";
import Bus from "../models/Bus";

// ================= GET DASHBOARD =================

/**
 * Retrieves the dashboard content based on the authenticated user's role.
 * Admins view global details; drivers view their specific assigned bus.
 */
export const getDashboard = async (req: Request, res: Response) => {
  try {
    if (req.user && req.user.role === "admin") {
      return res.status(200).json({
        success: true,
        user: req.user
      });
    }

    const bus = await Bus.findOne({ driver: req.driverId });

    return res.status(200).json({
      success: true,
      bus: bus || null,
      user: req.user
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching dashboard."
    });
  }
};

// ================= GET EDIT BUS =================

/**
 * Retrieves details for editing the current driver's assigned bus.
 */
export const getEditBus = async (req: Request, res: Response) => {
  try {
    const bus = await Bus.findOne({ driver: req.driverId });

    return res.status(200).json({
      success: true,
      bus: bus || null
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching bus details."
    });
  }
};

// ================= CREATE / UPDATE BUS =================

/**
 * Creates or updates bus configuration (stops, schedule, name) for the driver.
 */
export const postEditBus = async (req: Request, res: Response) => {
  try {
    const { busNumber, routeName, stops } = req.body;
    const driverId = req.driverId;

    if (!driverId) {
      return res.status(401).json({ success: false, message: "Unauthorized. Driver ID required." });
    }

    const processedStops = Array.isArray(stops) ? stops : [];

    const bus = await Bus.findOneAndUpdate(
      { driver: driverId },
      {
        busNumber,
        routeName,
        stops: processedStops,
        driver: driverId
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      success: true,
      message: "Bus details saved successfully.",
      bus
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error while saving bus details."
    });
  }
};

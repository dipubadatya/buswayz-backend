import { Request, Response } from "express";
import Bus from "../models/Bus";

// ================= DISTANCE CALCULATION =================

/**
 * Calculates haversine distance between two sets of lat/lng in kilometers.
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface NearestStopResult {
  stopName: string;
  busNumber: string;
  routeName: string;
  distance_km: string;
}

// ================= GET ALL BUSES =================

/**
 * Endpoint for loading active bus statuses on the homepage.
 */
export const getHomePage = async (req: Request, res: Response) => {
  try {
    const buses = await Bus.find().populate("driver", "username");

    return res.status(200).json({
      success: true,
      buses
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching buses."
    });
  }
};

// ================= GET SINGLE BUS =================

/**
 * Fetches real-time status and stops metrics for a single bus.
 */
export const getTrackingPage = async (req: Request, res: Response) => {
  try {
    const bus = await Bus.findById(req.params.busId);

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found."
      });
    }

    return res.status(200).json({
      success: true,
      bus
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching bus details."
    });
  }
};

// ================= FIND NEAREST STOP =================

/**
 * Evaluates user's location to find the nearest bus stop within 10 km.
 */
export const findNearestStop = async (req: Request, res: Response) => {
  const { latitude, longitude } = req.body;
  const MAX_RADIUS_KM = 10;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      success: false,
      message: "Latitude and longitude are required."
    });
  }

  const latNum = Number(latitude);
  const lngNum = Number(longitude);

  try {
    const allBuses = await Bus.find({}).select("busNumber routeName stops");

    if (!allBuses.length) {
      return res.status(404).json({
        success: false,
        message: "No bus routes found."
      });
    }

    let nearestStopInfo: NearestStopResult | null = null;
    let minDistance = Infinity;

    allBuses.forEach((bus) => {
      bus.stops.forEach((stop) => {
        if (stop.lat && stop.lng) {
          const distance = haversineDistance(
            latNum,
            lngNum,
            stop.lat,
            stop.lng
          );

          if (distance < minDistance) {
            minDistance = distance;
            nearestStopInfo = {
              stopName: stop.name,
              busNumber: bus.busNumber,
              routeName: bus.routeName,
              distance_km: distance.toFixed(2)
            };
          }
        }
      });
    });

    if (nearestStopInfo && minDistance <= MAX_RADIUS_KM) {
      return res.status(200).json({
        success: true,
        nearest_stop: nearestStopInfo
      });
    }

    return res.status(404).json({
      success: false,
      message: `No stoppage found within ${MAX_RADIUS_KM}km.`
    });

  } catch (err) {
    console.error("Nearest stop error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};

// ================= ALL BUS SCHEDULE =================

/**
 * Returns full schedules list for all registered buses.
 */
export const allBus = async (req: Request, res: Response) => {
  try {
    const busSchedule = await Bus.find({});

    return res.status(200).json({
      success: true,
      busSchedule
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching bus schedule."
    });
  }
};

import { IBus } from "../models/Bus";

/**
 * Calculates the distance between two GPS coordinates in meters using the Haversine formula.
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Parses a scheduled time string (e.g., "10:24 AM" or "10:24") and returns a Date object.
 */
export const parseScheduledTime = (timeStr: string): Date | null => {
  if (!timeStr) return null;
  try {
    const clean = timeStr.trim();
    let hours: number;
    let minutes: number;

    if (clean.includes(" ")) {
      const [time, period] = clean.split(" ");
      const timeParts = time.split(":");
      hours = Number(timeParts[0]);
      minutes = Number(timeParts[1]);

      if (period?.toUpperCase() === "PM" && hours !== 12) {
        hours += 12;
      }
      if (period?.toUpperCase() === "AM" && hours === 12) {
        hours = 0;
      }
    } else {
      const timeParts = clean.split(":");
      hours = Number(timeParts[0]);
      minutes = Number(timeParts[1]);
    }

    if (isNaN(hours) || isNaN(minutes)) {
      return null;
    }

    const scheduled = new Date();
    scheduled.setHours(hours, minutes, 0, 0);
    return scheduled;
  } catch {
    return null;
  }
};

/**
 * Updates a Bus document with new coordinates, calculates speed, updates completed stops,
 * next stop ETA/Distance, and delay status.
 */
export const updateBusRealtimeFields = (
  bus: IBus,
  coords: { lat: number; lng: number }
): void => {
  const now = Date.now();
  let calculatedSpeed = bus.speed || 0;

  const prevLoc = bus.currentLocation;
  const prevTime = bus.updatedAt;

  if (prevLoc && prevLoc.lat && prevLoc.lng && prevTime) {
    const distMeters = calculateDistance(
      prevLoc.lat,
      prevLoc.lng,
      coords.lat,
      coords.lng
    );
    const timeDiff = (now - new Date(prevTime).getTime()) / 1000;
    if (timeDiff > 0) {
      if (distMeters < 3) {
        calculatedSpeed = 0;
      } else {
        const rawSpeed = (distMeters / timeDiff) * 3.6; // km/h
        if (rawSpeed <= 120) {
          calculatedSpeed = (bus.speed || 0) * 0.6 + rawSpeed * 0.4;
        }
      }
    }
  }

  const arrivedStops = bus.arrivedStops || [];
  const stops = bus.stops || [];

  stops.forEach((stop, index) => {
    if (arrivedStops.includes(index)) return;
    const distMeters = calculateDistance(
      coords.lat,
      coords.lng,
      stop.lat,
      stop.lng
    );
    if (distMeters <= 50) {
      arrivedStops.push(index);
    }
  });

  bus.arrivedStops = arrivedStops;
  bus.speed = calculatedSpeed;
  bus.currentLocation = { lat: coords.lat, lng: coords.lng };

  const lastCompletedIndex =
    arrivedStops.length > 0 ? Math.max(...arrivedStops) : -1;
  const nextStopIndex =
    lastCompletedIndex + 1 < stops.length ? lastCompletedIndex + 1 : -1;

  if (nextStopIndex !== -1) {
    const nextStop = stops[nextStopIndex];
    bus.nextStopName = nextStop.name;

    const distMeters = calculateDistance(
      coords.lat,
      coords.lng,
      nextStop.lat,
      nextStop.lng
    );
    bus.nextStopDistance = distMeters;

    const speedKmH = Math.max(calculatedSpeed, 15);
    const etaMinutes = ((distMeters / 1000) / speedKmH) * 60;
    bus.nextStopEtaMinutes = Math.round(etaMinutes);

    const etaDate = new Date(now + etaMinutes * 60000);

    bus.nextStopEta = etaDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (nextStop.scheduledTime) {
      const scheduledDate = parseScheduledTime(nextStop.scheduledTime);
      if (scheduledDate) {
        const diffMins = Math.round(
          (etaDate.getTime() - scheduledDate.getTime()) / 60000
        );
        if (Math.abs(diffMins) <= 2) {
          bus.delayStatus = "ontime";
          bus.delayText = "On Time";
          bus.delayColor = "green";
        } else {
          const abs = Math.abs(diffMins);
          const days = Math.floor(abs / (24 * 60));
          const hours = Math.floor((abs % (24 * 60)) / 60);
          const mins = abs % 60;
          const timeParts: string[] = [];
          if (days > 0) timeParts.push(`${days}d`);
          if (hours > 0) timeParts.push(`${hours}h`);
          if (mins > 0 || timeParts.length === 0) timeParts.push(`${mins}m`);
          const text = timeParts.join(" ");

          bus.delayStatus = diffMins > 0 ? "late" : "early";
          bus.delayText = diffMins > 0 ? `${text} late` : `${text} early`;
          bus.delayColor = diffMins > 0 ? "red" : "blue";
        }
      }
    }
  } else {
    bus.nextStopName = "Journey Complete";
    bus.nextStopDistance = 0;
    bus.nextStopEtaMinutes = 0;
    bus.nextStopEta = "--:--";
    bus.delayStatus = "";
    bus.delayText = "";
    bus.delayColor = "";
  }
};

//trackingRoutes
const express = require("express");
const router = express.Router();
const trackingController = require("../controllers/trackingController");

// Get all buses (home list)
router.get("/buses", trackingController.getHomePage);

// Get single bus for tracking
router.get("/buses/:busId", trackingController.getTrackingPage);

// Find nearest stop
router.post("/nearest-stop", trackingController.findNearestStop);

// Get full bus schedule list
router.get("/schedule", trackingController.allBus);

module.exports = router;
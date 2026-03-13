//dashboardRoutes

const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { isAuthenticated } = require("../middleware/authMiddleware");

// GET driver dashboard data
router.get("/", isAuthenticated, dashboardController.getDashboard);

// GET bus details for editing
router.get("/bus", isAuthenticated, dashboardController.getEditBus);

// CREATE or UPDATE bus
router.post("/bus", isAuthenticated, dashboardController.postEditBus);

module.exports = router;
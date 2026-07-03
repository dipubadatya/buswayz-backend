import express from "express";
import * as adminController from "../controllers/adminController";
import { isAuthenticated, isAdmin } from "../middleware/authMiddleware";

const router = express.Router();

// PUT update admin credentials
router.put("/credentials", isAuthenticated, isAdmin, adminController.updateCredentials);

// GET all drivers
router.get("/drivers", isAuthenticated, isAdmin, adminController.getDrivers);

// POST create a new driver
router.post("/drivers", isAuthenticated, isAdmin, adminController.createDriver);

// DELETE a driver
router.delete("/drivers/:id", isAuthenticated, isAdmin, adminController.deleteDriver);

// GET all buses
router.get("/buses", isAuthenticated, isAdmin, adminController.getBuses);

// GET a specific bus
router.get("/buses/:id", isAuthenticated, isAdmin, adminController.getBusById);

// POST create or assign a bus
router.post("/buses", isAuthenticated, isAdmin, adminController.createBus);

// PUT update a specific bus
router.put("/buses/:id", isAuthenticated, isAdmin, adminController.updateBus);

// DELETE a bus
router.delete("/buses/:id", isAuthenticated, isAdmin, adminController.deleteBus);

export default router;

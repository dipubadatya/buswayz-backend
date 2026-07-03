import express from "express";
import * as dashboardController from "../controllers/dashboardController";
import { isAuthenticated } from "../middleware/authMiddleware";

const router = express.Router();

// GET driver dashboard data
router.get("/", isAuthenticated, dashboardController.getDashboard);

// GET bus details for editing
router.get("/bus", isAuthenticated, dashboardController.getEditBus);

// CREATE or UPDATE bus
router.post("/bus", isAuthenticated, dashboardController.postEditBus);

export default router;

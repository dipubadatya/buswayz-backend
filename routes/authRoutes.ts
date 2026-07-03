import express from "express";
import * as authController from "../controllers/authController";

const router = express.Router();

// Authentication API Routes
router.post("/register", authController.postRegister);
router.post("/login", authController.postLogin);
router.post("/logout", authController.postLogout);

export default router;

//authRoutes.js

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// API Routes Only (No view rendering)
router.post("/register", authController.postRegister);
router.post("/login", authController.postLogin);
router.post("/logout", authController.postLogout);

module.exports = router;
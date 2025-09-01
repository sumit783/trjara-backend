const express = require("express");
const {
  requestOtp,
  verifyOtp,
  logout,
} = require("../../controllers/auth/authController");
const authMiddleware = require("../../middlewares/authMiddleware");
const roleMiddleware = require("../../middlewares/roleMiddleware");
const validateRequest = require("../../middlewares/validateRequest");
const rateLimitMiddleware = require("../../middlewares/rateLimitMiddleware");
const loggerMiddleware = require("../../middlewares/loggerMiddleware");

const router = express.Router();

// Request OTP
router.post("/send-otp", rateLimitMiddleware, loggerMiddleware, validateRequest, requestOtp);

// Verify OTP and login
router.post("/verify-otp", rateLimitMiddleware, loggerMiddleware, validateRequest, verifyOtp);

// Logout user (invalidate session)
router.post("/logout", rateLimitMiddleware, loggerMiddleware, validateRequest, logout);

module.exports = router;

const express = require("express");
const {
  sendOtp,
  createAccount,
  verifyOtp,
  logout,
  createGuestUser,
} = require("../../controllers/auth/authController");
const validateRequest = require("../../middlewares/validateRequest");
const rateLimitMiddleware = require("../../middlewares/rateLimitMiddleware");
const otpRateLimiter = require("../../middlewares/otpRateLimiter");
const loggerMiddleware = require("../../middlewares/loggerMiddleware");

const router = express.Router();

// 1. Create Account (Signup)
router.post("/create-account", otpRateLimiter, loggerMiddleware, validateRequest, createAccount);

// 1b. Guest Signup (Anonymous)
router.post("/guest-signup", otpRateLimiter, loggerMiddleware, createGuestUser);

// 2. Send OTP (Login)
router.post("/send-otp", otpRateLimiter, loggerMiddleware, validateRequest, sendOtp);

// Verify OTP and login
router.post("/verify-otp", rateLimitMiddleware, loggerMiddleware, validateRequest, verifyOtp);

// Logout user (invalidate session)
router.post("/logout", rateLimitMiddleware, loggerMiddleware, validateRequest, logout);

module.exports = router;

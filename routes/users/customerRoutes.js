const express = require("express");
const upload = require("../../middlewares/upload");
const authMiddleware = require("../../middlewares/authMiddleware");
const otpRateLimiter = require("../../middlewares/otpRateLimiter");
const { getProfile, updateProfile, sendPhoneOTP, verifyPhoneOTP } = require("../../controllers/users/customerController");

const router = express.Router();

// All routes here are protected
router.use(authMiddleware);

router.get("/profile", getProfile);
router.put("/profile", upload.single("profileImage"), updateProfile);
router.post("/send-otp", otpRateLimiter, sendPhoneOTP);
router.post("/verify-otp", verifyPhoneOTP);

module.exports = router;

const express = require("express");
const router = express.Router();
const staffController = require("../../controllers/shops/staffController");

// Staff signup (no OTP)
router.post("/signup", staffController.signupStaff);

// Staff login via OTP
router.post("/login/request-otp", staffController.requestStaffLoginOtp);
router.post("/login/verify-otp", staffController.verifyStaffLoginOtp);

// Staff management
router.get("/", staffController.listStaff);
router.put("/:id", staffController.updateStaff);
router.delete("/:id", staffController.deleteStaff);

module.exports = router;


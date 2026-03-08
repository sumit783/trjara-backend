const express = require("express");
const router = express.Router();
const {signupStaff,listStaff,updateStaff,deleteStaff} = require("../../controllers/shops/staffController");
const {getRoles,createRole} = require("../../controllers/shops/roleController");
const authMiddleware = require("../../middlewares/authMiddleware");

// Role management
router.get("/roles", authMiddleware, getRoles);
router.post("/roles", authMiddleware, createRole);

// Staff signup (no OTP) - requires authentication to get shopId from token
router.post("/signup", authMiddleware, signupStaff);

// Staff management - requires authentication to get shopId from token
router.get("/", authMiddleware, listStaff);
router.put("/:id", authMiddleware, updateStaff);
router.delete("/:id", authMiddleware, deleteStaff);

module.exports = router;


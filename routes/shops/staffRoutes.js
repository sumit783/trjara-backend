const express = require("express");
const router = express.Router();
const staffController = require("../../controllers/shops/staffController");
const authMiddleware = require("../../middlewares/authMiddleware");

// Staff signup (no OTP) - requires authentication to get shopId from token
router.get("/roles",authMiddleware,staffController.getRoles);

router.post("/signup", authMiddleware, staffController.signupStaff);

// Staff management - requires authentication to get shopId from token
router.get("/", authMiddleware, staffController.listStaff);
router.put("/:id", authMiddleware, staffController.updateStaff);
router.delete("/:id", authMiddleware, staffController.deleteStaff);

module.exports = router;


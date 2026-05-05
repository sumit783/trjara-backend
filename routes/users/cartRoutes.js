const express = require("express");
const { addToCart, getCart } = require("../../controllers/users/cartController");
const authMiddleware = require("../../middlewares/authMiddleware");

const router = express.Router();

// Add products to cart
router.post("/add", authMiddleware, addToCart);

// Get cart details
router.get("/", authMiddleware, getCart);

module.exports = router;

const express = require("express");
const { addToCart, getCart, updateCartItemQuantity, removeFromCart } = require("../../controllers/users/cartController");
const authMiddleware = require("../../middlewares/authMiddleware");

const router = express.Router();

// Add products to cart
router.post("/add", authMiddleware, addToCart);

// Update quantity of cart item
router.put("/update-quantity", authMiddleware, updateCartItemQuantity);

// Remove item from cart completely
router.delete("/item/:cartItemId", authMiddleware, removeFromCart);

// Get cart details
router.get("/", authMiddleware, getCart);

module.exports = router;

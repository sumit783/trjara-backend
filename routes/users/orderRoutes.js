const express = require("express");
const { checkoutOrder, verifyPayment, getCustomerOrders, getOrderDetails, repayFailedOrder } = require("../../controllers/orders/orderController");
const authMiddleware = require("../../middlewares/authMiddleware");

const router = express.Router();

// Get all orders for the authenticated user
router.get("/", authMiddleware, getCustomerOrders);

// Get a single order details by ID
router.get("/:orderId", authMiddleware, getOrderDetails);

// Checkout cart and create pending order
router.post("/checkout", authMiddleware, checkoutOrder);

// Verify Razorpay payment signature
router.post("/verify", authMiddleware, verifyPayment);

// Initiate repayment for a failed or pending online payment order
router.post("/:orderId/repay", authMiddleware, repayFailedOrder);

module.exports = router;

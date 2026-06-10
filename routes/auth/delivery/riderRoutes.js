const express = require("express");
const router = express.Router();
const {
  createProfile,
  getProfile,
  uploadDocument,
  getDocuments,
  updateStatus,
  getVerificationStatus,
  getVehicleTypes,
  selectVehicle,
  reuploadDocument,
  getAvailableOrders,
  getStatus,
  acceptOrder,
  getCurrentOrder,
  verifyPickup,
  deliveryVerify,
  getOrderBill,
  completeOrder,
  getTodayStats,
  getRiderWallet
} = require("../../../controllers/delivery/riderController");
const authMiddleware = require("../../../middlewares/authMiddleware");
const upload = require("../../../middlewares/upload");

const {
  addBankAccount,
  getVendorBankAccount: getBankAccounts,
  setDefaultBankAccount
} = require("../../../controllers/shops/bankAccountController");

// All rider routes are protected and require authentication
router.use(authMiddleware);

// @route   POST /api/rider/profile
// @desc    Create rider profile
router.post("/profile", createProfile);

// @route   GET /api/rider/profile
// @desc    Get rider profile
router.get("/profile", getProfile);

// @route   GET /api/rider/verification-status
// @desc    Get rider verification status in sequence
router.get("/verification-status", getVerificationStatus);

// @route   POST /api/rider/documents
// @desc    Upload rider document
router.post("/documents", upload.single("document"), uploadDocument);

// @route   POST /api/rider/documents/reupload
// @desc    Reupload rider document
router.post("/documents/reupload", upload.single("document"), reuploadDocument);

// @route   GET /api/rider/documents
// @desc    Get rider documents
router.get("/documents", getDocuments);

// @route   GET /api/rider/status
// @desc    Get rider status
router.get("/status", getStatus);

// @route   PATCH /api/rider/status
// @desc    Update rider status
router.patch("/status", updateStatus);

// @route   GET /api/rider/vehicle-types
// @desc    Get active vehicle types list
router.get("/vehicle-types", getVehicleTypes);

// @route   PUT /api/rider/select-vehicle
// @desc    Select vehicle type
router.put("/select-vehicle", selectVehicle);

// @route   GET /api/rider/orders/available
// @desc    Get all available orders according to rider status and weight limit
router.get("/orders/available", getAvailableOrders);

// @route   PUT /api/rider/orders/:orderId/accept
// @desc    Accept order
router.put("/orders/:orderId/accept", acceptOrder);

// @route   GET /api/rider/orders/current
// @desc    Get active order details
router.get("/orders/current", getCurrentOrder);

// @route   POST /api/rider/orders/:orderId/pickup-verify
// @desc    Verify item pickup at store
router.post("/orders/:orderId/pickup-verify", verifyPickup);

// @route   POST /api/rider/orders/:orderId/delivery-verify
// @desc    Verify product delivery to client
router.post("/orders/:orderId/delivery-verify", deliveryVerify);

// @route   GET /api/rider/orders/:orderId/bill
// @desc    Get order bill/invoice details for the rider
router.get("/orders/:orderId/bill", getOrderBill);

// @route   PUT /api/rider/orders/:orderId/complete
// @desc    Mark order delivery as complete
router.put("/orders/:orderId/complete", completeOrder);

// @route   GET /api/rider/stats/today
// @desc    Get today's earnings, orders done, avg per order price, and live orders count
router.get("/stats/today", getTodayStats);

// @route   GET /api/rider/wallet
// @desc    Get rider wallet details and recent transactions
router.get("/wallet", getRiderWallet);

// @route   GET /api/rider/bank-accounts
// @desc    Get rider bank accounts
router.get("/bank-accounts", getBankAccounts);

// @route   POST /api/rider/bank-accounts
// @desc    Add new rider bank account
router.post("/bank-accounts", addBankAccount);

// @route   PUT /api/rider/bank-accounts/:accountId/default
// @desc    Set a bank account as default (primary)
router.put("/bank-accounts/:accountId/default", setDefaultBankAccount);

module.exports = router;


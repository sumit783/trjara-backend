const express = require("express");
const router = express.Router();
const { createProfile, getProfile, uploadDocument, getDocuments, reuploadDocument, getAvailableOrders, getTodayStats, getRiderWallet } = require("../../controllers/delivery/riderController");
const authMiddleware = require("../../middlewares/authMiddleware");
const upload = require("../../middlewares/upload");

const {
  addBankAccount,
  getVendorBankAccount: getBankAccounts,
  setDefaultBankAccount
} = require("../../controllers/shops/bankAccountController");

// All rider routes are protected and require authentication
router.use(authMiddleware);

// @route   POST /api/rider/profile
// @desc    Create rider profile
router.post("/profile", createProfile);

// @route   GET /api/rider/profile
// @desc    Get rider profile
router.get("/profile", getProfile);

// @route   POST /api/rider/documents
// @desc    Upload rider document
router.post("/documents", upload.single("document"), uploadDocument);

// @route   POST /api/rider/documents/reupload
// @desc    Reupload rider document
router.post("/documents/reupload", upload.single("document"), reuploadDocument);

// @route   GET /api/rider/documents
// @desc    Get rider documents
router.get("/documents", getDocuments);

// @route   GET /api/rider/orders/available
// @desc    Get all available orders according to rider status and weight limit
router.get("/orders/available", getAvailableOrders);

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

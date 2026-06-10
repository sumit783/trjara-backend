const express = require("express");
const authMiddleware = require("../../middlewares/authMiddleware");
const { 
    getOwnerProfile, 
    getRootCategories,
    getUserDetails,
    getStoreDetails,
    getUploadedDocuments,
    getVerificationData,
    checkVerificationStatus,
    getOwnerOrders,
    updateOrderItemStatus,
    getOwnerOrderDetails,
    addBankAccount,
    getBankAccounts,
    setPrimaryBankAccount,
    deleteBankAccount,
    createWithdrawalRequest,
    getOwnerWithdrawalRequests
} = require("../../controllers/shops/ownerController");
const { 
    getInventoryByQRCode, 
    processOfflineSale,
    getQRCodeByInventoryId
} = require("../../controllers/shops/offlineSaleController");

const router = express.Router();

// All routes here are protected and intended for owners

router.get("/profile", authMiddleware, getOwnerProfile);
router.get("/categories/root", getRootCategories);

// Verification Routes
router.get("/user-details", authMiddleware, getUserDetails);
router.get("/store-details", authMiddleware, getStoreDetails);
router.get("/uploaded-documents", authMiddleware, getUploadedDocuments);
router.get("/verification-data", authMiddleware, getVerificationData);
router.get("/status-check", authMiddleware, checkVerificationStatus);

// Orders Route
router.get("/orders", authMiddleware, getOwnerOrders);
router.get("/orders/:orderId", authMiddleware, getOwnerOrderDetails);
router.put("/orders/:orderId/items/:itemId/status", authMiddleware, updateOrderItemStatus);

// Offline Sale Routes
router.get("/inventory/qr/:code", authMiddleware, getInventoryByQRCode);
router.get("/inventory/:inventoryId/qr", authMiddleware, getQRCodeByInventoryId);
router.post("/sell-offline", authMiddleware, processOfflineSale);

// Bank Accounts Routes
router.post("/bank-accounts", authMiddleware, addBankAccount);
router.get("/bank-accounts", authMiddleware, getBankAccounts);
router.get("/bank-details", authMiddleware, getBankAccounts);
router.put("/bank-accounts/:id/primary", authMiddleware, setPrimaryBankAccount);
router.delete("/bank-accounts/:id", authMiddleware, deleteBankAccount);

// Withdrawals Routes
router.post("/withdrawals", authMiddleware, createWithdrawalRequest);
router.get("/withdrawals", authMiddleware, getOwnerWithdrawalRequests);

module.exports = router;

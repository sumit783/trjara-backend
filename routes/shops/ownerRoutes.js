const express = require("express");
const authMiddleware = require("../../middlewares/authMiddleware");
const { 
    getOwnerProfile, 
    getRootCategories,
    getUserDetails,
    getStoreDetails,
    getUploadedDocuments,
    getVerificationData,
    checkVerificationStatus
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

// Offline Sale Routes
router.get("/inventory/qr/:code", authMiddleware, getInventoryByQRCode);
router.get("/inventory/:inventoryId/qr", authMiddleware, getQRCodeByInventoryId);
router.post("/sell-offline", authMiddleware, processOfflineSale);

module.exports = router;

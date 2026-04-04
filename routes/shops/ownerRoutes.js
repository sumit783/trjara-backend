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

module.exports = router;

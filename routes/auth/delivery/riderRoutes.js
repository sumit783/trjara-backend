const express = require("express");
const router = express.Router();
const { createProfile, getProfile, uploadDocument, getDocuments, updateStatus, getVerificationStatus } = require("../../../controllers/delivery/riderController");
const authMiddleware = require("../../../middlewares/authMiddleware");
const upload = require("../../../middlewares/upload");

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

// @route   GET /api/rider/documents
// @desc    Get rider documents
router.get("/documents", getDocuments);

// @route   PATCH /api/rider/status
// @desc    Update rider status
router.patch("/status", updateStatus);

module.exports = router;


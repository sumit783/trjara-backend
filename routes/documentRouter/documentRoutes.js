const express = require("express");
const upload = require("../../middlewares/upload");
const { uploadDocument, showVendorDocuments, reUploadRejectedDocument, bulkVerifyDocuments } = require("../../controllers/content/documentController");
const authMiddleware = require("../../middlewares/authMiddleware");
const rateLimitMiddleware = require("../../middlewares/rateLimitMiddleware");
const loggerMiddleware = require("../../middlewares/loggerMiddleware");
const validateRequest = require("../../middlewares/validateRequest");

const router = express.Router();

// For multiple files
router.post("/upload", authMiddleware,rateLimitMiddleware, loggerMiddleware, validateRequest, upload.single("document"), uploadDocument);
router.get("/vendor/:ownerId", authMiddleware,rateLimitMiddleware, loggerMiddleware, validateRequest, showVendorDocuments);
router.put("/reupload/:docId", authMiddleware,rateLimitMiddleware, loggerMiddleware, validateRequest, upload.single("document"), reUploadRejectedDocument);
router.patch("/verify", authMiddleware,rateLimitMiddleware, loggerMiddleware, validateRequest, bulkVerifyDocuments);

module.exports = router;
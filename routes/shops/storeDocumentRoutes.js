const express = require("express");
const upload = require("../../middlewares/upload");
const {
    uploadDocument,
    showVendorDocuments,
    reUploadRejectedDocument,
    bulkVerifyDocuments
} = require("../../controllers/shops/storeDocumentController");
const rateLimitMiddleware = require("../../middlewares/rateLimitMiddleware");
const loggerMiddleware = require("../../middlewares/loggerMiddleware");
const validateRequest = require("../../middlewares/validateRequest");
const { adminAuthMiddleware } = require("../../middlewares/adminAuthMiddleware");
const router = express.Router();

// The authMiddleware is already applied at the parent router (/api/shops)
// So we don't need to apply it again here unless we want it double checked.

router.post(
    "/upload",
    rateLimitMiddleware,
    loggerMiddleware,
    validateRequest,
    upload.single("document"),
    uploadDocument
);

router.get(
    "/store/:storeId",
    rateLimitMiddleware,
    loggerMiddleware,
    validateRequest,
    showVendorDocuments
);

router.put(
    "/reupload/:docId",
    rateLimitMiddleware,
    loggerMiddleware,
    validateRequest,
    upload.single("document"),
    reUploadRejectedDocument
);

router.patch(
    "/verify",
    rateLimitMiddleware,
    adminAuthMiddleware,
    loggerMiddleware,
    validateRequest,
    bulkVerifyDocuments
);

module.exports = router;

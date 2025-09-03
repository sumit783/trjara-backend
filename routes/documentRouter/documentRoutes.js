const express = require("express");
const upload = require("../../middlewares/upload");
const { uploadDocument, showVendorDocuments, reUploadRejectedDocument } = require("../../controllers/content/documentController");

const router = express.Router();

// For multiple files
router.post("/upload", upload.single("document"), uploadDocument);
router.get("/vendor/:ownerId", showVendorDocuments);
router.put("/reupload/:docId", upload.single("document"), reUploadRejectedDocument);

module.exports = router;
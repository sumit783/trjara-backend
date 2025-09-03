const Document = require("../../models/content/Document");

// Upload single document
exports.uploadDocument = async (req, res) => {
  try {
    const { ownerType, ownerId, docType, docNumber } = req.body;

    // Validate required fields
    if (!ownerType || !ownerId || !docType || !docNumber) {
      return res.status(400).json({
        success: false,
        message: "ownerType, ownerId, docType, and docNumber are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "A document file is required",
      });
    }

    // Save single document
    const document = new Document({
      ownerType,
      ownerId,
      docType,
      docNumber,
      fileUrl: `/uploads/${req.file.filename}`, // local path (or Cloudinary/S3 URL)
    });

    const savedDoc = await document.save();

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: savedDoc,
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};



// Get all documents for a vendor
exports.showVendorDocuments = async (req, res) => {
  try {
    const { ownerId } = req.params;

    if (!ownerId) {
      return res.status(400).json({
        success: false,
        message: "ownerId is required",
      });
    }

    const documents = await Document.find({ ownerId });

    if (!documents || documents.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No documents found for this vendor",
      });
    }

    res.status(200).json({
      success: true,
      message: "Vendor documents fetched successfully",
      data: documents,
    });
  } catch (error) {
    console.error("Error fetching vendor documents:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};



// Re-upload rejected document
exports.reUploadRejectedDocument = async (req, res) => {
  try {
    const { docId } = req.params; // document id
    const { docNumber } = req.body;

    if (!docId) {
      return res.status(400).json({
        success: false,
        message: "Document ID is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "A new document file is required",
      });
    }

    // Check if document exists and is rejected
    const document = await Document.findById(docId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    if (document.status !== "rejected") {
      return res.status(400).json({
        success: false,
        message: "Only rejected documents can be re-uploaded",
      });
    }

    // Update with new file + number
    document.docNumber = docNumber || document.docNumber;
    document.fileUrl = `/uploads/${req.file.filename}`;
    document.status = "pending"; // reset status for re-verification
    document.rejectionReason = null;

    const updatedDoc = await document.save();

    res.status(200).json({
      success: true,
      message: "Document re-uploaded successfully",
      data: updatedDoc,
    });
  } catch (error) {
    console.error("Error re-uploading document:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
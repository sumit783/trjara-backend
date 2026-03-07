const StoreDocument = require("../../models/shops/storeDocument");
const Store = require("../../models/shops/Store");
const AnalyticsEvent = require("../../models/logs/AnalyticsEvent");

// Upload a new document
exports.uploadDocument = async (req, res) => {
    try {
        const { storeId, documentType } = req.body;

        if (!storeId || !documentType) {
            return res.status(400).json({ success: false, message: "storeId and documentType are required" });
        }

        // Validate store exists
        const store = await Store.findById(storeId);
        if (!store) {
            return res.status(404).json({ success: false, message: "Store not found" });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Document file is required" });
        }

        const documentUrl = `/uploads/${req.file.filename}`;

        // Check if document of this type already exists for the store
        let storeDoc = await StoreDocument.findOne({ store: storeId, documentType });

        if (storeDoc) {
            // Update existing
            storeDoc.documentUrl = documentUrl;
            storeDoc.verificationStatus = "pending"; // Reset status on re-upload
            await storeDoc.save();
        } else {
            // Create new
            storeDoc = new StoreDocument({
                store: storeId,
                documentType,
                documentUrl,
                verificationStatus: "pending"
            });
            await storeDoc.save();
        }

        await AnalyticsEvent.create({
            event: "document_uploaded",
            properties: { storeId, documentType, isReupload: !!storeDoc.isNew },
            source: req.headers["x-source"] || "web"
        });

        res.status(201).json({
            success: true,
            message: "Document uploaded successfully",
            data: storeDoc
        });

    } catch (error) {
        console.error("Error uploading document:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// Re-upload a rejected document
exports.reUploadRejectedDocument = async (req, res) => {
    try {
        const { docId } = req.params;

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Document file is required" });
        }

        const storeDoc = await StoreDocument.findById(docId);
        if (!storeDoc) {
            return res.status(404).json({ success: false, message: "Document not found" });
        }

        storeDoc.documentUrl = `/uploads/${req.file.filename}`;
        if(storeDoc.verificationStatus === "rejected"){
            storeDoc.verificationStatus = "reuploaded";
        }else{
            storeDoc.verificationStatus = "pending";
        }
        
        await storeDoc.save();

        await AnalyticsEvent.create({
            event: "document_reuploaded",
            properties: { 
                storeId: storeDoc.store, 
                documentType: storeDoc.documentType, 
                docId
            },
            source: req.headers["x-source"] || "web"
        });

        res.status(200).json({
            success: true,
            message: "Document re-uploaded successfully",
            data: storeDoc
        });

    } catch (error) {
        console.error("Error re-uploading document:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// Show documents for a specific store
exports.showVendorDocuments = async (req, res) => {
    try {
        const { storeId } = req.params; // Using storeId instead of ownerId for better alignment

        const documents = await StoreDocument.find({ store: storeId });

        res.status(200).json({
            success: true,
            data: documents
        });

    } catch (error) {
        console.error("Error fetching documents:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// Bulk verify documents (Admin)
exports.bulkVerifyDocuments = async (req, res) => {
    try {
        // Expected body format: { verifications: [{ docId: "...", status: "verified" }, ...] }
        const { verifications } = req.body;

        if (!verifications || !Array.isArray(verifications)) {
            return res.status(400).json({ success: false, message: "verifications array is required" });
        }

        const updatedDocs = [];

        for (const v of verifications) {
            const { docId, status } = v;
            if (["verified", "rejected"].includes(status)) {
                const doc = await StoreDocument.findByIdAndUpdate(
                    docId, 
                    { verificationStatus: status },
                    { new: true }
                );
                if (doc) {
                    updatedDocs.push(doc);
                    await AnalyticsEvent.create({
                        event: "document_verified",
                        properties: { 
                            storeId: doc.store, 
                            documentType: doc.documentType, 
                            docId, 
                            status 
                        },
                        source: "admin"
                    });
                }
            }
        }

        res.status(200).json({
            success: true,
            message: "Documents verified successfully",
            data: updatedDocs
        });

    } catch (error) {
        console.error("Error verifying documents:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

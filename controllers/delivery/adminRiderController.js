const Rider = require("../../models/rider/Rider");
const RiderDocument = require("../../models/rider/RiderDocument");
const User = require("../../models/users/User");

// @desc    Get all riders
// @route   GET /api/admin/riders
// @access  Private (Admin only)
exports.getAllRiders = async (req, res) => {
    try {
        const riders = await Rider.find().populate("user", "name email phone profileImageUrl");
        res.json({
            success: true,
            data: riders
        });
    } catch (err) {
        console.error("Error in getAllRiders:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// @desc    Get rider documents
// @route   GET /api/admin/riders/:riderId/documents
// @access  Private (Admin only)
exports.getRiderDocuments = async (req, res) => {
    try {
        const documents = await RiderDocument.find({ rider: req.params.riderId });
        res.json({
            success: true,
            data: documents
        });
    } catch (err) {
        console.error("Error in getRiderDocuments:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// @desc    Verify rider document
// @route   PUT /api/admin/documents/:docId/verify
// @access  Private (Admin only)
exports.verifyDocument = async (req, res) => {
    try {
        const { status, remark } = req.body; // approved, rejected

        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({ error: "Invalid status. Use 'approved' or 'rejected'." });
        }

        const document = await RiderDocument.findById(req.params.docId);
        if (!document) {
            return res.status(404).json({ error: "Document not found" });
        }

        document.verificationStatus = status;
        if (status === "rejected") {
            document.remark = remark;
        }
        document.verifiedAt = new Date();
        await document.save();

        // Check if all mandatory documents are verified for the rider
        const riderId = document.rider;
        const mandatoryDocs = ["aadhar", "pan", "driving_license", "police_verification"];

        const allDocs = await RiderDocument.find({ rider: riderId });
        const verifiedDocTypes = allDocs
            .filter(doc => doc.verificationStatus === "approved")
            .map(doc => doc.documentType);

        const isFullyVerified = mandatoryDocs.every(type => verifiedDocTypes.includes(type));

        if (isFullyVerified) {
            const rider = await Rider.findByIdAndUpdate(riderId, {
                verificationStatus: "verified",
                isVerified: true
            }, { new: true });

            if (rider) {
                await User.findByIdAndUpdate(rider.user, { isAdminVerified: "verified" });
            }
        } else if (status === "rejected") {
            await Rider.findByIdAndUpdate(riderId, {
                verificationStatus: "rejected",
                isVerified: false
            });
        }

        res.json({
            success: true,
            message: `Document ${status} successfully`,
            data: document
        });
    } catch (err) {
        console.error("Error in verifyDocument:", err);
        res.status(500).json({ error: "Server error" });
    }
};

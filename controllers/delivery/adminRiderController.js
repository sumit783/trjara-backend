const Rider = require("../../models/rider/Rider");
const RiderDocument = require("../../models/rider/RiderDocument");
const RiderVehicle = require("../../models/rider/RiderVehicle");
const User = require("../../models/users/User");

// @desc    Get all riders
// @route   GET /api/admin/riders
// @access  Private (Admin only)
exports.getAllRiders = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 10 } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;
        const skip = (pageNum - 1) * limitNum;

        // Build query for Rider
        const query = {};

        // Filter based on rider status (verificationStatus)
        if (status && status !== "all") {
            query.verificationStatus = status;
        }

        // Search based on user fields
        if (search) {
            // Find users matching search term (name, email, phone, customId)
            const matchingUsers = await User.find({
                $or: [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { phone: { $regex: search, $options: "i" } },
                    { customId: { $regex: search, $options: "i" } }
                ]
            }).select("_id");
            
            const userIds = matchingUsers.map(u => u._id);
            query.user = { $in: userIds };
        }

        // Get total count for pagination
        const totalRiders = await Rider.countDocuments(query);
        const totalPages = Math.ceil(totalRiders / limitNum);

        // Get riders with pagination
        const riders = await Rider.find(query)
            .populate("user", "name email phone profileImageUrl customId isAdminVerified adminNote")
            .populate("vehicleType", "name icon type")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        res.json({
            success: true,
            pagination: {
                totalRiders,
                totalPages,
                currentPage: pageNum,
                limit: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            },
            data: riders
        });
    } catch (err) {
        console.error("Error in getAllRiders:", err);
        res.status(500).json({ error: "Server error", details: err.message });
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
        const mandatoryDocs = ["profile_photo", "aadhar_front", "aadhar_back", "pan", "driving_license"];

        const allDocs = await RiderDocument.find({ rider: riderId });
        const verifiedDocTypes = allDocs
            .filter(doc => doc.verificationStatus === "approved")
            .map(doc => doc.documentType);

        const allDocsApproved = mandatoryDocs.every(type => verifiedDocTypes.includes(type));

        const rider = await Rider.findById(riderId);
        if (rider) {
            const user = await User.findById(rider.user);

            if (allDocsApproved) {
                rider.verificationStatus = "verified";
                rider.isVerified = true;
                await rider.save();

                if (user) {
                    user.isAdminVerified = "verified";
                    user.isActive = true;
                    await user.save();
                }
            } else if (status === "rejected") {
                rider.verificationStatus = "rejected";
                rider.isVerified = false;
                await rider.save();
            }
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

// @desc    Verify rider user (verifies user and sets role to rider)
// @route   PUT /api/admin/riders/:riderId/verify-user
// @access  Private (Admin only)
exports.verifyRiderUser = async (req, res) => {
    try {
        const { riderId } = req.params;
        const { status, reason } = req.body; // verified, rejected

        const validStatuses = ["pending", "verified", "rejected"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid status. Use 'pending', 'verified', or 'rejected'." });
        }

        const rider = await Rider.findById(riderId);
        if (!rider) {
            return res.status(404).json({ error: "Rider not found" });
        }

        const user = await User.findById(rider.user);
        if (!user) {
            return res.status(404).json({ error: "User not found for this rider" });
        }

        user.isAdminVerified = status;
        if (status === "verified") {
            user.isActive = true;
            user.role = "rider";
        } else if (status === "rejected") {
            user.isActive = false;
            user.adminNote = reason;
        }

        await user.save();

        // Check if all mandatory documents are verified to also verify the rider
        const mandatoryDocs = ["profile_photo", "aadhar_front", "aadhar_back", "pan", "driving_license"];
        const allDocs = await RiderDocument.find({ rider: riderId });
        const verifiedDocTypes = allDocs
            .filter(doc => doc.verificationStatus === "approved")
            .map(doc => doc.documentType);

        const allDocsApproved = mandatoryDocs.every(type => verifiedDocTypes.includes(type));

        if (status === "verified" && allDocsApproved) {
            rider.verificationStatus = "verified";
            rider.isVerified = true;
            await rider.save();
        } else if (status === "rejected") {
            rider.verificationStatus = "rejected";
            rider.isVerified = false;
            await rider.save();
        }

        // Fetch and return the fully populated rider object
        const populatedRider = await Rider.findById(riderId)
            .populate("user", "name email phone profileImageUrl customId isAdminVerified adminNote")
            .populate("vehicleType", "name icon type");

        res.json({
            success: true,
            message: `User verification status updated to ${status}`,
            data: populatedRider
        });
    } catch (err) {
        console.error("Error in verifyRiderUser:", err);
        res.status(500).json({ error: "Server error", details: err.message });
    }
};

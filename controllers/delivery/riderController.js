const Rider = require("../../models/rider/Rider");
const User = require("../../models/users/User");
const RiderDocument = require("../../models/rider/RiderDocument");
const VehicleType = require("../../models/rider/VehicleType");

// @desc    Create rider profile
// @route   POST /api/rider/profile
// @access  Private (Rider only)
exports.createProfile = async (req, res) => {
    try {
        const { vehicleType } = req.body;
        const vehicleTypeById = await VehicleType.findOne({ _id: vehicleType });
        if (!vehicleTypeById) {
            return res.status(400).json({ error: "Vehicle type not found" });
        }
        // Check if user is allowed to create a rider profile
        // If they are a customer, we will upgrade them to a rider
        let user = await User.findById(req.user.id);
        if (!user) {
            return res.status(400).json({ error: "User not found" });
        }

        if (user.role === "customer") {
            user.role = "rider";
            await user.save();
        }
        // else if (user.role !== "rider") {
        //     return res.status(403).json({ error: "Access denied. Only riders or customers can create profiles." });
        // }

        // Check if rider profile already exists
        let rider = await Rider.findOne({ user: req.user.id });

        if (rider) {
            return res.status(400).json({ error: "Rider profile already exists" });
        }

        // Create new rider profile
        rider = new Rider({
            user: req.user.id,
            vehicleType: vehicleTypeById._id,
        });

        await rider.save();

        res.status(201).json({
            success: true,
            message: "Rider profile created successfully",
            data: rider
        });
    } catch (err) {
        console.error("Error in createProfile:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// @desc    Get rider profile
// @route   GET /api/rider/profile
// @access  Private (Rider only)
exports.getProfile = async (req, res) => {
    try {
        const rider = await Rider.findOne({ user: req.user.id })
            .populate("user", "name email phone profileImageUrl")
            .populate("vehicleType");

        if (!rider) {
            return res.status(404).json({ error: "Rider profile not found" });
        }

        res.json({
            success: true,
            data: rider
        });
    } catch (err) {
        console.error("Error in getProfile:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// @desc    Upload rider document
// @route   POST /api/rider/documents
// @access  Private (Rider only)
exports.uploadDocument = async (req, res) => {
    try {
        const { documentType } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: "Document file is required" });
        }

        if (!documentType) {
            return res.status(400).json({ error: "Document type is required" });
        }

        const rider = await Rider.findOne({ user: req.user.id });
        if (!rider) {
            return res.status(404).json({ error: "Rider profile not found. Please create a profile first." });
        }

        // Check if document of this type already exists for this rider
        let riderDoc = await RiderDocument.findOne({ rider: rider._id, documentType });

        if (riderDoc && riderDoc.verificationStatus === "rejected") {
            // Update existing document
            riderDoc.documentImage = req.file.path;
            riderDoc.verificationStatus = "reuploaded";
            await riderDoc.save();
        }
        else if (riderDoc && riderDoc.verificationStatus !== "rejected") {
            riderDoc.documentImage = req.file.path;
            riderDoc.verificationStatus = "pending";
            await riderDoc.save();
        }
        else {
            // Create new document record
            riderDoc = new RiderDocument({
                rider: rider._id,
                documentType,
                documentImage: req.file.path,
            });
            await riderDoc.save();
        }

        // Update rider's verification status to pending if it was rejected or reuploaded
        if (rider.verificationStatus !== "verified") {
            rider.verificationStatus = "pending";
            await rider.save();
        }

        res.status(req.file ? 201 : 200).json({
            success: true,
            message: "Document uploaded successfully",
            data: riderDoc
        });
    } catch (err) {
        console.error("Error in uploadDocument:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// @desc    Get rider documents
// @route   GET /api/rider/documents
// @access  Private (Rider only)
exports.getDocuments = async (req, res) => {
    try {
        const rider = await Rider.findOne({ user: req.user.id });
        if (!rider) {
            return res.status(404).json({ error: "Rider profile not found" });
        }

        const documents = await RiderDocument.find({ rider: rider._id });

        res.json({
            success: true,
            data: documents
        });
    } catch (err) {
        console.error("Error in getDocuments:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// @desc    Update rider status (online/available)
// @route   PATCH /api/rider/status
// @access  Private (Rider only)
exports.updateStatus = async (req, res) => {
    try {
        const { isOnline, isAvailable } = req.body;

        const rider = await Rider.findOne({ user: req.user.id });
        if (!rider) {
            return res.status(404).json({ error: "Rider profile not found" });
        }

        // Check if rider is verified
        if (!rider.isVerified) {
            return res.status(403).json({ error: "Access denied. Your account is not verified yet." });
        }

        if (isOnline !== undefined) {
            rider.isOnline = isOnline;
            // If rider goes offline, disconnect their socket
            if (isOnline === false) {
                const io = req.app.get("io");
                if (io) {
                    io.in(`rider-${rider._id}`).disconnectSockets(true);
                }
            }
        }
        if (isAvailable !== undefined) rider.isAvailable = isAvailable;

        await rider.save();

        res.json({
            success: true,
            message: "Status updated successfully",
            data: {
                isOnline: rider.isOnline,
                isAvailable: rider.isAvailable
            }
        });
    } catch (err) {
        console.error("Error in updateStatus:", err);
        res.status(500).json({ error: "Server error" });
    }
};

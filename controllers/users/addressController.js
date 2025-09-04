const Address = require("../../models/users/Address");

// Create Address
exports.createAddress = async (req, res) => {
    try {
        const {
            ownerType,
            ownerId,
            label,
            line1,
            line2,
            city,
            state,
            pincode,
            country,
            lat,
            lng,
            isDefault,
        } = req.body;

        if (!ownerType || !ownerId || !line1 || !city || !state || !pincode) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // If isDefault is true, unset others for this owner
        if (isDefault) {
            await Address.updateMany(
                { ownerType, ownerId },
                { $set: { isDefault: false } }
            );
        }

        const address = new Address({
            ownerType,
            ownerId,
            label,
            line1,
            line2,
            city,
            state,
            pincode,
            country,
            lat,
            lng,
            isDefault: !!isDefault,
        });

        const savedAddress = await address.save();

        res.status(201).json({
            success: true,
            message: "Address created successfully",
            data: savedAddress,
        });
    } catch (error) {
        console.error("Error creating address:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// Update Address
exports.updateAddress = async (req, res) => {
    try {
        const { addressId } = req.params;
        const updates = req.body;

        if (updates.isDefault) {
            const existing = await Address.findById(addressId);
            await Address.updateMany(
                { ownerType: existing.ownerType, ownerId: existing.ownerId },
                { $set: { isDefault: false } }
            );
        }

        const updatedAddress = await Address.findByIdAndUpdate(addressId, updates, { new: true });

        if (!updatedAddress) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        res.json({
            success: true,
            message: "Address updated successfully",
            data: updatedAddress,
        });
    } catch (error) {
        console.error("Error updating address:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// Delete Address
exports.deleteAddress = async (req, res) => {
    try {
        const { addressId } = req.params;

        const deleted = await Address.findByIdAndDelete(addressId);

        if (!deleted) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        res.json({
            success: true,
            message: "Address deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting address:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

// Get All Addresses for Owner
exports.getAddresses = async (req, res) => {
    try {
        const { ownerType, ownerId } = req.query;

        if (!ownerType || !ownerId) {
            return res.status(400).json({ success: false, message: "ownerType and ownerId are required" });
        }

        const addresses = await Address.find({ ownerType, ownerId });

        res.json({
            success: true,
            message: "Addresses fetched successfully",
            data: addresses,
        });
    } catch (error) {
        console.error("Error fetching addresses:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

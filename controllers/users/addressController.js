const Address = require("../../models/users/Address");

// Create Address
exports.createAddress = async (req, res) => {
    try {
        const {
            label,
            addressLine1,
            addressLine2,
            landmark,
            city,
            state,
            pincode,
            coordinates, // Expected as [lng, lat]
            isDefault,
        } = req.body;

        const userId = req.user.id;

        if (!addressLine1 || !city || !state || !pincode || !coordinates) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const address = new Address({
            userId,
            label,
            addressLine1,
            addressLine2,
            landmark,
            city,
            state,
            pincode,
            location: {
                type: "Point",
                coordinates: coordinates,
            },
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
        const userId = req.user.id;
        const updates = req.body;

        // If location is updated, format it correctly
        if (updates.coordinates) {
            updates.location = {
                type: "Point",
                coordinates: updates.coordinates,
            };
            delete updates.coordinates;
        }

        // Find the address first
        const address = await Address.findOne({ _id: addressId, userId: userId });

        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found or unauthorized" });
        }

        // Apply updates
        Object.keys(updates).forEach((key) => {
            address[key] = updates[key];
        });

        const updatedAddress = await address.save();

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
        const userId = req.user.id;

        const deleted = await Address.findOneAndDelete({ _id: addressId, userId: userId });

        if (!deleted) {
            return res.status(404).json({ success: false, message: "Address not found or unauthorized" });
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

// Get All Addresses for User
exports.getAddresses = async (req, res) => {
    try {
        const userId = req.user.id;

        const addresses = await Address.find({ userId: userId, isActive: true });

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

// Get Primary Address Label Only
exports.getPrimaryAddressLabel = async (req, res) => {
    try {
        const userId = req.user.id;

        const primaryAddress = await Address.findOne({ userId: userId, isDefault: true, isActive: true });

        if (!primaryAddress) {
            return res.json({
                success: true,
                message: "No primary address found",
                data: null
            });
        }

        res.json({
            success: true,
            message: "Primary address label fetched successfully",
            data: {
                label: primaryAddress.label
            }
        });
    } catch (error) {
        console.error("Error fetching primary address label:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};


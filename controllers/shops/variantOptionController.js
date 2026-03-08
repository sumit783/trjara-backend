const VariantOption = require("../../models/shops/VariantOption");

// Create a new variant option
exports.createVariantOption = async (req, res) => {
    try {
        const { name, values } = req.body;

        if (!name || !values || !Array.isArray(values)) {
            return res.status(400).json({
                success: false,
                message: "name and a values array are required"
            });
        }

        const variantOption = new VariantOption({
            name,
            values
        });

        const savedOption = await variantOption.save();

        res.status(201).json({
            success: true,
            message: "Variant option created successfully",
            data: savedOption
        });
    } catch (error) {
        console.error("Error creating variant option:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

// Get all variant options
exports.getVariantOptions = async (req, res) => {
    try {
        const options = await VariantOption.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: "Variant options fetched successfully",
            count: options.length,
            data: options
        });
    } catch (error) {
        console.error("Error fetching variant options:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

// Optional: Update a variant option
exports.updateVariantOption = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, values } = req.body;

        const option = await VariantOption.findById(id);
        if (!option) {
            return res.status(404).json({ success: false, message: "Variant option not found" });
        }

        if (name) option.name = name;
        if (values && Array.isArray(values)) option.values = values;

        const updatedOption = await option.save();

        res.status(200).json({
            success: true,
            message: "Variant option updated successfully",
            data: updatedOption
        });
    } catch (error) {
        console.error("Error updating variant option:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

// Optional: Delete a variant option
exports.deleteVariantOption = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await VariantOption.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Variant option not found" });
        }

        res.status(200).json({
            success: true,
            message: "Variant option deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting variant option:", error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

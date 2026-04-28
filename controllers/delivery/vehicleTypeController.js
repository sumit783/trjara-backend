const VehicleType = require("../../models/rider/VehicleType");

// @desc    Create a new vehicle type
// @route   POST /api/admin/vehicle-types
// @access  Private (Admin only)
exports.createVehicleType = async (req, res) => {
    try {
        const { name, maxLoadKg, averageSpeed, pricingModel, pricing, isActive } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Vehicle type name is required" });
        }

        const existingType = await VehicleType.findOne({ name });
        if (existingType) {
            return res.status(400).json({ error: "Vehicle type already exists" });
        }

        const vehicleType = new VehicleType({
            name,
            image: req.file ? req.file.path : undefined,
            maxLoadKg,
            averageSpeed,
            pricingModel,
            pricing,
            isActive: isActive !== undefined ? isActive : true
        });

        await vehicleType.save();

        res.status(201).json({
            success: true,
            message: "Vehicle type created successfully",
            data: vehicleType
        });
    } catch (err) {
        console.error("Error in createVehicleType:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// @desc    Get all vehicle types
// @route   GET /api/admin/vehicle-types
// @access  Private (Admin only)
exports.getAllVehicleTypes = async (req, res) => {
    try {
        const vehicleTypes = await VehicleType.find();
        res.json({
            success: true,
            data: vehicleTypes
        });
    } catch (err) {
        console.error("Error in getAllVehicleTypes:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// @desc    Update a vehicle type
// @route   PUT /api/admin/vehicle-types/:id
// @access  Private (Admin only)
exports.updateVehicleType = async (req, res) => {
    try {
        const { name, maxLoadKg, averageSpeed, pricingModel, pricing, isActive } = req.body;

        const vehicleType = await VehicleType.findById(req.params.id);
        if (!vehicleType) {
            return res.status(404).json({ error: "Vehicle type not found" });
        }

        vehicleType.name = name || vehicleType.name;
        if (req.file) {
            vehicleType.image = req.file.path;
        }
        vehicleType.maxLoadKg = maxLoadKg !== undefined ? maxLoadKg : vehicleType.maxLoadKg;
        vehicleType.averageSpeed = averageSpeed !== undefined ? averageSpeed : vehicleType.averageSpeed;
        vehicleType.pricingModel = pricingModel || vehicleType.pricingModel;
        vehicleType.pricing = pricing !== undefined ? pricing : vehicleType.pricing;
        vehicleType.isActive = isActive !== undefined ? isActive : vehicleType.isActive;

        await vehicleType.save();

        res.json({
            success: true,
            message: "Vehicle type updated successfully",
            data: vehicleType
        });
    } catch (err) {
        console.error("Error in updateVehicleType:", err);
        res.status(500).json({ error: "Server error" });
    }
};

// @desc    Delete a vehicle type
// @route   DELETE /api/admin/vehicle-types/:id
// @access  Private (Admin only)
exports.deleteVehicleType = async (req, res) => {
    try {
        const vehicleType = await VehicleType.findByIdAndDelete(req.params.id);
        if (!vehicleType) {
            return res.status(404).json({ error: "Vehicle type not found" });
        }

        res.json({
            success: true,
            message: "Vehicle type deleted successfully"
        });
    } catch (err) {
        console.error("Error in deleteVehicleType:", err);
        res.status(500).json({ error: "Server error" });
    }
};

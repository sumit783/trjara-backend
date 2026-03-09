const mongoose = require("mongoose");

const vehicleTypeSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        unique: true
    },

    image: {
        type: String
    },

    maxLoadKg: {
        type: Number
    },

    averageSpeed: {
        type: Number
    },

    isActive: {
        type: Boolean,
        default: true
    }

}, { timestamps: true });

module.exports = mongoose.model("VehicleType", vehicleTypeSchema);
const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["bike", "scooter", "car", "van"], required: true },
    name: { type: String, required: true },
    imageUrl: { type: String },
    numberPlate: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
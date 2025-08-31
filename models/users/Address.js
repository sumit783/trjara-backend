const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    ownerType: { type: String, enum: ["user", "shop"], required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    label: { type: String }, // e.g. Home, Work
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, required: true, default: "India" },
    lat: { type: Number },
    lng: { type: Number },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);


module.exports = mongoose.model("Address", addressSchema);
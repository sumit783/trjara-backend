const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ["franchise", "local_store", "brand"], required: true },
    businessType: { type: String, enum: ["retailer", "wholesaler", "dealer"], required: true },
    phone: { type: String },
    email: { type: String },
    gstin: { type: String },
    status: {
      type: String,
      enum: ["pending", "verified", "rejected", "active", "suspended"],
      default: "pending",
    },
    pickupAddressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address" },
    logoUrl: { type: String },
    coverImageUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shop", shopSchema);
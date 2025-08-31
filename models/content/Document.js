const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    ownerType: { type: String, enum: ["user", "shop"], required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    docType: { type: String, enum: ["aadhaar", "pan", "gstin", "trade_license"], required: true },
    docNumber: { type: String, required: true },
    fileUrl: { type: String, required: true },
    status: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);

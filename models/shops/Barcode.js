// models/registry/Barcode.js
import mongoose from "mongoose";

const BarcodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // barcode or qr payload string
    type: { type: String, enum: ["barcode", "qr"], default: "barcode" },
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory" },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
    assignedAt: { type: Date, default: Date.now },
    meta: { type: Object, default: {} }, // optional metadata (scanner id, batch, etc.)
  },
  { timestamps: true }
);

// Unique index on code ensures one-to-one mapping
BarcodeSchema.index({ code: 1 }, { unique: true });

export default mongoose.model("Barcode", BarcodeSchema);

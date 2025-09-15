// models/registry/QRCode.js
import mongoose from "mongoose";

const QRCodeSchema = new mongoose.Schema(
  {
    // qrCodeId will be the document _id (string if you prefer custom GUID)
    // but keep a separate `qrData` field that encodes the minimal payload or reference.
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory" },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
    qrData: { type: String, required: true }, // the encoded payload / reference (e.g., GUID or inventory id)
    printed: { type: Boolean, default: false }, // whether QR was pre-printed & applied
    meta: { type: Object, default: {} }, // e.g. printBatch, template, etc.
  },
  { timestamps: true }
);

// index for quick find by qrData
QRCodeSchema.index({ qrData: 1 }, { unique: true });

export default mongoose.model("QRCode", QRCodeSchema);

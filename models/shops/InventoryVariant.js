// models/variant/InventoryVariant.js
import mongoose from "mongoose";

const InventoryVariantSchema = new mongoose.Schema(
  {
    inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory", required: true },
    variantOptionId: { type: mongoose.Schema.Types.ObjectId, ref: "VariantOption", required: true },
    value: { type: String, required: true },     // selected value (e.g., "Red")
    imageUrl: { type: String },                   // optional image for this value (owner uploaded)
    barcode: { type: String, default: null },     // scanned barcode for this variant instance
    qrCodeId: { type: String, default: null },    // system-generated QR id only (no image blob stored)
  },
  { timestamps: true }
);

// If you often query by inventoryId, add an index
InventoryVariantSchema.index({ inventoryId: 1 });
InventoryVariantSchema.index({ barcode: 1 }, { sparse: true });

export default mongoose.model("InventoryVariant", InventoryVariantSchema);

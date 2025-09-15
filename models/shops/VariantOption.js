// models/variant/VariantOption.js
import mongoose from "mongoose";

const VariantOptionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Color", "Size"
    values: [{ type: String, required: true }], // e.g. ["Red","Black","Blue"]
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin id
  },
  { timestamps: true }
);

// Optional index for quick lookups by name
VariantOptionSchema.index({ name: 1 }, { unique: false });

export default mongoose.model("VariantOption", VariantOptionSchema);

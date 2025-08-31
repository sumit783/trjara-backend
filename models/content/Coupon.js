const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    code: { type: String, unique: true, required: true },
    discountValue: { type: Number, required: true },
    discountType: { type: String, enum: ["flat", "percent"], required: true },
    minOrder: { type: Number, default: 0 },
    maxUses: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
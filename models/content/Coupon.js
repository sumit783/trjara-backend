const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
{
  code: {
    type: String,
    required: true,
    unique: true
  },

  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop"
  },

  title: {
    type: String
  },

  description: {
    type: String
  },

  discountType: {
    type: String,
    enum: ["percentage", "flat"]
  },

  discountValue: {
    type: Number,
    required: true
  },

  minOrderAmount: {
    type: Number,
    default: 0
  },

  maxDiscount: {
    type: Number
  },

  usageLimit: {
    type: Number
  },

  perUserLimit: {
    type: Number,
    default: 1
  },

  usedCount: {
    type: Number,
    default: 0
  },

  startAt: {
    type: Date
  },

  endAt: {
    type: Date
  },

  status: {
    type: String,
    enum: ["active", "expired", "disabled"],
    default: "active"
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
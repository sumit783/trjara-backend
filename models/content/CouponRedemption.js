const mongoose = require("mongoose");

const couponRedemptionSchema = new mongoose.Schema(
{
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Coupon",
    required: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order"
  },

  discountAmount: {
    type: Number,
    required: true
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("CouponRedemption", couponRedemptionSchema);
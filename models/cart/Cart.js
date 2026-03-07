const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },

  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true
  },

  itemsTotal: {
    type: Number,
    default: 0
  },

  discountAmount: {
    type: Number,
    default: 0
  },

  deliveryCharge: {
    type: Number,
    default: 0
  },

  platformCharge: {
    type: Number,
    default: 0
  },

  smallCartCharge: {
    type: Number,
    default: 0
  },

  totalAmount: {
    type: Number,
    default: 0
  },

  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Coupon"
  },

  addressId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Address"
  },

  expiresAt: {
    type: Date
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);
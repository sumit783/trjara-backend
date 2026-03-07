const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
{
  orderNumber: { type: String, unique: true },

  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },

  items: [orderItemSchema],

  pricing: {
    subtotal: Number,
    deliveryFee: Number,
    discount: Number,
    total: Number
  },

  payment: {
    method: {
      type: String,
      enum: ["COD", "ONLINE"]
    },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    }
  },

  status: {
    type: String,
    enum: [
      "placed",
      "accepted",
      "packing",
      "ready_for_pickup",
      "picked",
      "out_for_delivery",
      "delivered",
      "cancelled"
    ],
    default: "placed"
  },

  addressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address" },

  riderId: { type: mongoose.Schema.Types.ObjectId, ref: "Rider" },

  placedAt: Date,
  deliveredAt: Date
},
{ timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
const mongoose = require("mongoose");
const OrderItem = require("./OrderItem");

const orderSchema = new mongoose.Schema(
{
  orderNumber: { type: String, unique: true },

  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  shopIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Store" }],

  items: [OrderItem.schema],

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
    },
    razorpayOrderId: {
      type: String
    },
    razorpayPaymentId: {
      type: String
    },
    razorpaySignature: {
      type: String
    }
  },

  status: {
    type: String,
    enum: [
      "order_placed",
      "order_packing",
      "order_ready_for_pickup",
      "order_out_for_delivery",
      "order_delivered",
      "order_cancelled",
      "rider_assigned"
    ],
    default: "order_placed"
  },

  addressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address" },

  riderId: { type: mongoose.Schema.Types.ObjectId, ref: "Rider" },

  deliveryTime: Number,

  placedAt: Date,
  deliveredAt: Date
},
{ timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
{
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  paymentMethod: {
    type: String,
    enum: ["upi", "card", "netbanking", "wallet", "cod"]
  },

  paymentGateway: {
    type: String
  },

  gatewayTransactionId: {
    type: String
  },

  status: {
    type: String,
    enum: ["pending", "success", "failed", "refunded"],
    default: "pending"
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
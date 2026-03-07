const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Wallet"
  },

  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order"
  },

  amount: {
    type: Number,
    required: true
  },

  type: {
    type: String,
    enum: [
      "order_payment",
      "store_earning",
      "rider_earning",
      "withdrawal",
      "refund",
      "commission",
      "ad_buy",
      "notification_buy"
    ]
  },

  status: {
    type: String,
    enum: ["pending", "success", "failed"],
    default: "pending"
  },

  description: {
    type: String
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
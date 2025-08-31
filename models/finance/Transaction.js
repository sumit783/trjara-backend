const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    walletId: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet", required: true },
    type: { type: String, enum: ["credit", "debit"], required: true },
    reason: {
      type: String,
      enum: ["ad_buy", "notification", "refund", "payout", "order_payment"],
      required: true,
    },
    amount: { type: Number, required: true },
    refId: { type: mongoose.Schema.Types.ObjectId }, // optional link to ad/notification/payment
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema(
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Wallet",
    required: true
  },

  bankAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BankAccount",
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected","paid"],
    default: "pending"
  },

  adminNote: {
    type: String
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("WithdrawalRequest", withdrawalSchema);
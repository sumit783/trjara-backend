const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },

  balance: {
    type: Number,
    default: 0
  },

  totalEarning: {
    type: Number,
    default: 0
  },

  totalWithdrawn: {
    type: Number,
    default: 0
  },

  currency: {
    type: String,
    default: "INR"
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Wallet", walletSchema);
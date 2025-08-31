const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    ownerType: { type: String, enum: ["user", "shop"], required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);


module.exports = mongoose.model("Wallet", walletSchema);
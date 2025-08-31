const mongoose = require("mongoose");

const bankAccountSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    holderName: { type: String, required: true },
    accountNumberMasked: { type: String, required: true },
    ifsc: { type: String, required: true },
    bankName: { type: String, required: true },
    upiId: { type: String },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);


module.exports = mongoose.model("BankAccount", bankAccountSchema);

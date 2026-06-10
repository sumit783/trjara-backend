const mongoose = require("mongoose");

const bankAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    accountHolderName: {
      type: String,
    },

    bankName: {
      type: String,
    },

    accountNumber: {
      type: String,
    },

    ifscCode: {
      type: String,
    },

    upiId: {
      type: String
    },

    isDefault: {
      type: Boolean,
      default: false
    },

    isActive: {
      type: Boolean,
      default: true
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BankAccount", bankAccountSchema);
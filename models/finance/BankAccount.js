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

    isVerified: {
      type: Boolean,
      default: false
    },

    adminVerficationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected", "reuploaded"],
      default: "pending"
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BankAccount", bankAccountSchema);
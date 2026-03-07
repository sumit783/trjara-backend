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
    required: true
  },

  bankName: {
    type: String,
    required: true
  },

  accountNumber: {
    type: String,
    required: true
  },

  ifscCode: {
    type: String,
    required: true
  },

  branchName: {
    type: String
  },

  isDefault: {
    type: Boolean,
    default: false
  },

  isVerified: {
    type: Boolean,
    default: false
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("BankAccount", bankAccountSchema);
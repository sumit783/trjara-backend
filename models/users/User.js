const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true
    },

    phone: {
      type: String,
      unique: true,
      sparse: true
    },

    profileImageUrl: {
      type: String
    },

    role: {
      type: String,
      enum: ["customer", "owner", "rider", "admin", "staff", "guest"],
      default: "guest"
    },

    /* OTP LOGIN SYSTEM */

    otp: {
      type: String
    },

    otpExpiry: {
      type: Date
    },

    otpAttempts: {
      type: Number,
      default: 0
    },

    verified: {
      type: Boolean,
      default: false
    },

    /* ADMIN APPROVAL (for owner/rider/staff) */

    isAdminVerified: {
      type: String,
      enum: ["pending", "verified", "rejected","reuploaded"],
      default: "pending"
    },
    adminNote: {
      type: String,
      default: ""
    },

    /* ADDRESS */

    defaultAddressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address"
    },

    /* ACCOUNT STATUS */

    isActive: {
      type: Boolean,
      default: false
    },

    isDeleted: {
      type: Boolean,
      default: false
    },

    /* LOGIN TRACKING */

    lastLogin: {
      type: Date
    }
  },
  { timestamps: true }
);

/* INDEXES */

userSchema.index({ role: 1 });

module.exports = mongoose.model("User", userSchema);
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, unique: true, required: true },
    otp: { type: String }, // stored temporarily for OTP login
    otpExpiry: { type: Date }, // OTP expiration timestamp
    verified: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ["customer", "owner", "rider", "admin","staff"],
      default: "customer",
    },
    defaultAddressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address" },
    profileImageUrl: { type: String },
    isActive: { type: Boolean, default: true },
    isAdminVerified: { type: String, enum: ["pending", "verified", "rejected"], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

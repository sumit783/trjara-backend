const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String, unique: true, required: true },
    otp: { type: String }, // stored temporarily for OTP login
    verified: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ["customer", "owner", "rider", "admin"],
      default: "customer",
    },
    defaultAddressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address" },
    profileImageUrl: { type: String },
    isActive: { type: Boolean, default: true },
    isAdminVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

const mongoose = require("mongoose");
const generateCustomId = require("../../utils/idGenerator");

const userSchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      unique: true,
      sparse: true
    },
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

// Auto-generate customId before saving
userSchema.pre("save", async function (next) {
  if (this.customId) return next();

  let id;
  let exists = true;
  while (exists) {
    id = generateCustomId("USR");
    const user = await mongoose.model("User").findOne({ customId: id });
    if (!user) exists = false;
  }
  this.customId = id;
  next();
});

/* INDEXES */

userSchema.index({ role: 1 });

module.exports = mongoose.model("User", userSchema);
const mongoose = require("mongoose");

const riderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    vehicleType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VehicleType"
    },

    isOnline: {
      type: Boolean,
      default: false
    },

    isAvailable: {
      type: Boolean,
      default: false
    },

    currentOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order"
    },

    rating: {
      type: Number,
      default: 5
    },

    totalDeliveries: {
      type: Number,
      default: 0
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected", "reuploaded"],
      default: "pending"
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("Rider", riderSchema);
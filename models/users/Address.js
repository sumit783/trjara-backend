const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  label: {
    type: String,
    enum: ["home", "work", "other"],
    default: "home",
  },

  name: {
    type: String, // person receiving order
  },

  phone: {
    type: String, // contact number for delivery
  },

  addressLine1: {
    type: String,
    required: true,
  },

  addressLine2: {
    type: String,
  },

  landmark: {
    type: String,
  },

  city: {
    type: String,
    required: true,
  },

  state: {
    type: String,
    required: true,
  },

  pincode: {
    type: String,
    required: true,
  },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },

  isDefault: {
    type: Boolean,
    default: false,
  },

  isActive: {
    type: Boolean,
    default: true,
  },
},
{ timestamps: true }
);

addressSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Address", addressSchema);
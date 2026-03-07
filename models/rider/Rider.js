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
    type: String,
    enum: ["bike", "cycle", "scooter"]
  },

  isOnline: {
    type: Boolean,
    default: false
  },

  isAvailable: {
    type: Boolean,
    default: true
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

  verificationStatus: {
    type: String,
    enum: ["pending","verified","rejected"],
    default: "pending"
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Rider", riderSchema);
const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    riderId: { type: mongoose.Schema.Types.ObjectId, ref: "Rider" },
    overallStatus: {
      type: String,
      enum: [
        "awaiting_pickups",
        "collecting",
        "all_collected",
        "out_for_delivery",
        "delivered",
        "failed",
      ],
      default: "awaiting_pickups",
    },
    collectedCount: { type: Number, default: 0 },
    totalPickups: { type: Number, default: 0 },
    currentLat: { type: Number },
    currentLng: { type: Number },
    eta: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Delivery", deliverySchema);
const mongoose = require("mongoose");

const deliveryPickupSchema = new mongoose.Schema(
  {
    deliveryId: { type: mongoose.Schema.Types.ObjectId, ref: "Delivery", required: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    status: {
      type: String,
      enum: ["pending", "ready", "collected", "rejected"],
      default: "pending",
    },
    orderItemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "OrderItem" }],
    pickupAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DeliveryPickup", deliveryPickupSchema);
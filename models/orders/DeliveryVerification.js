const mongoose = require("mongoose");

const deliveryVerificationSchema = new mongoose.Schema({

  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  riderId: { type: mongoose.Schema.Types.ObjectId, ref: "Rider" },

  items: [
    {
      productId: mongoose.Schema.Types.ObjectId,
      name: String,
      deliveredQty: Number,
      confirmed: {
        type: Boolean,
        default: false
      }
    }
  ],

  deliveredAt: Date

}, { timestamps: true });

module.exports = mongoose.model("DeliveryVerification", deliveryVerificationSchema);
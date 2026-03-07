const mongoose = require("mongoose");

const pickupVerificationSchema = new mongoose.Schema({

  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  riderId: { type: mongoose.Schema.Types.ObjectId, ref: "Rider" },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },

  items: [
    {
      productId: mongoose.Schema.Types.ObjectId,
      name: String,
      expectedQty: Number,
      pickedQty: Number,

      verified: { type: Boolean, default: false }
    }
  ],

  verificationStatus: {
    type: String,
    enum: ["pending", "verified", "issue"]
  },

  verifiedAt: Date

}, { timestamps: true });

module.exports = mongoose.model("PickupVerification", pickupVerificationSchema);
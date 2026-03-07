const mongoose = require("mongoose");

const storePolicySchema = new mongoose.Schema(
{
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true
  },

  returnPolicy: {
    type: String
  },

  cancellationPolicy: {
    type: String
  },

  deliveryPolicy: {
    type: String
  },

  privacyPolicy: {
    type: String
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("StorePolicy", storePolicySchema);
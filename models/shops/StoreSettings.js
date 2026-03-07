const mongoose = require("mongoose");

const storeSettingsSchema = new mongoose.Schema(
{
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store"
  },

  minOrderAmount: Number,

  deliveryRadius: Number,

  preparationTime: Number,

  autoAcceptOrders: {
    type: Boolean,
    default: false
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("StoreSettings", storeSettingsSchema);
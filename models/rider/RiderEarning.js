const mongoose = require("mongoose");

const riderEarningSchema = new mongoose.Schema(
{
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Rider"
  },

  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order"
  },

  deliveryFee: Number,

  bonus: Number,

  totalEarning: Number,

  paymentStatus: {
    type: String,
    enum: ["pending","paid"],
    default: "pending"
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("RiderEarning", riderEarningSchema);
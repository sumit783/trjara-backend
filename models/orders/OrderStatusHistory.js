const mongoose = require("mongoose");

const orderStatusHistorySchema = new mongoose.Schema(
{
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true
  },

  status: {
    type: String,
    required: true
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  note: {
    type: String
  }

},
{ timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("OrderStatusHistory", orderStatusHistorySchema);
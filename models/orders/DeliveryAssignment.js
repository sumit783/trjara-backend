const mongoose = require("mongoose");

const deliveryAssignmentSchema = new mongoose.Schema(
{
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true
  },

  riderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  status: {
    type: String,
    enum: ["assigned","accepted","rejected","completed"],
    default: "assigned"
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("DeliveryAssignment", deliveryAssignmentSchema);
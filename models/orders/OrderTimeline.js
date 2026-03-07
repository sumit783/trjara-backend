const mongoose = require("mongoose");

const orderTimelineSchema = new mongoose.Schema({

  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },

  status: String,

  message: String,

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "updatedByModel"
  },

  updatedByModel: {
    type: String,
    enum: ["User", "Staff", "Rider", "Admin"]
  }

}, { timestamps: true });

module.exports = mongoose.model("OrderTimeline", orderTimelineSchema);
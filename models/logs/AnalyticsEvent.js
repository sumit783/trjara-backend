const mongoose = require("mongoose");

const analyticsEventSchema = new mongoose.Schema(
  {
    event: { type: String, required: true }, // e.g. "product_view", "cart_add"
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    properties: { type: Object, default: {} }, // dynamic event properties
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("AnalyticsEvent", analyticsEventSchema);
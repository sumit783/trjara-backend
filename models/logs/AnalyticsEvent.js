const mongoose = require("mongoose");

const analyticsEventSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
      index: true // fast event filtering
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session"
    },

    properties: {
      type: Object,
      default: {}
    },

    source: {
      type: String,
      enum: ["web", "android", "ios", "admin", "system"],
      default: "web"
    }

  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

analyticsEventSchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model("AnalyticsEvent", analyticsEventSchema);
const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    deviceInfo: { type: Object }, // e.g. { os: "Android", model: "Pixel 6" }
    fcmToken: { type: String }, // For push notifications
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } } 
);

module.exports = mongoose.model("Session", sessionSchema);
const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  deviceInfo: {
    type: String, // browser/device info
  },

  deviceType: {
    type: String,
    enum: ["android", "ios", "web"],
  },

  ipAddress: {
    type: String,
  },

  fcmToken: {
    type: String, // push notifications
  },

  expiresAt: {
    type: Date,
    required: true,
  },
},
{ timestamps: { createdAt: true, updatedAt: false } }
);

sessionSchema.index({ userId: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Session", sessionSchema);
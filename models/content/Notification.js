const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    senderShopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
    audienceType: { type: String, enum: ["broadcast", "user", "segment"], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // when audienceType = user
    title: { type: String, required: true },
    message: { type: String, required: true },
    pricePerMsg: { type: Number, default: 0 },
    recipients: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    status: { type: String, enum: ["queued", "sent", "failed"], default: "queued" },
    sentAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("Notification", notificationSchema);

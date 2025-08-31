const mongoose = require("mongoose");

const rateLimitSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, index: true }, // usually userId or IP
    type: { type: String, required: true }, // e.g. "login", "otp", "api"
    points: { type: Number, default: 0 }, // how many attempts used
    expiresAt: { type: Date, required: true }, // TTL index
  },
  { timestamps: false }
);

// Auto-remove expired documents
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RateLimit", rateLimitSchema);
const mongoose = require("mongoose");

const rateLimitSchema = new mongoose.Schema(
{
  key: {
    type: String,
    required: true,
    index: true
  },

  type: {
    type: String,
    required: true,
    index: true
  },

  points: {
    type: Number,
    default: 0
  },

  expiresAt: {
    type: Date,
    required: true
  }

},
{ timestamps: false }
);

rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RateLimit", rateLimitSchema);
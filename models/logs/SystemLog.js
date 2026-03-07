const mongoose = require("mongoose");

const systemLogSchema = new mongoose.Schema(
{
  level: {
    type: String,
    enum: ["info", "warn", "error"],
    default: "info"
  },

  service: {
    type: String
  },

  message: {
    type: String,
    required: true
  },

  meta: {
    type: Object,
    default: {}
  }

},
{ timestamps: { createdAt: true, updatedAt: false } }
);

systemLogSchema.index({ level: 1, createdAt: -1 });

module.exports = mongoose.model("SystemLog", systemLogSchema);
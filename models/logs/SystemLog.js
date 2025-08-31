const mongoose = require("mongoose");

const systemLogSchema = new mongoose.Schema(
  {
    level: { type: String, enum: ["info", "warn", "error"], default: "info" },
    message: { type: String, required: true },
    meta: { type: Object, default: {} }, // requestId, stacktrace, etc.
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);


module.exports = mongoose.model("SystemLog", systemLogSchema);
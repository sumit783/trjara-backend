const mongoose = require("mongoose");

const adSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    creativeUrl: { type: String, required: true },
    hours: { type: Number, required: true },
    ratePerHour: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    status: { type: String, enum: ["scheduled", "running", "paused", "completed"], default: "scheduled" },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ad", adSchema);

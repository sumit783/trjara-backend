const mongoose = require("mongoose");

const riderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    status: { type: String, enum: ["offline", "idle", "busy"], default: "offline" },
    currentLat: { type: Number },
    currentLng: { type: Number },
    availableFrom: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Rider", riderSchema);
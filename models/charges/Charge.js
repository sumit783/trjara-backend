// models/charges/Charge.js
import mongoose from "mongoose";

const ChargeSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ["global", "shop", "product", "inventory"],
      required: true,
      default: "global",
    },
    scopeId: { type: mongoose.Schema.Types.ObjectId, default: null }, // null for global
    platformCharge: { type: Number, default: 0 },    // absolute or percentage (decide in business logic)
    smallCartCharge: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    badWeatherCharge: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveTo: { type: Date },
    meta: { type: Object, default: {} }, // e.g., notes, type (percent|flat) if needed
  },
  { timestamps: true }
);

// index to quickly query active charges for a scope
ChargeSchema.index({ scope: 1, scopeId: 1 });

export default mongoose.model("Charge", ChargeSchema);

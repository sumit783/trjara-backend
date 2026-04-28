// models/charges/Charge.js

const mongoose = require("mongoose");

const ChargeSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      enum: ["Global", "Store", "Product", "Inventory"],
      default: "Global",
      required: true
    },

    scopeId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'scope',
      default: null // null means global
    },

    /* PLATFORM COMMISSION */

    platformCharge: {
      type: Number,
      default: 0
    },

    platformChargeType: {
      type: String,
      enum: ["flat", "percentage"],
      default: "percentage"
    },

    /* CART RELATED */

    smallCartCharge: {
      type: Number,
      default: 0
    },

    smallCartThreshold: {
      type: Number,
      default: 0
    },

    /* DELIVERY */

    deliveryCharge: {
      type: Number,
      default: 0
    },

    perKmCharge: {
      type: Number,
      default: 0
    },

    baseDeliveryDistance: {
      type: Number,
      default: 3 // km included
    },

    /* SURGE */

    badWeatherCharge: {
      type: Number,
      default: 0
    },

    surgeMultiplier: {
      type: Number,
      default: 1
    },

    /* CURRENCY */

    currency: {
      type: String,
      default: "INR"
    },

    /* VALIDITY */

    effectiveFrom: {
      type: Date,
      default: Date.now
    },

    effectiveTo: {
      type: Date
    },

    /* PRIORITY */

    priority: {
      type: Number,
      default: 0
    },

    meta: {
      type: Object,
      default: {}
    }

  },
  { timestamps: true }
);

/* INDEXES */

ChargeSchema.index({ scope: 1, scopeId: 1 });
ChargeSchema.index({ effectiveFrom: 1, effectiveTo: 1 });

module.exports = mongoose.model("Charge", ChargeSchema);
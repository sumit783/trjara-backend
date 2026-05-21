// models/cod/CODRule.js

const mongoose = require("mongoose");

const CODRuleSchema = new mongoose.Schema(
  {
    /* =========================
       RULE SCOPE
    ========================== */

    scope: {
      type: String,
      enum: ["Global", "Store", "Product", "Inventory"],
      default: "Global",
      required: true
    },

    // Related entity ID
    scopeId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "scope",
      default: null
    },

    /* =========================
       COD STATUS
    ========================== */

    // Enable or disable COD
    codEnabled: {
      type: Boolean,
      default: true
    },

    /* =========================
       COD CHARGES
    ========================== */

    // Extra charge for COD
    codCharge: {
      type: Number,
      default: 0
    },

    // flat or percentage
    codChargeType: {
      type: String,
      enum: ["flat", "percentage"],
      default: "flat"
    },

    /* =========================
       ORDER LIMITS
    ========================== */

    // Minimum order value for COD
    minCodAmount: {
      type: Number,
      default: 0
    },

    // Maximum order value for COD
    maxCodAmount: {
      type: Number,
      default: null
    },

    /* =========================
       PINCODE RULES
    ========================== */

    // COD available only in these pincodes
    allowedPincodes: [
      {
        type: String
      }
    ],

    // COD blocked in these pincodes
    blockedPincodes: [
      {
        type: String
      }
    ],

    /* =========================
       VALIDITY
    ========================== */

    effectiveFrom: {
      type: Date,
      default: Date.now
    },

    effectiveTo: {
      type: Date,
      default: null
    },

    /* =========================
       PRIORITY
    ========================== */

    // Higher priority overrides lower
    priority: {
      type: Number,
      default: 0
    },

    /* =========================
       META DATA
    ========================== */

    meta: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

/* =========================
   INDEXES
========================= */

// Faster scope lookup
CODRuleSchema.index({
  scope: 1,
  scopeId: 1
});

// Active rule lookup
CODRuleSchema.index({
  effectiveFrom: 1,
  effectiveTo: 1
});

// COD status filter
CODRuleSchema.index({
  codEnabled: 1
});

/* =========================
   EXPORT
========================= */

module.exports = mongoose.model("CODRule", CODRuleSchema);
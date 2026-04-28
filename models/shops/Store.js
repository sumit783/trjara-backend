const mongoose = require("mongoose");
const generateCustomId = require("../../utils/idGenerator");

const storeSchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      unique: true,
      sparse: true
    },
    name: {
      type: String,
      required: true
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    logo: {
      type: String
    },

    banner: {
      type: String
    },

    phone: {
      type: String
    },

    email: {
      type: String
    },

    description: {
      type: String
    },

    address: {
      type: String
    },

    city: String,
    state: String,
    pincode: String,

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: [Number]
    },
    storeType: {
      type: String,
      enum: ["franchisee", "Sole Proprietorship Shop", "Partnership Shop"],
      default: "owner"
    },
    businessType: {
      type: String,
      enum: ["retail", "wholesale", "Dealer", "Manufacturer"],
      default: "retail"
    },
    category: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category"
    }],

    isOpen: {
      type: Boolean,
      default: false
    },

    isActive: {
      type: Boolean,
      default: false
    },
    addharNumber: {
      type: String
    },
    adminVerificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected", "reuploaded"],
      default: "pending"
    },
    adminVerificationReason: {
      type: String
    },
  },
  { timestamps: true }
);

// Auto-generate customId before saving
storeSchema.pre("save", async function (next) {
  if (this.customId) return next();

  let id;
  let exists = true;
  while (exists) {
    id = generateCustomId("STR");
    const store = await mongoose.model("Store").findOne({ customId: id });
    if (!store) exists = false;
  }
  this.customId = id;
  next();
});

storeSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Store", storeSchema);
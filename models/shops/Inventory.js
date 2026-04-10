const mongoose = require("mongoose");
const generateCustomId = require("../../utils/idGenerator");

const inventorySchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      unique: true,
      sparse: true
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant"
    },

    productName: String,

    productImages: [String],

    variantOptions: {
      type: Map,
      of: String
    },

    sku: String,

    price: {
      type: Number,
      required: true
    },

    mrp: Number,

    weight: {
      type: Number,
      required: true
    },

    weightUnit: {
      type: String,
      enum: ["kg", "g", "mg", "lb", "oz", "pcs", "ltr", "ml"],
      required: true
    },

    stock: {
      type: Number,
      default: 0
    },

    isAvailable: {
      type: Boolean,
      default: true
    }

  },
  { timestamps: true }
);

// Auto-generate customId before saving
inventorySchema.pre("save", async function (next) {
  if (this.customId) return next();

  let id;
  let exists = true;
  while (exists) {
    id = generateCustomId("INV");
    const inventory = await mongoose.model("Inventory").findOne({ customId: id });
    if (!inventory) exists = false;
  }
  this.customId = id;
  next();
});

inventorySchema.index({ store: 1, product: 1 });

module.exports = mongoose.model("Inventory", inventorySchema);
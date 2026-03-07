const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
{
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

inventorySchema.index({ store: 1, product: 1 });

module.exports = mongoose.model("Inventory", inventorySchema);
const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    sku: { type: String, unique: true },
    variantMap: { type: Map, of: String }, // { Color: 'Black', Size: 'M' }
    mrp: { type: Number, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    trackStock: { type: Boolean, default: true },
    lowStockThreshold: { type: Number, default: 5 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Inventory", inventorySchema);
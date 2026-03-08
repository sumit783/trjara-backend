const mongoose = require("mongoose");

const productVariantSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    options: {
      type: Map,
      of: String
    },

    sku: {
      type: String,
      unique: true
    },

    images: [String]

  },
  { timestamps: true }
);

module.exports = mongoose.model("ProductVariant", productVariantSchema);
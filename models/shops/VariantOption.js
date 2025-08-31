const mongoose = require("mongoose");

const variantOptionSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true }, // e.g. Color | Size | Material
    values: [{ type: String, required: true }], // ['Black', 'Green']
    imageUrls: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("VariantOption", variantOptionSchema);
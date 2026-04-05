const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    description: String,

    brand: String,

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },

    images: [String],

    options: [
      {
        option: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "VariantOption"
        },
        values: [String]
      }
    ],
    productVariant: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductVariant"
      }
    ],
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isAvailable: {
      type: Boolean,
      default: true
    }

  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
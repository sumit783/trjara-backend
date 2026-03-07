const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
{
  cartId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cart",
    required: true
  },

  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },

  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Inventory",
    required: true
  },

  inventoryVariantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InventoryVariant"
  },

  name: {
    type: String
  },

  imageUrl: {
    type: String
  },

  variantName: {
    type: String
  },

  price: {
    type: Number,
    required: true
  },

  mrp: {
    type: Number
  },

  quantity: {
    type: Number,
    required: true,
    default: 1
  },

  totalPrice: {
    type: Number
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("CartItem", cartItemSchema);
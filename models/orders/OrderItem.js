const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory" },

  name: String,
  image: String,

  variant: {
    color: String,
    size: String,
    weight: String
  },

  price: Number,
  quantity: Number,
  total: Number
});

module.exports = mongoose.model("OrderItem", orderItemSchema);
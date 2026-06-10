const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory" },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Store" },

  name: String,
  image: String,

  variant: {
    color: String,
    size: String,
    weight: String
  },

  price: Number,
  quantity: Number,
  total: Number,

  status: {
    type: String,
    enum: ["pending", "packed", "failed"],
    default: "pending"
  },
  statusReason: {
    type: String,
    default: ""
  }
});

module.exports = mongoose.model("OrderItem", orderItemSchema);
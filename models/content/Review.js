const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop"
  },

  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product"
  },

  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order"
  },

  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },

  comment: {
    type: String
  },

  images: [{
    type: String
  }],

  status: {
    type: String,
    enum: ["visible", "hidden"],
    default: "visible"
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
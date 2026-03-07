const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
{
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ShopRole",
    required: true
  },

  joinedAt: {
    type: Date,
    default: Date.now
  },

  isActive: {
    type: Boolean,
    default: true
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Staff", staffSchema);
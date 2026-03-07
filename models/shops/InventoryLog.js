const mongoose = require("mongoose");

const inventoryLogSchema = new mongoose.Schema(
{
  inventory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Inventory"
  },

  changeType: {
    type: String,
    enum: ["add", "remove", "adjust"]
  },

  quantity: Number,

  reason: String,

  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("InventoryLog", inventoryLogSchema);
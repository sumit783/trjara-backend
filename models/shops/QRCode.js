const mongoose = require("mongoose");

const qrCodeSchema = new mongoose.Schema(
{
  code: {
    type: String,
    unique: true
  },

  inventory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Inventory"
  },

  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store"
  },

  isActive: {
    type: Boolean,
    default: true
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("QRCode", qrCodeSchema);
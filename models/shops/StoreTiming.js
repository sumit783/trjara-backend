const mongoose = require("mongoose");

const storeTimingSchema = new mongoose.Schema(
{
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true
  },

  day: {
    type: String,
    enum: [
      "monday","tuesday","wednesday",
      "thursday","friday","saturday","sunday"
    ]
  },

  openTime: String,
  closeTime: String,

  isClosed: {
    type: Boolean,
    default: false
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("StoreTiming", storeTimingSchema);
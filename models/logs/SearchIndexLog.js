const mongoose = require("mongoose");

const searchIndexLogSchema = new mongoose.Schema(
{
  query: {
    type: String,
    required: true,
    index: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  resultsCount: {
    type: Number,
    default: 0
  },

  clickedProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product"
  },

  timestamp: {
    type: Date,
    default: Date.now
  }

},
{ versionKey: false }
);

searchIndexLogSchema.index({ query: 1, timestamp: -1 });

module.exports = mongoose.model("SearchIndexLog", searchIndexLogSchema);
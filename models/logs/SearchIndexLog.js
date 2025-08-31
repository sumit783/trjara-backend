const mongoose = require("mongoose");

const searchIndexLogSchema = new mongoose.Schema(
  {
    query: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resultsCount: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
  },
  { versionKey: false }
);


module.exports = mongoose.model("SearchIndexLog", searchIndexLogSchema);
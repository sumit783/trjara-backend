const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
{
  title: String,

  imageUrl: String,

  redirectType: {
    type: String,
    enum: ["shop","product","category","external"]
  },

  redirectId: {
    type: mongoose.Schema.Types.ObjectId
  },

  position: Number,

  isActive: {
    type: Boolean,
    default: true
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("Banner", bannerSchema);
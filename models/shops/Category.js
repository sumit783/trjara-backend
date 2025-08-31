const mongoose = require("mongoose");
const categorySchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", default: null }, // null = global
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    verticalImageUrl: { type: String },
    mainIconUrl: { type: String },
    oneLiner: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);
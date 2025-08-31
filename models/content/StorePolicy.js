const mongoose = require("mongoose");

const storePolicySchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    category: {
      type: String,
      enum: ["Returns", "Shipping", "Payments", "FAQ", "Legal", "T&C", "Help"],
      required: true,
    },
    contentMd: { type: String, required: true }, // markdown content
    isEditable: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);


module.exports = mongoose.model("StorePolicy", storePolicySchema);

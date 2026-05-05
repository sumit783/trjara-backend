const mongoose = require("mongoose");

const variantOptionSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true
  },

  values: [
    {
      type: String,
      required: true
    }
  ],
  isActive: {
    type: Boolean,
    default: true
  }
},
{ timestamps: true }
);

module.exports = mongoose.model("VariantOption", variantOptionSchema);
const mongoose = require("mongoose");
const generateCustomId = require("../../utils/idGenerator");

const categorySchema = new mongoose.Schema(
{
  customId: {
    type: String,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },

  slug: {
    type: String,
    unique: true
  },

  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    default: null
  },

  image: String,

  isActive: {
    type: Boolean,
    default: true
  }
},
{ timestamps: true }
);

// Auto-generate customId before saving
categorySchema.pre("save", async function (next) {
  if (this.customId) return next();

  let id;
  let exists = true;
  while (exists) {
    id = generateCustomId("CAT");
    const category = await mongoose.model("Category").findOne({ customId: id });
    if (!category) exists = false;
  }
  this.customId = id;
  next();
});

module.exports = mongoose.model("Category", categorySchema);
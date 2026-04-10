const mongoose = require("mongoose");
const generateCustomId = require("../../utils/idGenerator");

const generateSlug = (name) => {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/^-+|-+$/g, "");
};

const productSchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      unique: true,
      sparse: true
    },
    name: {
      type: String,
      required: true
    },

    slug: {
      type: String,
      unique: true,
      sparse: true  // allows multiple docs without slug (null) without conflict
    },

    description: String,

    brand: String,

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },

    images: [String],

    options: [
      {
        option: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "VariantOption"
        },
        values: [String]
      }
    ],
    productVariant: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductVariant"
      }
    ],
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isAvailable: {
      type: Boolean,
      default: true
    }

  },
  { timestamps: true }
);

// Auto-generate customId before saving
productSchema.pre("save", async function (next) {
  if (this.customId) return next();

  let id;
  let exists = true;
  while (exists) {
    id = generateCustomId("PRD");
    const product = await mongoose.model("Product").findOne({ customId: id });
    if (!product) exists = false;
  }
  this.customId = id;
  next();
});

// Auto-generate slug from name before saving
productSchema.pre("save", async function (next) {
    if (!this.isModified("name") && this.slug) return next();

    let baseSlug = generateSlug(this.name);
    let slug = baseSlug;
    let counter = 1;

    // Ensure uniqueness
    while (await mongoose.model("Product").exists({ slug, _id: { $ne: this._id } })) {
        slug = `${baseSlug}-${counter++}`;
    }

    this.slug = slug;
    next();
});

module.exports = mongoose.model("Product", productSchema);
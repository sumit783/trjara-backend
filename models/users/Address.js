const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    label: {
      type: String,
      enum: ["home", "work", "other"],
      default: "home",
    },

    addressLine1: {
      type: String,
      required: true,
    },

    addressLine2: {
      type: String,
    },

    landmark: {
      type: String,
    },

    city: {
      type: String,
      required: true,
    },

    state: {
      type: String,
      required: true,
    },

    pincode: {
      type: String,
      required: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

addressSchema.pre("save", async function (next) {
  if (this.isModified("isDefault") && this.isDefault) {
    await mongoose.model("Address").updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

addressSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Address", addressSchema);
const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Link to User
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Staff", staffSchema);
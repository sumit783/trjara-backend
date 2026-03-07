const mongoose = require("mongoose");

const shopRoleSchema = new mongoose.Schema(
{
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true
  },

  name: {
    type: String,
    required: true
  },

  permissions: {
    manageProducts: { type: Boolean, default: false },
    manageInventory: { type: Boolean, default: false },
    manageOrders: { type: Boolean, default: false },
    manageStaff: { type: Boolean, default: false },
    viewReports: { type: Boolean, default: false }
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("ShopRole", shopRoleSchema);
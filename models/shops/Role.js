const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // Admin | Manager | Cashier | Inventory
    permissions: {
      type: Map,
      of: Boolean, // flexible permissions like { addProduct: true, seeInvoice: false }
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model("Role", roleSchema);
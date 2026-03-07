const mongoose = require("mongoose");

const storeDocumentSchema = new mongoose.Schema(
{
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store"
  },

  documentType: {
    type: String,
    enum: [
      "gst",
      "shop_license",
    ]
  },

  documentUrl: String,

  verificationStatus: {
    type: String,
    enum: ["pending","verified","rejected","reuploaded"],
    default: "pending"
  }

},
{ timestamps: true }
);

module.exports = mongoose.model("StoreDocument", storeDocumentSchema);
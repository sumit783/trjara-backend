const mongoose = require("mongoose");

const riderDocumentSchema = new mongoose.Schema(
{
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Rider",
    required: true
  },

  documentType: {
    type: String,
    enum: [
      "aadhar",
      "pan",
      "driving_license",
      "rc_book",
      "insurance",
      "profile_photo"
    ],
    required: true
  },

  documentNumber: {
    type: String
  },

  documentImage: {
    type: String
  },

  verificationStatus: {
    type: String,
    enum: ["pending", "approved", "rejected","reuploaded"],
    default: "pending"
  },

  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  verifiedAt: Date

},
{ timestamps: true }
);

module.exports = mongoose.model("RiderDocument", riderDocumentSchema);
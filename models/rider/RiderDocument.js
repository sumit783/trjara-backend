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
      "aadhar_front",
      "aadhar_back",
      "pan",
      "driving_license",
      "profile_photo"
    ],
    required: true
  },

  documentImage: {
    type: String
  },

  verificationStatus: {
    type: String,
    enum: ["pending", "approved", "rejected","reuploaded"],
    default: "pending"
  },
  
  remark: {
    type: String
  },
  verifiedAt: Date

},
{ timestamps: true }
);

// Sync profile photo to User profileImageUrl when updated/saved
riderDocumentSchema.post("save", async function (doc) {
  if (doc.documentType === "profile_photo" && doc.documentImage) {
    try {
      const Rider = mongoose.model("Rider");
      const User = mongoose.model("User");

      const rider = await Rider.findById(doc.rider);
      if (rider && rider.user) {
        await User.findByIdAndUpdate(rider.user, {
          profileImageUrl: doc.documentImage
        });
      }
    } catch (err) {
      console.error("Error syncing profile photo to User model:", err);
    }
  }
});

module.exports = mongoose.model("RiderDocument", riderDocumentSchema);
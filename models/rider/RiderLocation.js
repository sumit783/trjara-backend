const mongoose = require("mongoose");

const riderLocationSchema = new mongoose.Schema(
{
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Rider"
  },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },

    coordinates: {
      type: [Number] // [longitude, latitude]
    }
  },

  heading: Number,
  speed: Number

},
{ timestamps: true }
);

riderLocationSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("RiderLocation", riderLocationSchema);
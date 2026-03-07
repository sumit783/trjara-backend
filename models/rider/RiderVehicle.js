const mongoose = require("mongoose");

const riderVehicleSchema = new mongoose.Schema(
{
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Rider",
    required: true
  },

  vehicleType: {
    type: String,
    enum: ["bike","scooter","cycle"]
  },

  vehicleNumber: String,

  licenseNumber: String,

  vehicleImage: String

},
{ timestamps: true }
);

module.exports = mongoose.model("RiderVehicle", riderVehicleSchema);
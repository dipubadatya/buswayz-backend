const mongoose = require("mongoose");

const stopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    scheduledTime: { type: String, required: true }
  },
  { _id: false }
);

const busSchema = new mongoose.Schema(
  {
    busNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    routeName: {
      type: String,
      required: true,
      trim: true
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true
    },
    stops: [stopSchema],
    currentLocation: {
      lat: { type: Number, default: 0 },
      lng: { type: Number, default: 0 }
    },
    trackingStarted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bus", busSchema);
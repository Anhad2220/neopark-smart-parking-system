const mongoose = require("mongoose");

console.log("✅ Parking model file loaded");

const parkingSchema = new mongoose.Schema({
  name: String,
  address: String,
  city: String,
  location: {
    type: {
      type: String,
      default: "Point",
    },
    coordinates: [Number],
  },
  totalSlots: Number,
  pricePerHour: Number,
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  availableSlots: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("ParkingLot", parkingSchema);
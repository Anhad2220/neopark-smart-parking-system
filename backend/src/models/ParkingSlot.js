const mongoose = require("mongoose");

console.log("✅ ParkingSlot model loaded");

const parkingSlotSchema = new mongoose.Schema(
  {
    lotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ParkingLot",
      required: true,
      index: true,
    },
    slotNumber: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["regular", "ev", "handicap"],
      default: "regular"
    },
    // 👇 NEW: Added the status field so it saves to the database
    status: {
      type: String,
      enum: ["available", "occupied", "reserved", "maintenance", "booked"],
      default: "available",
    },
    floor: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Compound unique index
parkingSlotSchema.index({ lotId: 1, slotNumber: 1 }, { unique: true });

module.exports = mongoose.model("ParkingSlot", parkingSlotSchema);
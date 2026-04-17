const mongoose = require("mongoose");

/**
 * Booking Model
 * ──────────────
 * The single source of truth for slot availability.
 * A slot is considered "occupied" at time T if an active
 * Booking exists for that slotId where startTime <= T < endTime.
 *
 * Design decisions:
 *
 *  - lotId is stored directly (denormalized) so managers can
 *    query all bookings for their lot without joining through
 *    ParkingSlot → ParkingLot. One DB call instead of two.
 *
 *  - amount is calculated at booking time and frozen here.
 *    If the lot's pricePerHour changes later, past bookings
 *    retain the price the user was actually charged.
 *
 *  - status "active" means the booking is in effect.
 *    "completed" = vehicle has left. "cancelled" = user/admin cancelled.
 *    Only "active" bookings participate in the availability check.
 */

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true, // fast: "get all bookings by this user"
    },

    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ParkingSlot",
      required: [true, "Slot ID is required"],
      index: true, // fast: "is this slot available?" overlap query
    },

    vehicleNumber: {
      type: String,
      required: [true, "Vehicle number is required"],
      default: "UNKNOWN" // Adding a default just so past bookings don't crash
    },

    // Denormalized for fast manager-level queries
    lotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ParkingLot",
      required: [true, "Lot ID is required"],
      index: true,
    },

    startTime: {
      type: Date,
      required: [true, "Start time is required"],
    },

    endTime: {
      type: Date,
      required: [true, "End time is required"],
    },

    status: {
      type: String,
      enum: {
        values: ["active", "completed", "cancelled"],
        message: "Status must be active, completed, or cancelled",
      },
      default: "active",
    },

    // Fare frozen at booking time — immune to future price changes
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// The most critical index in the entire system.
// Powers the overlap availability check:
//   "find active bookings for this slot where times overlap"
// Without this, every booking attempt does a full collection scan.
bookingSchema.index({ slotId: 1, status: 1, startTime: 1, endTime: 1 });

// Powers manager dashboard: "all active bookings in my lot"
bookingSchema.index({ lotId: 1, status: 1 });

// Powers user history: "my bookings sorted by newest first"
bookingSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Booking", bookingSchema);

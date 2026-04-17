const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const ParkingSlot = require("../models/ParkingSlot");
const User = require("../models/User");
const ParkingLot = require("../models/parking.model");
const { acquireLock, releaseLock } = require("../utils/redisLock");
const { bookingQueue, JOB_TYPES } = require("../queues/booking.queue");
const { emitSlotUpdate } = require("../config/socket");

// ─── Helpers ─────────────────────────────────────────────────────

const calculateAmount = (start, end, baseRate, slotType) => {
  const durationHrs = Math.ceil((end - start) / (1000 * 60 * 60));

  // Apply multipliers based on classification
  let multiplier = 1;
  if (slotType === 'ev') multiplier = 1.5; // 50% extra for charging
  if (slotType === 'handicap') multiplier = 0.8; // 20% discount for accessibility

  return durationHrs * baseRate * multiplier;
};

const hasOverlappingBooking = async (slotId, startTime, endTime) => {
  const conflict = await Booking.findOne({
    slotId,
    status: "active",
    startTime: { $lt: new Date(endTime) },
    endTime: { $gt: new Date(startTime) },
  }).lean(); // ✅ FIX

  return !!conflict;
};

// ─── MAIN FUNCTION ───────────────────────────────────────────────

const createBooking = async (bookingData, userId) => {
  const { slotId, startTime, endTime, vehicleNumber } = bookingData;

  // 1. Basic Validation
  if (!mongoose.Types.ObjectId.isValid(slotId)) {
    throw Object.assign(new Error("Invalid slot ID."), { statusCode: 400 });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start) || isNaN(end) || start >= end) {
    throw Object.assign(new Error("Invalid duration."), { statusCode: 400 });
  }

  if (start < new Date()) {
    throw Object.assign(new Error("Cannot book in the past."), { statusCode: 400 });
  }

  // 2. Fetch Slot and Lot info
  const slot = await ParkingSlot.findById(slotId).lean();
  if (!slot || !slot.isActive) {
    throw Object.assign(new Error("Slot is unavailable."), { statusCode: 404 });
  }

  const lot = await ParkingLot.findById(slot.lotId).lean();
  if (!lot || !lot.isActive) {
    throw Object.assign(new Error("Parking lot is closed."), { statusCode: 400 });
  }

  // 3. Acquire Redis Lock
  const lockKey = `lock:slot:${slotId}`;
  const lockValue = await acquireLock(lockKey);

  if (!lockValue) {
    throw Object.assign(new Error("Slot is being processed. Try again."), { statusCode: 409 });
  }

  try {
    // 4. Overlap Check
    const isConflict = await hasOverlappingBooking(slotId, start, end);
    if (isConflict) {
      throw Object.assign(new Error("Slot already booked for this time."), { statusCode: 409 });
    }

    // 5. UPDATED Business Logic: Calculate Price using classification
    // We pass slot.type to apply EV or Handicap adjustments
    const amount = calculateAmount(start, end, lot.pricePerHour, slot.type);

    // 6. Database Operations
    const booking = await Booking.create({
      userId,
      slotId,
      lotId: slot.lotId,
      startTime: start,
      endTime: end,
      vehicleNumber: vehicleNumber || "UNKNOWN",
      amount,
      status: "active",
    });

    await ParkingSlot.findByIdAndUpdate(slotId, { status: "booked" });
    await ParkingLot.findByIdAndUpdate(slot.lotId, { $inc: { availableSlots: -1 } });

    // 7. Populate Data
    const finalBooking = await Booking.findById(booking._id)
      .populate("slotId", "slotNumber type floor")
      .populate("lotId", "name address")
      .lean();

    // 8. UPDATED Real-time Update: Sending full object for UI icons
    emitSlotUpdate(slot.lotId, {
      slotId: slot._id,
      status: "booked",
      type: slot.type // 👈 Ensures the frontend keeps the ⚡ or ♿ icon
    });

    // 9. Queue Jobs
    bookingQueue.add({
      type: JOB_TYPES.BOOKING_CONFIRMATION,
      data: { bookingId: booking._id }
    }).catch(err => console.warn(`[Queue] Confirmation failed: ${err.message}`));

    bookingQueue.add(
      { type: JOB_TYPES.AUTO_COMPLETE, data: { bookingId: booking._id } },
      { delay: end - new Date(), jobId: `complete-${booking._id}` }
    ).catch(err => console.warn(`[Queue] Expiry job failed: ${err.message}`));

    return finalBooking;

  } finally {
    await releaseLock(lockKey, lockValue);
  }
};

// ───────────────────────────────────────────────────────────────

const getUserBookings = async (userId, query = {}) => {
  const { status, page = 1, limit = 10 } = query;

  // 1. Find all bookings that are past their endTime but still marked "active"
  const expiredBookings = await Booking.find({
    userId,
    status: "active",
    endTime: { $lt: new Date() }
  });

  // 2. Loop through them to sync the rest of the database
  if (expiredBookings.length > 0) {
    for (const booking of expiredBookings) {
      // Mark as completed
      await Booking.findByIdAndUpdate(booking._id, { status: "completed" });

      // Free the specific slot
      await ParkingSlot.findByIdAndUpdate(booking.slotId, { status: "available" });

      // Give the available slot back to the main lot count
      await ParkingLot.findByIdAndUpdate(booking.lotId, { $inc: { availableSlots: 1 } });

      // Optional: If you want real-time map updates even during cleanup
      const { emitSlotUpdate } = require("../config/socket");
      emitSlotUpdate(booking.lotId, booking.slotId, "available");
    }
  }

  const filter = { userId };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate("slotId", "slotNumber type floor")
      .populate("lotId", "name city address")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(), // ✅ FIX

    Booking.countDocuments(filter),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

// ───────────────────────────────────────────────────────────────

const cancelBooking = async (bookingId, requestingUser) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const error = new Error("Invalid booking ID.");
    error.statusCode = 400;
    throw error;
  }

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    const error = new Error("Booking not found.");
    error.statusCode = 404;
    throw error;
  }

  const isOwner = booking.userId.toString() === requestingUser.id;
  const isAdmin = requestingUser.role === "admin";

  if (!isOwner && !isAdmin) {
    const error = new Error("Access denied.");
    error.statusCode = 403;
    throw error;
  }

  if (booking.status !== "active") {
    const error = new Error("Only active bookings can be cancelled.");
    error.statusCode = 400;
    throw error;
  }

  booking.status = "cancelled";
  await booking.save();

  emitSlotUpdate(booking.lotId, booking.slotId, "available");
  await ParkingSlot.findByIdAndUpdate(booking.slotId, { status: "available" });
  await ParkingLot.findByIdAndUpdate(booking.lotId, { $inc: { availableSlots: 1 } });

  return booking;
};

const getAllBookings = async (query = {}) => {
  const { page = 1, limit = 10 } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const [bookings, total] = await Promise.all([
    Booking.find({})
      .populate("userId", "name email")
      .populate("lotId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Booking.countDocuments({}),
  ]);

  return { bookings, total };
};

module.exports = {
  createBooking,
  getUserBookings,
  cancelBooking,
  getAllBookings,
};
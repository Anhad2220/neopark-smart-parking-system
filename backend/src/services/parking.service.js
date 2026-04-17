const mongoose = require("mongoose");
const ParkingLot = require("../models/parking.model");
const Booking = require("../models/Booking");
const ParkingSlot = require("../models/ParkingSlot"); // 👈 NEW IMPORT
const redisClient = require("../config/redis");

console.log("ParkingLot model:", ParkingLot);

/**
 * Parking Lot Service
 * Handles all business logic for parking lot operations
 */

// ─── Redis Cache Helpers ──────────────────────────────────────────────────────

const CACHE_TTL = 60; // seconds

const getCacheKey = (lotId) => `lot:summary:${lotId}`;

const setLotCache = async (lotId, data) => {
  try {
    await redisClient.setex(getCacheKey(lotId), CACHE_TTL, JSON.stringify(data));
  } catch (err) {
    console.warn(`[Cache] Set failed: ${err.message}`);
  }
};

const getLotCache = async (lotId) => {
  try {
    const cached = await redisClient.get(getCacheKey(lotId));
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.warn(`[Cache] Get failed: ${err.message}`);
    return null;
  }
};

const invalidateLotCache = async (lotId) => {
  try {
    await redisClient.del(getCacheKey(lotId));
  } catch (err) {
    console.warn(`[Cache] Invalidate failed: ${err.message}`);
  }
};

// ─── Service Functions ────────────────────────────────────────────────────────

// CREATE
const createParkingLot = async (lotData) => {
  // Validate location
  if (
    !lotData.location ||
    !Array.isArray(lotData.location.coordinates) ||
    lotData.location.coordinates.length !== 2
  ) {
    const error = new Error("Invalid location coordinates");
    error.statusCode = 400;
    throw error;
  }

  // Ensure availableSlots matches totalSlots initially
  lotData.availableSlots = lotData.totalSlots;

  // 1. Create the main Parking Lot
  const lot = await ParkingLot.create(lotData);

  // 2. Auto-generate the slots with classification
  if (lotData.totalSlots && lotData.totalSlots > 0) {
    const slotsToCreate = [];
    
    // Parse specialty counts (ensure they are numbers)
    const evCount = parseInt(lotData.evSlots) || 0;
    const handicapCount = parseInt(lotData.handicapSlots) || 0;

    for (let i = 1; i <= lotData.totalSlots; i++) {
      let slotType = 'regular'; // Default fallback

      // ─── CLASSIFICATION LOGIC ───
      // 1. Fill Handicap first
      if (i <= handicapCount) {
        slotType = 'handicap';
      } 
      // 2. Then fill EV slots
      else if (i <= (handicapCount + evCount)) {
        slotType = 'ev';
      } 
      // 3. Remaining slots are standard four-wheelers
      else {
        slotType = 'regular'; 
      }

      slotsToCreate.push({
        lotId: lot._id,
        slotNumber: `A-${i.toString().padStart(2, '0')}`, // Formats 1 as A-01
        type: slotType, 
        status: 'available',
        floor: 1
      });
    }

    // 3. Bulk insert for efficiency
    if (slotsToCreate.length > 0) {
      await ParkingSlot.insertMany(slotsToCreate);
      console.log(`✅ Generated ${slotsToCreate.length} classified slots for ${lotData.name}`);
      console.log(`📊 Breakdown: ${handicapCount} Handicap, ${evCount} EV, ${lotData.totalSlots - (handicapCount + evCount)} Regular`);
    }
  }

  return lot;
};
// GET ALL
const getAllParkingLots = async (query = {}) => {
  const { city, isActive, page = 1, limit = 10 } = query;

  // ─── START OF CLEANUP & AUTO-HEALING LOGIC ───
  try {
    // 1. CLEANUP EXPIRED BOOKINGS
    const expired = await Booking.find({
      status: "active",
      endTime: { $lt: new Date() }
    });

    if (expired.length > 0) {
      for (const b of expired) {
        await Booking.findByIdAndUpdate(b._id, { status: "completed" });
        await ParkingSlot.findByIdAndUpdate(b.slotId, { status: "available" });
        await ParkingLot.findByIdAndUpdate(b.lotId, { $inc: { availableSlots: 1 } });
        // Clear Redis cache so the count updates everywhere
        await invalidateLotCache(b.lotId.toString());
      }
      console.log(`[Cleanup] Successfully completed ${expired.length} expired bookings.`);
    }

    // 2. AUTO-HEAL STUCK "BOOKED" SLOTS
    // Find slots marked 'booked' in the database
    const stuckSlots = await ParkingSlot.find({ status: "booked" });

    for (const slot of stuckSlots) {
      // Check if there is actually an active booking for this slot
      const activeBooking = await Booking.findOne({ 
        slotId: slot._id, 
        status: "active" 
      });

      if (!activeBooking) {
        // No active booking found, but slot is still red? Fix it.
        await ParkingSlot.findByIdAndUpdate(slot._id, { status: "available" });
        
        // Only increment the lot count if it's not already at maximum
        const lot = await ParkingLot.findById(slot.lotId);
        if (lot && lot.availableSlots < lot.totalSlots) {
          await ParkingLot.findByIdAndUpdate(slot.lotId, { $inc: { availableSlots: 1 } });
          await invalidateLotCache(slot.lotId.toString());
        }
        console.log(`[Auto-Heal] Reset "ghost" booked slot: ${slot.slotNumber}`);
      }
    }
  } catch (cleanupErr) {
    // We wrap this in a try/catch so even if cleanup fails, 
    // the user still gets to see the parking lot list.
    console.error("[Cleanup Error]:", cleanupErr.message);
  }
  // ─── END OF CLEANUP & AUTO-HEALING LOGIC ───

  const filter = {};
  if (city) filter.city = city.toLowerCase();
  if (isActive !== undefined) filter.isActive = isActive === "true";

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);

  const skip = (pageNum - 1) * limitNum;

  const [lots, total] = await Promise.all([
    ParkingLot.find(filter)
      .populate("managerId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),

    ParkingLot.countDocuments(filter),
  ]);

  return {
    lots,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

// GET BY ID (CACHE FIRST)
const getParkingLotById = async (lotId) => {
  if (!mongoose.Types.ObjectId.isValid(lotId)) {
    const error = new Error("Invalid parking lot ID");
    error.statusCode = 400;
    throw error;
  }

  // 1. Check cache
  const cached = await getLotCache(lotId);
  if (cached) return cached;

  // 2. Fetch from DB
  const lot = await ParkingLot.findById(lotId)
    .populate("managerId", "name email")
    .lean();

  if (!lot) {
    const error = new Error("Parking lot not found.");
    error.statusCode = 404;
    throw error;
  }

  // 3. Store in cache
  await setLotCache(lotId, lot);

  return lot;
};

// UPDATE
// UPDATE
const updateParkingLot = async (lotId, updates, requestingUser) => {
  if (!mongoose.Types.ObjectId.isValid(lotId)) {
    const error = new Error("Invalid parking lot ID");
    error.statusCode = 400;
    throw error;
  }

  const lot = await ParkingLot.findById(lotId);
  if (!lot) {
    const error = new Error("Parking lot not found.");
    error.statusCode = 404;
    throw error;
  }

  // 1. RBAC check
  if (requestingUser.role === "parking_manager") {
    const managerId = lot.managerId?._id || lot.managerId;
    if (!managerId || managerId.toString() !== requestingUser.id) {
      const error = new Error("Access denied. Not your parking lot.");
      error.statusCode = 403;
      throw error;
    }
    delete updates.managerId; // Managers cannot reassign ownership
  }

  // 2. Handle Capacity (Total Slots) Changes
  if (updates.totalSlots && updates.totalSlots !== lot.totalSlots) {
    const newTotal = parseInt(updates.totalSlots);
    const oldTotal = lot.totalSlots;

    if (newTotal > oldTotal) {
      // If capacity increased, generate the extra slots
      const extraSlots = [];
      for (let i = oldTotal + 1; i <= newTotal; i++) {
        extraSlots.push({
          lotId: lot._id,
          slotNumber: `A-${i}`,
          type: 'four-wheeler',
          status: 'available',
          floor: 1
        });
      }
      await ParkingSlot.insertMany(extraSlots);
      
      // Update availableSlots count: add the difference
      updates.availableSlots = lot.availableSlots + (newTotal - oldTotal);
    } else {
      // Logic for decreasing slots is dangerous if they are booked. 
      // For now, we prevent decreasing below currently occupied count or just update the number.
      // Recommendation: Only allow increasing capacity via UI, or alert the user.
    }
  }

  // 3. Apply the update
  const updatedLot = await ParkingLot.findByIdAndUpdate(
    lotId,
    { $set: updates },
    { new: true, runValidators: true }
  )
    .populate("managerId", "name email")
    .lean();

  // 4. Invalidate Cache
  await invalidateLotCache(lotId);

  return updatedLot;
};

// DELETE
const deleteParkingLot = async (lotId) => {
  if (!mongoose.Types.ObjectId.isValid(lotId)) {
    const error = new Error("Invalid parking lot ID");
    error.statusCode = 400;
    throw error;
  }

  const lot = await ParkingLot.findByIdAndDelete(lotId).lean();

  if (!lot) {
    const error = new Error("Parking lot not found.");
    error.statusCode = 404;
    throw error;
  }

  await invalidateLotCache(lotId);

  return lot;
};

module.exports = {
  createParkingLot,
  getAllParkingLots,
  getParkingLotById,
  updateParkingLot,
  deleteParkingLot,
};
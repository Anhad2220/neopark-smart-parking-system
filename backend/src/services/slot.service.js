const mongoose = require("mongoose");
const ParkingSlot = require("../models/ParkingSlot");
const ParkingLot = require("../models/parking.model");
const redisClient = require("../config/redis");

// ─── Redis Cache Helpers ──────────────────────────────────────────────────────

const CACHE_TTL = 60;

const getSlotsKey = (lotId) => `slots:lot:${lotId}`;

const setSlotsCache = async (lotId, data) => {
  try {
    await redisClient.setex(
      getSlotsKey(lotId),
      CACHE_TTL,
      JSON.stringify(data)
    );
  } catch (err) {
    console.warn(`[Cache] Set failed: ${err.message}`);
  }
};

const getSlotsCache = async (lotId) => {
  try {
    const cached = await redisClient.get(getSlotsKey(lotId));
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.warn(`[Cache] Get failed: ${err.message}`);
    return null;
  }
};

const invalidateSlotsCache = async (lotId) => {
  try {
    await redisClient.del(getSlotsKey(lotId));
  } catch (err) {
    console.warn(`[Cache] Invalidate failed: ${err.message}`);
  }
};

// ─── Ownership Guard ──────────────────────────────────────────────────────────

const verifyManagerOwnership = async (lotId, requestingUser) => {
  const lot = await ParkingLot.findById(lotId).lean();

  if (!lot) {
    const error = new Error("Parking lot not found.");
    error.statusCode = 404;
    throw error;
  }

  if (requestingUser.role === "parking_manager") {
    const isAssigned =
      lot.managerId && lot.managerId.toString() === requestingUser.id;

    if (!isAssigned) {
      const error = new Error(
        "Access denied. You can only manage slots for your assigned lot."
      );
      error.statusCode = 403;
      throw error;
    }
  }

  return lot;
};

// ─── Service Functions ────────────────────────────────────────────────────────

// CREATE SLOT
const createSlot = async (slotData, requestingUser) => {
  const { lotId, slotNumber } = slotData;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(lotId)) {
    const error = new Error("Invalid lot ID");
    error.statusCode = 400;
    throw error;
  }

  // Validate required field
  if (!slotNumber) {
    const error = new Error("Slot number is required");
    error.statusCode = 400;
    throw error;
  }

  await verifyManagerOwnership(lotId, requestingUser);

  let slot;

  try {
    slot = await ParkingSlot.create(slotData);
  } catch (err) {
    if (err.code === 11000) {
      const error = new Error("Slot already exists in this parking lot");
      error.statusCode = 409;
      throw error;
    }
    throw err;
  }

  await invalidateSlotsCache(lotId);

  return slot;
};

// GET SLOTS BY LOT
const getSlotsByLot = async (lotId, query = {}) => {
  if (!mongoose.Types.ObjectId.isValid(lotId)) {
    const error = new Error("Invalid lot ID");
    error.statusCode = 400;
    throw error;
  }

  const { type, floor, isActive } = query;
  const hasFilters = type || floor !== undefined || isActive !== undefined;

  // Cache only for unfiltered
  if (!hasFilters) {
    const cached = await getSlotsCache(lotId);
    if (cached) return { slots: cached, fromCache: true };
  }

  const lotExists = await ParkingLot.exists({ _id: lotId });
  if (!lotExists) {
    const error = new Error("Parking lot not found.");
    error.statusCode = 404;
    throw error;
  }

  const filter = { lotId };

  if (type) filter.type = type.toLowerCase();
  if (floor !== undefined) filter.floor = Number(floor);
  if (isActive !== undefined) filter.isActive = isActive === "true";

  const slots = await ParkingSlot.find(filter)
    .sort({ slotNumber: 1 })
    .lean();

  if (!hasFilters) {
    await setSlotsCache(lotId, slots);
  }

  return { slots };
};

// GET SLOT BY ID
const getSlotById = async (slotId) => {
  if (!mongoose.Types.ObjectId.isValid(slotId)) {
    const error = new Error("Invalid slot ID");
    error.statusCode = 400;
    throw error;
  }

  const slot = await ParkingSlot.findById(slotId)
    .populate("lotId", "name city address pricePerHour")
    .lean();

  if (!slot) {
    const error = new Error("Slot not found.");
    error.statusCode = 404;
    throw error;
  }

  return slot;
};

// UPDATE SLOT
const updateSlot = async (slotId, updates, requestingUser) => {
  if (!mongoose.Types.ObjectId.isValid(slotId)) {
    const error = new Error("Invalid slot ID");
    error.statusCode = 400;
    throw error;
  }

  const slot = await ParkingSlot.findById(slotId).lean();
  if (!slot) {
    const error = new Error("Slot not found.");
    error.statusCode = 404;
    throw error;
  }

  await verifyManagerOwnership(slot.lotId, requestingUser);

  // Prevent moving slot
  delete updates.lotId;

  const updatedSlot = await ParkingSlot.findByIdAndUpdate(
    slotId,
    updates,
    {
      new: true,
      runValidators: true,
    }
  ).lean();

  await invalidateSlotsCache(slot.lotId);

  return updatedSlot;
};

// DELETE SLOT
const deleteSlot = async (slotId, requestingUser) => {
  if (!mongoose.Types.ObjectId.isValid(slotId)) {
    const error = new Error("Invalid slot ID");
    error.statusCode = 400;
    throw error;
  }

  const slot = await ParkingSlot.findById(slotId).lean();
  if (!slot) {
    const error = new Error("Slot not found.");
    error.statusCode = 404;
    throw error;
  }

  await verifyManagerOwnership(slot.lotId, requestingUser);

  await ParkingSlot.findByIdAndDelete(slotId);

  await invalidateSlotsCache(slot.lotId);

  return slot;
};

module.exports = {
  createSlot,
  getSlotsByLot,
  getSlotById,
  updateSlot,
  deleteSlot,
};
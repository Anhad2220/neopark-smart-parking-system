const parkingService = require("../services/parking.service");
const { sendSuccess } = require("../utils/apiResponse");
const Slot = require("../models/ParkingSlot"); // 1. ADD THIS IMPORT

// CREATE
const createParkingLot = async (req, res, next) => {
  try {
    const lot = await parkingService.createParkingLot(req.body);
    return sendSuccess(res, "Parking lot created successfully.", lot, 201);
  } catch (error) {
    next(error);
  }
};

// GET ALL
const getAllParkingLots = async (req, res, next) => {
  try {
    const result = await parkingService.getAllParkingLots(req.query);
    return sendSuccess(res, "Parking lots fetched.", result);
  } catch (error) {
    next(error);
  }
};

// GET BY ID
const getParkingLotById = async (req, res, next) => {
  try {
    const lot = await parkingService.getParkingLotById(req.params.id);
    return sendSuccess(res, "Parking lot fetched.", lot);
  } catch (error) {
    next(error);
  }
};

// 2. ADD THIS NEW FUNCTION
// GET SLOTS FOR A SPECIFIC PARKING LOT
const getSlotsForParkingLot = async (req, res, next) => {
  try {
    const parkingId = req.params.id;
    
    // We explicitly select 'type' and 'slotNumber' to ensure the UI icons work
    const slots = await Slot.find({ lotId: parkingId })
      .select("slotNumber status type floor isActive") 
      .sort({ slotNumber: 1 }); // Keeps the grid ordered (A-01, A-02...)

    return sendSuccess(res, "Slots fetched successfully.", { slots });
  } catch (error) {
    next(error);
  }
};

// UPDATE
const updateParkingLot = async (req, res, next) => {
  try {
    const lotId = req.params.id;
    const updates = req.body;
    
    // Pass req.user so the service can check if the manager owns the lot
    const updatedLot = await parkingService.updateParkingLot(lotId, updates, req.user);

    return res.status(200).json({
      success: true,
      message: "Parking lot updated successfully.",
      data: updatedLot
    });
  } catch (error) {
    next(error);
  }
};

// DELETE
const deleteParkingLot = async (req, res, next) => {
  try {
    await parkingService.deleteParkingLot(req.params.id);
    return sendSuccess(res, "Parking lot deleted successfully.");
  } catch (error) {
    next(error);
  }
};

const batchUpdateSlotTypes = async (req, res, next) => {
  try {
    const { slotIds, type } = req.body; // e.g., { slotIds: ["ID1", "ID2"], type: "ev" }

    if (!['regular', 'ev', 'handicap'].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid slot type." });
    }

    await Slot.updateMany(
      { _id: { $in: slotIds } },
      { $set: { type: type } }
    );

    return sendSuccess(res, `Updated ${slotIds.length} slots to ${type}.`);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createParkingLot,
  getAllParkingLots,
  getParkingLotById,
  batchUpdateSlotTypes, // 4. ADD TO EXPORTS
  updateParkingLot,
  deleteParkingLot,
  getSlotsForParkingLot, // 3. ADD TO EXPORTS
};
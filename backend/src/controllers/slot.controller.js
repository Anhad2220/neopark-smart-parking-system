const slotService = require("../services/slot.service");
const { sendSuccess } = require("../utils/apiResponse");

/**
 * Slot Controller
 * ────────────────
 * Thin layer — extract from req, call service, send response.
 * Note: req.user is passed to service functions that need RBAC
 * ownership checks (create, update, delete).
 */

// POST /api/slots
const createSlot = async (req, res, next) => {
  try {
    const slot = await slotService.createSlot(req.body, req.user);
    return sendSuccess(res, "Slot created successfully.", slot, 201);
  } catch (error) {
    next(error);
  }
};

// GET /api/slots/lot/:lotId
const getSlotsByLot = async (req, res, next) => {
  try {
    // req.query carries optional filters: ?type=EV&floor=2&isActive=true
    const result = await slotService.getSlotsByLot(req.params.lotId, req.query);
    return sendSuccess(res, "Slots fetched.", result);
  } catch (error) {
    next(error);
  }
};

// GET /api/slots/:id
const getSlotById = async (req, res, next) => {
  try {
    const slot = await slotService.getSlotById(req.params.id);
    return sendSuccess(res, "Slot fetched.", slot);
  } catch (error) {
    next(error);
  }
};

// PUT /api/slots/:id
const updateSlot = async (req, res, next) => {
  try {
    const slot = await slotService.updateSlot(req.params.id, req.body, req.user);
    return sendSuccess(res, "Slot updated.", slot);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/slots/:id
const deleteSlot = async (req, res, next) => {
  try {
    await slotService.deleteSlot(req.params.id, req.user);
    return sendSuccess(res, "Slot deleted successfully.");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSlot,
  getSlotsByLot,
  getSlotById,
  updateSlot,
  deleteSlot,
};

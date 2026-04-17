const express = require("express");
const router  = express.Router();

const slotController = require("../controllers/slot.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const roleMiddleware = require("../middlewares/role.middleware");

/**
 * Slot Routes
 * ────────────
 *
 * Access matrix:
 * ┌───────────────────────────┬────────────────────────────────────┐
 * │ Route                     │ Who                                │
 * ├───────────────────────────┼────────────────────────────────────┤
 * │ POST   /api/slots         │ admin, parking_manager             │
 * │ GET    /api/slots/lot/:id │ public                             │
 * │ GET    /api/slots/:id     │ public                             │
 * │ PUT    /api/slots/:id     │ admin, parking_manager             │
 * │ DELETE /api/slots/:id     │ admin, parking_manager             │
 * └───────────────────────────┴────────────────────────────────────┘
 *
 * Route ordering matters:
 *   /lot/:lotId must be declared BEFORE /:id
 *   If /:id comes first, Express matches "lot" as the :id param
 *   and getSlotById("lot") is called — wrong handler, wrong result.
 */

// ── Public routes ─────────────────────────────────────────────────
router.get("/lot/:lotId", slotController.getSlotsByLot);
router.get("/:id",        slotController.getSlotById);

// ── Admin + Manager routes ────────────────────────────────────────
// Ownership check (manager can only touch their own lot's slots)
// is enforced inside the service — not here at the route level.
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin", "parking_manager"),
  slotController.createSlot
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "parking_manager"),
  slotController.updateSlot
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "parking_manager"),
  slotController.deleteSlot
);

module.exports = router;

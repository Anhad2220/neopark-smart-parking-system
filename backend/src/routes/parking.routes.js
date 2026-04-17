const express = require("express");
const router  = express.Router();

const parkingController = require("../controllers/parking.controller");
const authMiddleware    = require("../middlewares/auth.middleware");
const roleMiddleware    = require("../middlewares/role.middleware");

console.log("Controller:", parkingController);
console.log("Parking routes loaded");

/**
 * Parking Lot Routes
 * ───────────────────
 *
 * Access matrix:
 * ┌─────────────────────┬──────────────────────────────┐
 * │ Route               │ Who can access               │
 * ├─────────────────────┼──────────────────────────────┤
 * │ POST   /            │ admin only                   │
 * │ GET    /            │ public (no auth needed)      │
 * │ GET    /:id         │ public (no auth needed)      │
 * │ GET    /:id/slots   │ public (no auth needed)      │ <-- NEW
 * │ PUT    /:id         │ admin OR assigned manager    │
 * │ DELETE /:id         │ admin only                   │
 * └─────────────────────┴──────────────────────────────┘
 *
 * Note on PUT ownership:
 * Both admin and parking_manager can call PUT /:id,
 * but the service layer rejects a manager who tries to
 * update a lot they are NOT assigned to.
 */

// ─── Public routes — no middleware needed ─────────────────────────────────────
router.get("/",    parkingController.getAllParkingLots);
router.get("/:id", parkingController.getParkingLotById);

// NEW: Fetch all slots for a specific parking lot (Populates the Map Grid)
router.get("/:id/slots", parkingController.getSlotsForParkingLot);


// ─── Protected Routes ─────────────────────────────────────────────────────────

// Admin only
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  parkingController.createParkingLot
);

// Admin OR parking_manager (ownership checked inside service)
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin", "parking_manager"),
  parkingController.updateParkingLot
);

// Admin only
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  parkingController.deleteParkingLot
);

module.exports = router;
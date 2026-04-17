const express = require("express");
const router  = express.Router();

const bookingController = require("../controllers/booking.controller");
const authMiddleware    = require("../middlewares/auth.middleware");
const roleMiddleware    = require("../middlewares/role.middleware");

/**
 * Booking Routes
 * ───────────────
 *
 * All booking routes require authentication —
 * there are no public booking endpoints.
 *
 * Access matrix:
 * ┌────────────────────────────┬────────────────────────────────┐
 * │ Route                      │ Who                            │
 * ├────────────────────────────┼────────────────────────────────┤
 * │ POST   /api/bookings       │ any authenticated user         │
 * │ GET    /api/bookings/my    │ any authenticated user         │
 * │ PUT    /api/bookings/:id/  │ booking owner OR admin         │
 * │        cancel              │ (enforced in service)          │
 * └────────────────────────────┴────────────────────────────────┘
 *
 * Route ordering note:
 *   /my must be declared BEFORE /:id
 *   Otherwise Express matches "my" as the :id param value.
 */

// 1. Apply middleware to ALL routes in this file once
router.use(authMiddleware);

// 2. Specific static routes (User's own bookings)
router.get("/my", bookingController.getUserBookings);

// 3. Admin-only general route (All system bookings)
router.get("/", roleMiddleware("admin"), bookingController.getAllBookings);

// 4. Action routes
router.post("/", bookingController.createBooking);
router.put("/:id/cancel", bookingController.cancelBooking);

module.exports = router;

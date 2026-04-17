const bookingService = require("../services/booking.service");
const { sendSuccess } = require("../utils/apiResponse");

/**
 * Booking Controller
 * ───────────────────
 * Thin layer — extract from req, delegate to service, return response.
 *
 * Note: req.user is passed directly to service functions
 * that need to enforce ownership rules (cancel) or record
 * the booking owner (create).
 */

// POST /api/bookings
const createBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.createBooking(req.body, req.user.id);
    return sendSuccess(res, "Booking created successfully.", booking, 201);
  } catch (error) {
    next(error);
  }
};

// src/controllers/booking.controller.js
const getUserBookings = async (req, res, next) => {
  try {
    const result = await bookingService.getUserBookings(req.user.id, req.query);
    
    // Instead of sending the whole 'result' object, 
    // send the bookings array directly as the main data
    return res.status(200).json({
      success: true,
      message: "Bookings fetched.",
      data: result.bookings, // This makes it an array again
      total: result.total
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/bookings/:id/cancel
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.cancelBooking(req.params.id, req.user);
    return sendSuccess(res, "Booking cancelled.", booking);
  } catch (error) {
    next(error);
  }
};

// GET /api/bookings (Admin Only)
const getAllBookings = async (req, res, next) => {
  try {
    // 1. Get the data from your service
    const result = await bookingService.getAllBookings(req.query);

    // 2. Send it back in a way the Frontend extractList can find it
    return res.status(200).json({
      success: true,
      message: "All bookings fetched successfully",
      data: result.bookings,    // Your frontend looks for "data"
      bookings: result.bookings, // Your frontend looks for "bookings"
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createBooking, getUserBookings, cancelBooking, getAllBookings };

console.log("Worker file loaded");
const { bookingQueue, JOB_TYPES } = require("../booking.queue");
const Booking = require("../../models/Booking");
const { emitSlotUpdate } = require("../../config/socket");

/**
 * Booking Worker — src/queues/workers/booking.worker.js
 * ───────────────────────────────────────────────────────
 * Processes all jobs from the bookingQueue.
 *
 * This file is the "consumer" side of the queue.
 * booking.service.js is the "producer" — it adds jobs.
 * This worker picks them up and runs the actual task.
 *
 * Workers run in the SAME Node.js process as the server here
 * (started from server.js). In production, workers would run
 * as a separate process to isolate failures and scale independently.
 *
 * How Bull job processing works:
 *   bookingQueue.process() registers a handler function.
 *   Bull calls this handler for every job that enters the queue.
 *   If the handler throws → job is marked "failed" → Bull retries.
 *   If the handler resolves → job is marked "completed".
 */

// ─── Job Router ───────────────────────────────────────────────────────────────
// One process() call handles ALL job types from this queue.
// We read job.data.type and route to the right handler.

bookingQueue.process(async (job) => {
  try {
    const { type, data } = job.data;
    const { bookingId } = data;

    console.log(`[Worker] Processing ${type} for booking ${bookingId}`);

    switch (type) {
      case JOB_TYPES.BOOKING_CONFIRMATION:
        await handleBookingConfirmation(data);
        break;

      case JOB_TYPES.AUTO_CANCEL:
        await handleAutoCancel(data);
        break;

      default:
        console.warn(`Unknown job type: ${type}`);
    }

  } catch (err) {
    console.error(`[Worker] Job failed: ${err.message}`);
    throw err;
  }
});

// ─── Handler: BOOKING_CONFIRMATION ───────────────────────────────────────────

/**
 * handleBookingConfirmation
 * ──────────────────────────
 * Triggered immediately after a booking is created.
 * In production: send confirmation email / SMS to the user.
 * Here: simulate with a console.log.
 *
 * We fetch the booking from DB (instead of passing full data in the job)
 * so the email always reflects the current state — not a snapshot from
 * the moment the job was enqueued.
 */
const handleBookingConfirmation = async ({ bookingId }) => {
  // Populate user + slot + lot so we have everything for the "email"
  const booking = await Booking.findById(bookingId)
    .populate("userId",  "name email")
    .populate("slotId",  "slotNumber type")
    .populate("lotId",   "name address city").lean();

  if (!booking) {
    // Booking was deleted between enqueue and processing — skip silently
    console.warn(`[Worker] BOOKING_CONFIRMATION — booking ${bookingId} not found, skipping.`);
    return;
  }

  // ── Simulated email (replace with Nodemailer in production) ──────
  console.log("─────────────────────────────────────────────────");
  console.log("[Worker] 📧 BOOKING CONFIRMATION EMAIL SENT");
  console.log(`  To       : ${booking.userId.email} (${booking.userId.name})`);
  console.log(`  Lot      : ${booking.lotId.name}, ${booking.lotId.city}`);
  console.log(`  Slot     : ${booking.slotId.slotNumber} (${booking.slotId.type})`);
  console.log(`  From     : ${booking.startTime.toISOString()}`);
  console.log(`  To       : ${booking.endTime.toISOString()}`);
  console.log(`  Amount   : ₹${booking.amount}`);
  console.log(`  Booking  : ${booking._id}`);
  console.log("─────────────────────────────────────────────────");
};

// ─── Handler: AUTO_CANCEL ─────────────────────────────────────────────────────

/**
 * handleAutoCancel
 * ─────────────────
 * Triggered after a 10-minute delay from booking creation.
 * Purpose: if a booking exists but the user never checked in,
 * auto-cancel it to free up the slot.
 *
 * Real-world extension: In Step 7 (Sockets), this would also
 * emit a "slot:available" event to notify browsing users.
 *
 * Guard condition: only cancel if still "active".
 * The user may have already completed or cancelled manually —
 * in that case, this job should be a no-op.
 */
const handleAutoCancel = async ({ bookingId }) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    console.warn(`[Worker] AUTO_CANCEL — booking ${bookingId} not found, skipping.`);
    return;
  }

  // Guard: only act on still-active bookings
  if (booking.status !== "active") {
    console.log(
      `[Worker] AUTO_CANCEL — booking ${bookingId} already "${booking.status}", no action needed.`
    );
    return;
  }

  // Cancel the booking
  booking.status = "cancelled";
  await booking.save();


  emitSlotUpdate(booking.lotId, booking.slotId, "available");

  console.log("─────────────────────────────────────────────────");
  console.log("[Worker] ⏰ AUTO-CANCEL EXECUTED");
  console.log(`  Booking  : ${bookingId}`);
  console.log(`  Reason   : No check-in within 15 minutes`);
  console.log(`  Status   : active → cancelled`);
  console.log("─────────────────────────────────────────────────");
};

// ─── Worker-level error handler ───────────────────────────────────────────────
// Catches unexpected errors thrown inside the process() handler
// that weren't caught by individual job handlers.
bookingQueue.on("error", (err) => {
  console.error(`[Worker] Queue error: ${err.message}`);
});

console.log("[Worker] Booking worker started — listening for jobs...");

module.exports = {}; // nothing to export — worker registers itself on require()

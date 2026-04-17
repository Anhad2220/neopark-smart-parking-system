const Bull = require("bull");

/**
 * Booking Queue — src/queues/booking.queue.js
 * ─────────────────────────────────────────────
 * Central Bull queue for all booking-related background jobs.
 *
 * Why a single queue with multiple job types vs. separate queues?
 *   → For an MCA-level project, one queue keeps things simple.
 *   → The job type constant (JOB_TYPES) acts as a routing key
 *     inside the worker — each type gets its own handler.
 *   → In production you'd split into separate queues per concern,
 *     but that's unnecessary complexity here.
 *
 * Bull uses Redis internally to:
 *   - Persist jobs so they survive server restarts
 *   - Track job state: waiting → active → completed / failed
 *   - Handle retries automatically on failure
 *   - Schedule delayed jobs (AUTO_CANCEL after 10 minutes)
 */

// ─── Job Type Constants ───────────────────────────────────────────────────────
// Using constants instead of raw strings prevents typos:
//   "BOOKING_CONFIRMAION" vs "BOOKING_CONFIRMATION" — silent bug with strings
// With constants, a typo is a ReferenceError caught immediately.

const JOB_TYPES = {
  BOOKING_CONFIRMATION: "BOOKING_CONFIRMATION",
  AUTO_CANCEL:          "AUTO_CANCEL",
};

// ─── Queue Setup ──────────────────────────────────────────────────────────────
// Bull needs a Redis connection separate from our app's redisClient.
// Reason: Bull internally creates multiple Redis connections
// (one for adding jobs, one for processing, one for pub/sub events).
// Sharing our single redisClient with Bull would cause connection conflicts.

const bookingQueue = new Bull("bookingQueue", {
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || "neopark_redis_123",
    db: 1
  },

  // Default job options applied to every job unless overridden
  defaultJobOptions: {
    attempts:    3,                // retry up to 3 times on failure
    backoff: {
      type:  "exponential",        // wait 2s, then 4s, then 8s between retries
      delay: 2000,
    },
    removeOnComplete: 50,          // keep last 50 completed jobs for inspection
    removeOnFail:     100,         // keep last 100 failed jobs for debugging
  },
});

// ─── Queue Event Listeners (for visibility / debugging) ───────────────────────

bookingQueue.on("completed", (job) => {
  console.log(`[Queue] Job completed — type: ${job.data.type}, id: ${job.id}`);
});

bookingQueue.on("failed", (job, err) => {
  console.error(
    `[Queue] Job failed — type: ${job.data.type}, id: ${job.id}, error: ${err.message}`
  );
});

bookingQueue.on("stalled", (job) => {
  // A stalled job is one where the worker crashed mid-processing.
  // Bull automatically re-queues stalled jobs — this log just makes it visible.
  console.warn(`[Queue] Job stalled (will retry) — id: ${job.id}`);
});

module.exports = { bookingQueue, JOB_TYPES };

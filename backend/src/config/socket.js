const { Server } = require("socket.io");

/**
 * Socket.io Config — src/config/socket.js
 * -----------------------------------------
 * Single responsibility: initialise the Socket.io server,
 * manage client rooms, and export two things:
 *
 *   initSocket(httpServer) -> call once in server.js at startup
 *   getIO()               -> call anywhere to emit events
 *   emitSlotUpdate()      -> helper to broadcast slot status changes
 *
 * Room strategy:
 *   lot:{lotId}   -> all clients browsing a parking lot
 *   user:{userId} -> a single user's private room
 *
 * Why a module-level `io` variable?
 *   Services and workers need to emit events without having io
 *   passed through every function call. Storing io here and
 *   exporting getIO() gives any module direct access via one import.
 */

let io = null;

// --- Initialisation ----------------------------------------------------------

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin:  process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected    — id: ${socket.id}`);

    // Client joins a lot room when browsing its detail/slot page.
    // All slot:update events for this lot are delivered here automatically.
    socket.on("join:lot", ({ lotId }) => {
      if (!lotId) return;
      socket.join(`lot:${lotId}`);
      console.log(`[Socket] ${socket.id} joined room  lot:${lotId}`);
    });

    // Client leaves a lot room when navigating away — keeps membership clean.
    socket.on("leave:lot", ({ lotId }) => {
      if (!lotId) return;
      socket.leave(`lot:${lotId}`);
      console.log(`[Socket] ${socket.id} left  room  lot:${lotId}`);
    });

    // Personal room — used for private events like booking confirmation.
    socket.on("join:user", ({ userId }) => {
      if (!userId) return;
      socket.join(`user:${userId}`);
      console.log(`[Socket] ${socket.id} joined room  user:${userId}`);
    });

    // Socket.io removes the socket from all rooms on disconnect automatically.
    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Client disconnected — id: ${socket.id}, reason: ${reason}`);
    });
  });

  console.log("[Socket] Socket.io server initialised");
  return io;
};

// --- Accessor ----------------------------------------------------------------

/**
 * getIO
 * ------
 * Returns the live io instance.
 * Throws clearly if called before initSocket() so failures are never silent.
 */
const getIO = () => {
  if (!io) {
    throw new Error("[Socket] getIO() called before initSocket(). Check server.js startup order.");
  }
  return io;
};

// --- Emit Helpers ------------------------------------------------------------

/**
 * emitSlotUpdate
 * ---------------
 * Broadcasts a slot status change to every client in the lot room.
 *
 * Event  : "slot:update"
 * Payload: { slotId, lotId, status }
 *
 * status values:
 *   "booked"    -> slot just reserved  (frontend disables/hides it)
 *   "available" -> slot just freed     (frontend re-enables it)
 *
 * Errors are swallowed intentionally:
 *   A missed real-time update is a UX issue, not a data error.
 *   The booking/cancellation is already written to MongoDB before this runs.
 *
 * @param {string|ObjectId} lotId
 * @param {string|ObjectId} slotId
 * @param {"booked"|"available"} status
 */
const emitSlotUpdate = (lotId, slotId, status) => {
  try {
    const ioInstance = getIO();
    ioInstance.to(`lot:${lotId}`).emit("slot:update", {
      slotId: slotId.toString(),
      lotId:  lotId.toString(),
      status,
    });
    console.log(`[Socket] slot:update emitted  room:lot:${lotId}  slot:${slotId}  status:${status}`);
  } catch (err) {
    console.warn(`[Socket] emitSlotUpdate failed: ${err.message}`);
  }
};

module.exports = { initSocket, getIO, emitSlotUpdate };

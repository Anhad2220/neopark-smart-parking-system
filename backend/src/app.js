const express = require("express");
const cors = require("cors");
const errorHandler = require("./middlewares/error.middleware");

// Route imports
const healthRoutes  = require("./routes/health.routes");
const authRoutes    = require("./routes/auth.routes");
const parkingRoutes = require("./routes/parking.routes");
const slotRoutes    = require("./routes/slot.routes");
const bookingRoutes = require("./routes/booking.routes");

const app = express();

// ─── Core Middlewares ────────────────────────────────────────────────────────

// Parse incoming JSON request bodies
app.use(express.json());

// CORS — allows the frontend (React/other) to talk to this API
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true, // Allows cookies/auth headers to be sent
  })
);

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use("/api/health",  healthRoutes);
app.use("/api/auth",    authRoutes);
app.use("/api/parking", parkingRoutes);
app.use("/api/slots",   slotRoutes);
app.use("/api/bookings",bookingRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
// Catches requests to routes that don't exist
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
// Must be registered LAST — after all routes
app.use(errorHandler);

module.exports = app;

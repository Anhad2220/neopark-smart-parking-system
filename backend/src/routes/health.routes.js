const express = require("express");
const router = express.Router();

/**
 * GET /api/health
 * Simple health check — used to verify the server is running.
 * Useful for deployment checks and monitoring tools.
 */
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "NeoPark server is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

module.exports = router;

require("dotenv").config(); // Must be first — loads .env before anything else reads it

const http = require("http");
const app = require("./src/app");
const connectDB = require("./src/config/db");
const redisClient = require("./src/config/redis");
const { initSocket } = require("./src/config/socket");

const PORT = process.env.PORT || 5000;

// ─── Bootstrap Function ───────────────────────────────────────────────────────
// We use an async function so we can await DB/Redis connections before
// starting the server. If either fails, the app won't start.

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Connect to Redis
    await redisClient.connect();

    // 3. Create the HTTP server from the Express app
    //    We need a raw http.Server (not just app.listen) because
    //    Socket.io must attach to the HTTP server — not Express directly
    const httpServer = http.createServer(app);

    // 4. Initialize Socket.io on top of the HTTP server
    initSocket(httpServer);

    // 5. Start the Bull worker
    //    Requiring the worker file is enough — it self-registers
    //    by calling bookingQueue.process() on load.
    //    Must start AFTER Redis is connected (step 2).
   // 5. Start the Bull worker
try {
  require("./src/queues/workers/booking.worker.js");
  console.log("✅ Worker required successfully");
} catch (err) {
  console.error("❌ Worker load failed:", err.message);
}

    // 6. Start listening
    httpServer.listen(PORT, () => {
      console.log(`\n NeoPark server running on port ${PORT}`);
      console.log(` Environment : ${process.env.NODE_ENV || "development"}`);
      console.log(` Health check: http://localhost:${PORT}/api/health\n`);
    });

  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();

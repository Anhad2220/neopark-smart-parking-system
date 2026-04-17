const redisClient = require("../config/redis");

// Acquire lock
const acquireLock = async (key, ttl = 5000) => {
  const value = `${Date.now()}-${Math.random()}`;

  const result = await redisClient.set(key, value, "NX", "PX", ttl);

  if (result === "OK") {
    return value; // return lock owner
  }

  return null;
};

// Release lock safely
const releaseLock = async (key, value) => {
  try {
    const current = await redisClient.get(key);

    if (current === value) {
      await redisClient.del(key);
    }
  } catch (err) {
    console.warn(`[Lock] Release failed: ${err.message}`);
  }
};

module.exports = {
  acquireLock,
  releaseLock,
};
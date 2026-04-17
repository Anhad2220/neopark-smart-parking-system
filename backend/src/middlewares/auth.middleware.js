const jwt = require("jsonwebtoken");
const redisClient = require("../config/redis");
const { sendError } = require("../utils/apiResponse");

/**
 * authMiddleware
 * ──────────────
 * Protects routes by verifying the JWT token sent in the
 * Authorization header: "Bearer <token>"
 *
 * Flow:
 *  1. Extract token from header
 *  2. Check if token is blacklisted in Redis (logged out tokens)
 *  3. Verify the token signature using JWT_SECRET
 *  4. Attach decoded user payload to req.user for downstream use
 */
const authMiddleware = async (req, res, next) => {
  try {
  // 1. Extract token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, "Access denied. No token provided.", 401);
  }

  const token = authHeader.split(" ")[1];

  // 2. Verify token FIRST
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // 3. Check Redis blacklist using jti
  const isBlacklisted = await redisClient.get(`blacklist:jti:${decoded.jti}`);
  if (isBlacklisted) {
    return sendError(res, "Token has been invalidated. Please login again.", 401);
  }

  // 4. Attach user
  req.user = decoded;
  req.token = token;

  next();
} catch (error) {
  if (error.name === "TokenExpiredError") {
    return sendError(res, "Token expired. Please login again.", 401);
  }
  return sendError(res, "Invalid token.", 401);
}
};

module.exports = authMiddleware;

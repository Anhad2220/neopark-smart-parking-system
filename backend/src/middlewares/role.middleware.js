const { sendError } = require("../utils/apiResponse");

/**
 * roleMiddleware
 * ──────────────
 * Used AFTER authMiddleware (req.user must already be set).
 * Restricts a route to only the specified roles.
 *
 * Usage in routes:
 *   router.post("/", authMiddleware, roleMiddleware("admin"), createLot);
 *   router.put("/:id", authMiddleware, roleMiddleware("admin", "parking_manager"), updateLot);
 */
const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, "Authentication required.", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Required role: ${allowedRoles.join(" or ")}.`,
        403
      );
    }

    next();
  };
};

module.exports = roleMiddleware;

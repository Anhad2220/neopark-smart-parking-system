const express = require("express");
const router = express.Router();
const authController  = require("../controllers/auth.controller");
const authMiddleware  = require("../middlewares/auth.middleware");

/**
 * Auth Routes
 * ───────────
 * Public:   register, login
 * Protected: logout, profile (require valid JWT)
 */

// Public routes
router.post("/register", authController.register);
router.post("/login",    authController.login);

// Protected routes — authMiddleware runs first
router.post("/logout",       authMiddleware, authController.logout);
router.get ("/profile",      authMiddleware, authController.getProfile);
router.put ("/profile",      authMiddleware, authController.updateProfile);

router.put ("/password",     authMiddleware, authController.updatePassword);

module.exports = router;

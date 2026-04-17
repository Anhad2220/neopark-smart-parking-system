const authService = require("../services/auth.service");
const { sendSuccess, sendError } = require("../utils/apiResponse");

/**
 * Auth Controller
 * ───────────────
 * Only job: extract data from req, call the service, send the response.
 * Zero business logic here. If something goes wrong in the service,
 * it throws an error — we catch it and pass it to next() for the
 * global error handler to process.
 */

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    const result = await authService.register({ name, email, password, phone });
    return sendSuccess(res, "Registration successful.", result, 201);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return sendSuccess(res, "Login successful.", result);
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    await authService.logout(req.token); // req.token set by authMiddleware
    return sendSuccess(res, "Logged out successfully.");
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/profile
const getProfile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    return sendSuccess(res, "Profile fetched.", user);
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user.id, req.body);
    return sendSuccess(res, "Profile updated.", user);
  } catch (error) {
    next(error);
  }
};

// PUT /api/auth/password
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // We pass req.user.id (from authMiddleware) and the passwords to the service
    await authService.updatePassword(req.user.id, { currentPassword, newPassword });
    
    return sendSuccess(res, "Password changed successfully.");
  } catch (error) {
    next(error);
  }
};

// Update your exports to include the new function
module.exports = { 
  register, 
  login, 
  logout, 
  getProfile, 
  updateProfile, 
  updatePassword // 👈 Add this
};

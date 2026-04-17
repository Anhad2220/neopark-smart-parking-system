const jwt = require("jsonwebtoken");
const User = require("../models/User");
const redisClient = require("../config/redis");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

/**
 * Auth Service
 * ────────────
 * Contains ALL business logic for authentication.
 * The controller just calls these functions — no logic lives in the controller.
 */

// ─── Helper: Sign a JWT ───────────────────────────────────────────────────────
const signToken = (user) => {
  return jwt.sign(
    {
      id:    user._id,
      email: user.email,
      role:  user.role,
      jti: crypto.randomUUID(),
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// ─── Register ─────────────────────────────────────────────────────────────────
const register = async ({ name, email, password, phone }) => {
  // Check if email already in use
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error("Email is already registered.");
    error.statusCode = 409; // Conflict
    throw error;
  }

  // Create user — password is hashed automatically via the pre-save hook
  const user = await User.create({ name, email, password, phone });

  const token = signToken(user);

  // Never return the password field
  user.password = undefined;

  return { token, user };
};

// ─── Login ────────────────────────────────────────────────────────────────────
const login = async ({ email, password }) => {
  // .select("+password") overrides the "select: false" on the schema
  // so we can compare the password here
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error("Your account has been deactivated.");
    error.statusCode = 403;
    throw error;
  }

  const token = signToken(user);
  user.password = undefined;

  return { token, user };
};

// ─── Logout ───────────────────────────────────────────────────────────────────
// JWTs can't be "deleted" — instead we blacklist the token in Redis
// until it naturally expires, so it can never be used again.
const logout = async (token) => {
  // Decode WITHOUT verifying (we just need the expiry time)
  const decoded = jwt.decode(token);

  if (decoded && decoded.exp) {
    const ttl = decoded.exp - Math.floor(Date.now() / 1000); // Seconds remaining
    if (ttl > 0) {
      // Store in Redis with the same TTL as the token's remaining lifetime
      await redisClient.setex(`blacklist:jti:${decoded.jti}`, ttl, "blacklisted");
    }
  }
};

// ─── Get Profile ──────────────────────────────────────────────────────────────
const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }
  return user;
};

// ─── Update Profile (FIXED) ──────────────────────────────────────────────────
const updateProfile = async (userId, updates) => {
  // 1. Whitelist the specific fields from the request body
  // We match these EXACTLY to your new Schema fields
  const allowedUpdates = { 
    name: updates.name, 
    phoneNumber: updates.phoneNumber, // Changed from phone to phoneNumber
    vehicleNumber: updates.vehicleNumber // Added this missing field
  };

  // 2. Remove undefined fields so we don't overwrite data with null
  Object.keys(allowedUpdates).forEach(
    key => allowedUpdates[key] === undefined && delete allowedUpdates[key]
  );

  const user = await User.findByIdAndUpdate(userId, allowedUpdates, {
    new: true,           // Returns the updated doc (CRITICAL for "restoring" data)
    runValidators: true, 
  }).select("-password"); // Security: don't return the password hash

  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

const updatePassword = async (userId, { currentPassword, newPassword }) => {
  // 1. Fetch user and explicitly include password field
  const user = await User.findById(userId).select("+password");
  
  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  // 2. Verify the current password matches
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    const error = new Error("The current password you entered is incorrect.");
    error.statusCode = 401;
    throw error;
  }

  // 3. Set the new password
  // This triggers the pre-save hook in your User model to hash the new password
  user.password = newPassword;
  await user.save();

  return { message: "Password updated successfully." };
};

module.exports = { 
  register, 
  login, 
  logout, 
  getProfile, 
  updateProfile, 
  updatePassword // 👈 Add this to exports
};
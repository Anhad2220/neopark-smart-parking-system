const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    // 👇 FIX 1: Match frontend key 'phoneNumber'
    phoneNumber: {
      type: String,
      trim: true,
      default: ""
    },
    // 👇 FIX 2: Add missing 'vehicleNumber' field
    vehicleNumber: {
      type: String,
      trim: true,
      default: ""
    },
    role: {
      type: String,
      enum: ["user", "admin", "parking_manager"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Pre-save Hook ────────────────────────────────────────────────────────────
// Runs automatically before every .save()
// Hashes the password only if it was newly set or changed
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ─── Instance Method ──────────────────────────────────────────────────────────
// Called on a user document: user.comparePassword(inputPassword)
userSchema.methods.comparePassword = async function (inputPassword) {
  return bcrypt.compare(inputPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);

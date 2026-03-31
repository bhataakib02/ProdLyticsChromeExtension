/**
 * User Model
 * Stores user account data with JWT and Google OAuth support
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
    {
        // Basic profile
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            maxlength: [100, "Name cannot exceed 100 characters"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
        },

        // Password (null for Google OAuth users)
        password: {
            type: String,
            minlength: [6, "Password must be at least 6 characters"],
            select: false, // never return password in queries by default
        },

        // Google OAuth
        googleId: { type: String, sparse: true },
        avatar: { type: String, default: "" },

        /** Created via POST /api/auth/anonymous (no sign-in). One row per browser / extension install. */
        isAnonymous: { type: Boolean, default: false },

        // User preferences
        preferences: {
            theme: { type: String, enum: ["light", "dark", "midnight"], default: "dark" },
            notifications: {
                focus: { type: Boolean, default: true },
                daily: { type: Boolean, default: true },
            },
            deepWorkMinutes: { type: Number, default: 25 },
            breakMinutes: { type: Number, default: 5 },
            weeklyGoalHours: { type: Number, default: 40 }, // hours of productive time per week
            // Focus Mode Advanced Settings
            strictMode: { type: Boolean, default: false },
            smartBlock: { type: Boolean, default: false },
            breakReminders: { type: Boolean, default: false },
        },

        // Account status
        isActive: { type: Boolean, default: true },
        lastSeen: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// ==================== HOOKS ====================

// Hash password before saving (Mongoose 9+: no next() — async middleware returns a Promise)
UserSchema.pre("save", async function () {
    if (!this.isModified("password") || !this.password) return;
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

// ==================== METHODS ====================

// Compare entered password with hashed password
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Return safe user object (no password)
UserSchema.methods.toSafeObject = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

export default mongoose.models.User || mongoose.model("User", UserSchema);

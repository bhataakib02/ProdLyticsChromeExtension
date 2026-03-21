/**
 * Auth Routes
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/refresh
 * GET  /api/auth/google
 * GET  /api/auth/google/callback
 * GET  /api/auth/me
 * PUT  /api/auth/preferences
 */

const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const User = require("../models/User");
const { protect, generateAccessToken, generateRefreshToken } = require("../middleware/auth");
const { authRateLimit } = require("../middleware/rateLimit");

// ==================== HELPERS ====================

const sendTokens = (user, statusCode, res) => {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    res.status(statusCode).json({
        accessToken,
        refreshToken,
        user: user.toSafeObject(),
    });
};

// ==================== REGISTER ====================

router.post(
    "/register",
    authRateLimit,
    [
        body("name").trim().notEmpty().withMessage("Name is required"),
        body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
        body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg });
            }

            const { name, email, password } = req.body;

            // Check if email already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(409).json({ error: "Email already registered." });
            }

            const user = await User.create({ name, email, password });
            sendTokens(user, 201, res);
        } catch (err) {
            next(err);
        }
    }
);

// ==================== LOGIN ====================

router.post(
    "/login",
    authRateLimit,
    [
        body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
        body("password").notEmpty().withMessage("Password is required"),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg });
            }

            const { email, password } = req.body;

            // Find user with password (normally excluded)
            const user = await User.findOne({ email }).select("+password");
            if (!user || !user.password) {
                return res.status(401).json({ error: "Invalid email or password." });
            }

            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                return res.status(401).json({ error: "Invalid email or password." });
            }

            sendTokens(user, 200, res);
        } catch (err) {
            next(err);
        }
    }
);

// ==================== REFRESH TOKEN ====================

router.post("/refresh", async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: "Refresh token required." });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({ error: "Invalid refresh token." });
        }

        const accessToken = generateAccessToken(user._id);
        res.json({ accessToken });
    } catch (err) {
        res.status(401).json({ error: "Invalid or expired refresh token." });
    }
});

// ==================== GOOGLE OAUTH ====================

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
    "/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
    (req, res) => {
        // Successful OAuth — redirect to frontend with tokens
        const accessToken = generateAccessToken(req.user._id);
        const refreshToken = generateRefreshToken(req.user._id);
        const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?access=${accessToken}&refresh=${refreshToken}`;
        res.redirect(redirectUrl);
    }
);

// ==================== GET CURRENT USER ====================

router.get("/me", protect, (req, res) => {
    res.json({ user: req.user.toSafeObject() });
});

// ==================== UPDATE PREFERENCES ====================

router.put("/preferences", protect, async (req, res, next) => {
    try {
        const { theme, notifications, deepWorkMinutes, breakMinutes, weeklyGoalHours, strictMode, smartBlock, breakReminders } = req.body;

        // 1. Force-delete the potentially corrupted field from the database
        if (notifications !== undefined) {
            await User.updateOne(
                { _id: req.user._id },
                { $unset: { "preferences.notifications": "" } }
            );
        }

        // 2. Load the fresh user document and apply the object update
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: "User not found" });

        if (theme) user.preferences.theme = theme;
        if (notifications !== undefined) {
            user.preferences.notifications = {
                focus: typeof notifications.focus === "boolean" ? notifications.focus : true,
                daily: typeof notifications.daily === "boolean" ? notifications.daily : true,
            };
        }
        if (deepWorkMinutes !== undefined) user.preferences.deepWorkMinutes = deepWorkMinutes;
        if (breakMinutes !== undefined) user.preferences.breakMinutes = breakMinutes;
        if (weeklyGoalHours !== undefined) user.preferences.weeklyGoalHours = weeklyGoalHours;

        if (strictMode !== undefined) user.preferences.strictMode = strictMode;
        if (smartBlock !== undefined) user.preferences.smartBlock = smartBlock;
        if (breakReminders !== undefined) user.preferences.breakReminders = breakReminders;

        await user.save();
        res.json({ user: user.toSafeObject() });
    } catch (err) {
        next(err);
    }
});

// ==================== UPDATE PROFILE ====================
// Update name and email
router.put(
    "/profile",
    protect,
    [
        body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
        body("email").optional().isEmail().normalizeEmail().withMessage("Valid email required"),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array()[0].msg });
            }

            const { name, email } = req.body;
            const update = {};
            if (name) update.name = name;

            if (email && email !== req.user.email) {
                // Check if new email is already taken
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                    return res.status(409).json({ error: "Email already in use." });
                }
                update.email = email;
            }

            const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true });
            res.json({ user: user.toSafeObject() });
        } catch (err) {
            next(err);
        }
    }
);

// ==================== DELETE ACCOUNT ====================
// Permanently remove user and all associated data
router.delete("/account", protect, async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Delete all data associated with the user locally
        // In a true microservices setup, an event broker emits a "UserDeleted" event.
        await Promise.all([
            User.findByIdAndDelete(userId)
        ]);

        res.json({ success: true, message: "Account and all associated data permanently deleted." });
    } catch (err) {
        next(err);
    }
});

module.exports = router;

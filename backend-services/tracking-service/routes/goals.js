/**
 * Goals Routes
 * GET  /api/goals        — get user goals
 * POST /api/goals        — create/update a goal (upsert by type)
 * PUT  /api/goals/:id    — update a specific goal by ID
 * DELETE /api/goals/:id   — delete a goal
 */

const express = require("express");
const router = express.Router();
const Goal = require("../models/Goal");
const Tracking = require("../models/Tracking");
const { protect } = require("../middleware/auth");

router.use(protect);

// GET all goals for user
router.get("/", async (req, res, next) => {
    try {
        const goals = await Goal.find({ userId: req.user._id, isActive: true });
        res.json(goals);
    } catch (err) {
        next(err);
    }
});

// CREATE or UPDATE a goal
router.post("/", async (req, res, next) => {
    try {
        const { type, website, targetSeconds, label, repeat } = req.body;
        if (!type || !targetSeconds) {
            return res.status(400).json({ error: "Type and target value are required." });
        }

        // Upsert logic for site-specific goals or unique types
        const query = { userId: req.user._id, type };
        if (website) query.website = website.toLowerCase();

        const goal = await Goal.findOneAndUpdate(
            query,
            { targetSeconds, label, repeat, isActive: true },
            { upsert: true, new: true }
        );

        res.json(goal);
    } catch (err) {
        next(err);
    }
});

// UPDATE a specific goal
router.put("/:id", async (req, res, next) => {
    try {
        const { type, website, targetSeconds, label, repeat, isActive } = req.body;
        const update = {};
        if (type) update.type = type;
        if (website !== undefined) update.website = website.toLowerCase();
        if (targetSeconds !== undefined) update.targetSeconds = targetSeconds;
        if (label !== undefined) update.label = label;
        if (repeat) update.repeat = repeat;
        if (isActive !== undefined) update.isActive = isActive;

        const goal = await Goal.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { $set: update },
            { new: true }
        );

        if (!goal) return res.status(404).json({ error: "Goal not found" });
        res.json(goal);
    } catch (err) {
        next(err);
    }
});

// DELETE a goal
router.delete("/:id", async (req, res, next) => {
    try {
        await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
});

// GET goals with real-time progress
router.get("/progress", async (req, res, next) => {
    try {
        const userId = req.user._id;
        const goals = await Goal.find({ userId, isActive: true });

        // Get start of today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Fetch tracking data for today
        const trackingData = await Tracking.find({
            userId,
            date: { $gte: startOfToday }
        });

        const goalsWithProgress = goals.map(goal => {
            let currentSeconds = 0;

            if (goal.type === "daily_productive_hours" || goal.type === "weekly_productive_hours" || goal.type === "productive") {
                // Sum all productive time
                currentSeconds = trackingData
                    .filter(t => t.category === "productive")
                    .reduce((sum, t) => sum + t.time, 0);
            } else if (goal.type === "unproductive") {
                // Sum all unproductive time
                currentSeconds = trackingData
                    .filter(t => t.category === "unproductive" || t.category === "distracting")
                    .reduce((sum, t) => sum + t.time, 0);
            } else if (goal.website) {
                // Sum time for specific website
                currentSeconds = trackingData
                    .filter(t => t.website.includes(goal.website.toLowerCase()))
                    .reduce((sum, t) => sum + t.time, 0);
            }

            const progress = Math.min(100, Math.round((currentSeconds / goal.targetSeconds) * 100));

            return {
                ...goal.toObject(),
                currentSeconds,
                progress
            };
        });

        res.json(goalsWithProgress);
    } catch (err) {
        next(err);
    }
});

module.exports = router;

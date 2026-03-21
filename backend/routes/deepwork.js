/**
 * Deep Work Routes
 * GET  /api/deepwork        — get session history
 * POST /api/deepwork/start  — start a new session
 * PUT  /api/deepwork/end    — complete/interrupt a session
 */

const express = require("express");
const router = express.Router();
const DeepWorkSession = require("../models/DeepWorkSession");
const { protect } = require("../middleware/auth");

router.use(protect);

// GET history
router.get("/", async (req, res, next) => {
    try {
        const history = await DeepWorkSession.find({ userId: req.user._id })
            .sort({ startedAt: -1 })
            .limit(50);
        res.json(history);
    } catch (err) {
        next(err);
    }
});

// START a session
router.post("/start", async (req, res, next) => {
    try {
        const { type, durationMinutes, task, website } = req.body;
        const session = await DeepWorkSession.create({
            userId: req.user._id,
            type: type || "work",
            durationMinutes: durationMinutes || 25,
            task,
            website,
            startedAt: new Date(),
        });
        res.status(201).json(session);
    } catch (err) {
        next(err);
    }
});

// END/UPDATE a session
router.put("/end/:id", async (req, res, next) => {
    try {
        const { completed, actualMinutes } = req.body;
        const session = await DeepWorkSession.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { completed, actualMinutes, endedAt: new Date() },
            { new: true }
        );
        res.json(session);
    } catch (err) {
        next(err);
    }
});

module.exports = router;

/**
 * Goal Model
 * Users can set daily/weekly productivity targets
 */

import mongoose from "mongoose";

const GoalSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: ["daily_productive_hours", "daily_limit_site", "weekly_productive_hours", "reduce_site", "productive", "unproductive"],
            required: true,
        },
        // For site-specific goals
        website: { type: String, required: true },

        // Target value (e.g., 4 hours = 14400 seconds, daily_limit = 1800 seconds)
        targetSeconds: { type: Number, required: true },

        // Human-readable label
        label: { type: String, default: "" },

        // Is this goal active?
        isActive: { type: Boolean, default: true },

        // Repeat pattern
        repeat: {
            type: String,
            enum: ["daily", "weekly", "once"],
            default: "daily",
        },
    },
    { timestamps: true }
);

GoalSchema.index({ userId: 1, isActive: 1 });

export default mongoose.models.Goal || mongoose.model("Goal", GoalSchema);

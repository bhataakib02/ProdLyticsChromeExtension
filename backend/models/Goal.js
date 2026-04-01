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
        // For site-specific goals (host only, lowercase)
        website: { type: String, required: true },
        /** Path prefix for URL-scoped goals (e.g. /watch). Empty = all paths on host count toward the goal. */
        pathPrefix: { type: String, default: "" },

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

        // Calendar day this goal was added for (YYYY-MM-DD, user tz). Empty = legacy “rolling” goal.
        dateKey: { type: String, default: "" },
    },
    { timestamps: true }
);

GoalSchema.index({ userId: 1, isActive: 1 });
GoalSchema.index({ userId: 1, dateKey: 1 });

export default mongoose.models.Goal || mongoose.model("Goal", GoalSchema);

/**
 * DeepWorkSession Model
 * Tracks each Deep Work work/break session
 */

import mongoose from "mongoose";

const DeepWorkSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: ["work", "short_break", "long_break"],
            default: "work",
        },
        durationMinutes: { type: Number, required: true }, // planned
        actualMinutes: { type: Number, default: 0 },       // actually completed
        completed: { type: Boolean, default: false },
        startedAt: { type: Date, default: Date.now },
        endedAt: { type: Date },

        // Optional: what was the user working on?
        task: { type: String, default: "" },

        subtasks: [
            {
                text: { type: String, default: "" },
                completed: { type: Boolean, default: false },
            },
        ],

        // Active website during this session
        website: { type: String, default: "" },
    },
    { timestamps: true }
);

DeepWorkSessionSchema.index({ userId: 1, startedAt: -1 });

export default mongoose.models.DeepWorkSession || mongoose.model("DeepWorkSession", DeepWorkSessionSchema);

/**
 * FocusBlock Model
 * Stores the user's focus mode blocklist
 */

import mongoose from "mongoose";

const FocusBlockSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        website: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        // Is this site currently being blocked?
        isActive: { type: Boolean, default: true },

        /** manual = user added in dashboard; smart_daily_cap = auto-added after unproductive time cap */
        source: {
            type: String,
            enum: ["manual", "smart_daily_cap"],
            default: "manual",
        },

        // Optional scheduled blocking (null = always block when focus mode is on)
        schedule: {
            startHour: { type: Number, min: 0, max: 23, default: null },
            endHour: { type: Number, min: 0, max: 23, default: null },
            days: [{ type: Number, min: 0, max: 6 }], // 0=Sun, 6=Sat
        },
    },
    { timestamps: true }
);

FocusBlockSchema.index({ userId: 1, website: 1 }, { unique: true });

export default mongoose.models.FocusBlock || mongoose.model("FocusBlock", FocusBlockSchema);

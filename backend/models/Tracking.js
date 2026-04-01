/**
 * Tracking Model
 * Stores individual browsing sessions per user
 */

import mongoose from "mongoose";

const TrackingSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        website: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        /** Normalized path only (leading slash, no query/hash). Empty = whole host / homepage bucket. */
        pathNorm: {
            type: String,
            default: "",
            trim: true,
            lowercase: true,
        },
        pageTitle: {
            type: String,
            default: "",
        },
        time: {
            type: Number, // seconds
            required: true,
            min: 0,
        },
        // AI-assigned or user-assigned category
        category: {
            type: String,
            enum: ["productive", "unproductive", "neutral"],
            default: "neutral",
        },
        // Was the category set by the AI or the user?
        categorySource: {
            type: String,
            enum: ["ai", "user", "default"],
            default: "default",
        },
        date: {
            type: Date,
            default: Date.now,
            index: true,
        },
        // Hour of day (0-23) for peak productivity analysis
        hour: {
            type: Number,
            min: 0,
            max: 23,
        },
        // Day of week (0=Sunday, 6=Saturday) for pattern analysis
        dayOfWeek: {
            type: Number,
            min: 0,
            max: 6,
        },
        // Engagement Metrics
        scrolls: {
            type: Number,
            default: 0,
        },
        clicks: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// Compound index for efficient user+date queries
TrackingSchema.index({ userId: 1, date: -1 });
TrackingSchema.index({ userId: 1, website: 1, date: -1 });
TrackingSchema.index({ userId: 1, website: 1, pathNorm: 1, date: -1 });

// Auto-fill hour and dayOfWeek before saving
TrackingSchema.pre("save", function () {
    const d = this.date || new Date();
    this.hour = d.getHours();
    this.dayOfWeek = d.getDay();
});

export default mongoose.models.Tracking || mongoose.model("Tracking", TrackingSchema);

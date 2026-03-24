/**
 * Category Model
 * Stores AI + user-defined website category classifications
 */

import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema(
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
        category: {
            type: String,
            enum: ["productive", "unproductive", "neutral"],
            default: "neutral",
        },
        // How was this category assigned?
        source: {
            type: String,
            enum: ["user", "ai", "default"],
            default: "default",
        },
        // AI confidence score (0-1)
        confidence: { type: Number, min: 0, max: 1, default: null },
        // Tags for the website (e.g., ["coding", "learning"])
        tags: [{ type: String }],
    },
    { timestamps: true }
);

// One category per website per user
CategorySchema.index({ userId: 1, website: 1 }, { unique: true });

export default mongoose.models.Category || mongoose.model("Category", CategorySchema);

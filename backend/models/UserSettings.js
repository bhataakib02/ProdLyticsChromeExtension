import mongoose from "mongoose";

const UserSettingsSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        goals: {
            dailyHours: { type: Number, default: 4, min: 0.5, max: 16 },
            enableGoalTracking: { type: Boolean, default: true },
            enableStreaks: { type: Boolean, default: true },
            enableDeepWorkTracking: { type: Boolean, default: true },
        },
        aiSettings: {
            enabled: { type: Boolean, default: true },
            predictive: { type: Boolean, default: true },
            suggestions: { type: Boolean, default: true },
            cognitiveLoad: { type: Boolean, default: true },
            frequency: { type: String, enum: ["daily", "weekly"], default: "daily" },
        },
        notifications: {
            browser: { type: Boolean, default: true },
            distractionAlerts: { type: Boolean, default: true },
            goalReminders: { type: Boolean, default: true },
            weeklyReports: { type: Boolean, default: true },
        },
        privacy: {
            trackingEnabled: { type: Boolean, default: true },
            pauseTrackingUntil: { type: Date, default: null },
        },
        appearance: {
            theme: { type: String, enum: ["light", "dark", "midnight"], default: "dark" },
            density: { type: String, enum: ["compact", "normal"], default: "normal" },
        },
        /** Read-only share link: weekly focus trend only (no URLs). Token issued when enabled. */
        partnerShare: {
            enabled: { type: Boolean, default: false },
            token: { type: String },
        },
    },
    { timestamps: true }
);

UserSettingsSchema.index(
    { "partnerShare.token": 1 },
    { 
        unique: true, 
        partialFilterExpression: { "partnerShare.token": { $type: "string" } } 
    }
);

export default mongoose.models.UserSettings || mongoose.model("UserSettings", UserSettingsSchema);

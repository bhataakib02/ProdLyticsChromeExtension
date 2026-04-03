import mongoose from 'mongoose';

const PreferenceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    strictMode: { type: Boolean, default: true },
    smartBlock: { type: Boolean, default: true },
    breakReminders: { type: Boolean, default: true },
    /** Minutes of focus before a break reminder (extension Flow Reminders) */
    focusSessionMinutes: { type: Number, default: 25, min: 5, max: 180 },
    /** Suggested break length shown in the reminder copy */
    breakSessionMinutes: { type: Number, default: 5, min: 1, max: 60 },
    /** Pomodoro / Deep Work timer (dashboard Timer tab) */
    deepWorkMinutes: { type: Number, default: 25, min: 1, max: 180 },
    breakMinutes: { type: Number, default: 5, min: 1, max: 60 },
    theme: { type: String, default: "dark" },
    /** Periodic gentle reminder (extension) to refocus — synced with dashboard prefs */
    productivityNudges: { type: Boolean, default: true },
    /** Pro: weekly summary email (preference stored; delivery pipeline hooks in later) */
    weeklyDigestEmail: { type: Boolean, default: false },
    /** Pro: web push for weekly digest */
    weeklyDigestPush: { type: Boolean, default: false },
    /** Pro: optional softer LLM phrasing on top of structured coach facts (off by default) */
    coachLlmPhrasing: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Preference || mongoose.model('Preference', PreferenceSchema);

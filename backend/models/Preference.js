import mongoose from 'mongoose';

const PreferenceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    strictMode: { type: Boolean, default: true },
    smartBlock: { type: Boolean, default: true },
    breakReminders: { type: Boolean, default: true },
    theme: { type: String, default: "dark" }
}, { timestamps: true });

export default mongoose.models.Preference || mongoose.model('Preference', PreferenceSchema);

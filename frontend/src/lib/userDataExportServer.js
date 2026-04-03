import Tracking from "../../../backend/models/Tracking.js";
import Goal from "../../../backend/models/Goal.js";
import DeepWorkSession from "../../../backend/models/DeepWorkSession.js";
import FocusBlock from "../../../backend/models/FocusBlock.js";
import Category from "../../../backend/models/Category.js";
import Preference from "../../../backend/models/Preference.js";
import Notification from "../../../backend/models/Notification.js";
import User from "../../../backend/models/User.js";

function pickBoolean(v) {
    return v === "1" || v === "true" || v === "yes";
}

/**
 * @param {import("mongoose").Types.ObjectId} userId
 * @param {{ includeRaw?: boolean, exportSource?: string }} opts
 */
export async function buildUserDataExportPayload(userId, opts = {}) {
    const includeRaw = Boolean(opts.includeRaw);
    const exportSource = opts.exportSource || "self_service";

    const [
        user,
        preference,
        trackingCount,
        goalCount,
        deepWorkCount,
        focusBlockCount,
        categoryCount,
        notificationCount,
        latestTracking,
        latestDeepWork,
    ] = await Promise.all([
        User.findById(userId).select("_id email name isAnonymous createdAt updatedAt").lean(),
        Preference.findOne({ userId }).lean(),
        Tracking.countDocuments({ userId }),
        Goal.countDocuments({ userId }),
        DeepWorkSession.countDocuments({ userId }),
        FocusBlock.countDocuments({ userId }),
        Category.countDocuments({ userId }),
        Notification.countDocuments({ userId }),
        Tracking.findOne({ userId }).sort({ date: -1 }).select("_id website pathNorm category time date").lean(),
        DeepWorkSession.findOne({ userId })
            .sort({ startedAt: -1 })
            .select("_id type durationMinutes actualMinutes completed startedAt endedAt")
            .lean(),
    ]);

    const response = {
        separationProof: {
            scopedBy: "userId",
            userId: String(userId),
            generatedAt: new Date().toISOString(),
            exportSource,
        },
        user: user
            ? {
                  id: String(user._id),
                  email: user.isAnonymous ? "" : user.email,
                  name: user.isAnonymous ? "ProdLytics user" : user.name,
                  isAnonymous: Boolean(user.isAnonymous),
                  createdAt: user.createdAt || null,
                  updatedAt: user.updatedAt || null,
              }
            : null,
        totals: {
            trackingRows: trackingCount,
            goals: goalCount,
            deepWorkSessions: deepWorkCount,
            focusBlocks: focusBlockCount,
            categories: categoryCount,
            notifications: notificationCount,
            hasPreferenceRow: Boolean(preference),
        },
        latest: {
            tracking: latestTracking || null,
            deepWorkSession: latestDeepWork || null,
        },
    };

    if (!includeRaw) return response;

    const [trackingRows, goals, deepWorkSessions, focusBlocks, categories, notifications] = await Promise.all([
        Tracking.find({ userId }).sort({ date: -1 }).limit(2000).lean(),
        Goal.find({ userId }).sort({ createdAt: -1 }).lean(),
        DeepWorkSession.find({ userId }).sort({ startedAt: -1 }).limit(1000).lean(),
        FocusBlock.find({ userId }).sort({ createdAt: -1 }).lean(),
        Category.find({ userId }).sort({ createdAt: -1 }).lean(),
        Notification.find({ userId }).sort({ createdAt: -1 }).limit(1000).lean(),
    ]);

    return {
        ...response,
        raw: {
            trackingRows,
            goals,
            deepWorkSessions,
            focusBlocks,
            categories,
            notifications,
            preference: preference || null,
        },
    };
}

export { pickBoolean };

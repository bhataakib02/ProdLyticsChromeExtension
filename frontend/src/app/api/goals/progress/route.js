import { NextResponse } from 'next/server';
import dbConnect, { isDbUnavailableError } from '../../../../../../backend/db/mongodb.js';
import Goal from '../../../../../../backend/models/Goal.js';
import Tracking from '../../../../../../backend/models/Tracking.js';
import { getUserIdFromRequest } from '@/lib/apiUser';
import { withCors } from '@/lib/cors';
import {
    matchUserCalendarDay,
    previousCalendarDateKey,
    todayDateKeyInTimezone,
} from '@/lib/trackingRangeServer';
import { normalizeStoredPathPrefix } from '@/lib/goalWebsiteSpec';

const HISTORY_MS = 730 * 24 * 60 * 60 * 1000;
const MAX_STREAK_WALK = 400;

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function goalTargetMet(goal, seconds) {
    const target = Number(goal.targetSeconds) || 0;
    const s = Number(seconds) || 0;
    if (target <= 0) return false;
    if (goal.type === "productive") return s >= target;
    if (goal.type === "unproductive") return s <= target;
    return false;
}

function goalHasPinnedDay(goal) {
    const dk = goal.dateKey;
    return dk != null && String(dk).trim() !== '';
}

function goalPathPrefix(goal) {
    return normalizeStoredPathPrefix(goal?.pathPrefix);
}

/** Only tracking at/after goal creation counts toward progress (same calendar day still applies). */
function goalProgressSince(goal) {
    const raw = goal?.createdAt;
    if (!raw) return null;
    const d = raw instanceof Date ? raw : new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
}

function matchGoalCreatedAt(goal) {
    const since = goalProgressSince(goal);
    return since ? { date: { $gte: since } } : {};
}

/** Empty pathPrefix → all paths on host (short-URL / domain-only objectives). */
function pathMatchForGoal(goal) {
    const px = goalPathPrefix(goal);
    if (!px) return {};
    return { pathNorm: new RegExp(`^${escapeRegex(px)}`, "i") };
}

async function sumSecondsForGoal(goal, userId, dayBaseMatch) {
    const pathPart = pathMatchForGoal(goal);
    if (goal.type === "productive") {
        const hasTargetSite = goal.website && goal.website.trim() !== "" && goal.website.trim() !== "*";
        /* Site-specific goals: count all time on that host (any category). Analytics may label
           e.g. wikipedia.org as neutral while the user still set a productive target for it. */
        const matchCondition = {
            ...dayBaseMatch,
            ...matchGoalCreatedAt(goal),
            ...(hasTargetSite
                ? {
                      website: new RegExp(escapeRegex(goal.website.trim()), "i"),
                      ...pathPart,
                  }
                : { category: "productive" }),
        };
        const stats = await Tracking.aggregate([
            { $match: matchCondition },
            { $group: { _id: null, total: { $sum: "$time" } } },
        ]);
        return stats[0]?.total || 0;
    }
    if (goal.type === "unproductive" && goal.website) {
        const stats = await Tracking.aggregate([
            {
                $match: {
                    ...dayBaseMatch,
                    ...matchGoalCreatedAt(goal),
                    website: new RegExp(escapeRegex(goal.website.trim()), "i"),
                    ...pathPart,
                },
            },
            { $group: { _id: null, total: { $sum: "$time" } } },
        ]);
        return stats[0]?.total || 0;
    }
    return 0;
}

function matchForGoalHistoryAggregate(goal, userId, dateFloor) {
    const since = goalProgressSince(goal);
    const floor = dateFloor instanceof Date ? dateFloor : new Date(dateFloor);
    const start = since && since > floor ? since : floor;
    const base = { userId, date: { $gte: start } };
    const pathPart = pathMatchForGoal(goal);
    if (goal.type === "productive") {
        const hasTargetSite = goal.website && goal.website.trim() !== "" && goal.website.trim() !== "*";
        return {
            ...base,
            ...(hasTargetSite
                ? {
                      website: new RegExp(escapeRegex(goal.website.trim()), "i"),
                      ...pathPart,
                  }
                : { category: "productive" }),
        };
    }
    if (goal.type === "unproductive" && goal.website) {
        return {
            ...base,
            website: new RegExp(escapeRegex(goal.website.trim()), "i"),
            ...pathPart,
        };
    }
    return null;
}

async function perDayTotalsForGoal(goal, userId, ianaTz, dateFloor) {
    const match = matchForGoalHistoryAggregate(goal, userId, dateFloor);
    if (!match) return [];
    return Tracking.aggregate([
        { $match: match },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: ianaTz } },
                total: { $sum: "$time" },
            },
        },
    ]);
}

function secondsForStreakDay(byDay, goal, d, todayKey, metToday) {
    if (byDay.has(d)) return byDay.get(d);
    if (d === todayKey && metToday && goal.type === "unproductive") return 0;
    if (goal.type === "unproductive") return null;
    return 0;
}

function hitStreakAndTotalDays(byDay, goal, todayKey, metToday) {
    let totalDaysHit = 0;
    for (const total of byDay.values()) {
        if (goalTargetMet(goal, total)) totalDaysHit++;
    }

    const yesterdayKey = previousCalendarDateKey(todayKey);
    let startKey = null;
    if (metToday) startKey = todayKey;
    else if (yesterdayKey) {
        const ySec = secondsForStreakDay(byDay, goal, yesterdayKey, todayKey, metToday);
        if (ySec !== null && goalTargetMet(goal, ySec)) startKey = yesterdayKey;
    }

    let hitStreakDays = 0;
    if (startKey) {
        let d = startKey;
        let n = 0;
        while (d && n < MAX_STREAK_WALK) {
            const seconds = secondsForStreakDay(byDay, goal, d, todayKey, metToday);
            if (seconds === null || !goalTargetMet(goal, seconds)) break;
            hitStreakDays++;
            d = previousCalendarDateKey(d);
            n++;
        }
    }

    return { hitStreakDays, totalDaysHit };
}

async function buildGoalProgressPayload(goal, userId, dayMatch, ctx) {
    const {
        todayKeyForStreak,
        streakTz,
        dateFloor,
        computeStreak,
        archiveDateKey,
        yesterdayBaseMatch,
        yesterdayKeyForStrip,
    } = ctx;
    const seconds = await sumSecondsForGoal(goal, userId, dayMatch);
    const rawPercent = goal.targetSeconds > 0 ? Math.round((seconds / goal.targetSeconds) * 100) : 0;
    const progress = Math.min(100, Math.max(0, rawPercent));
    const metToday = goalTargetMet(goal, seconds);

    let yesterdaySeconds = 0;
    let yesterdayProgress = 0;
    let metYesterday = false;
    let legacyYesterdayDateKey = null;
    if (!archiveDateKey && !goalHasPinnedDay(goal) && yesterdayBaseMatch && yesterdayKeyForStrip) {
        yesterdaySeconds = await sumSecondsForGoal(goal, userId, yesterdayBaseMatch);
        const rawY =
            goal.targetSeconds > 0 ? Math.round((yesterdaySeconds / goal.targetSeconds) * 100) : 0;
        yesterdayProgress = Math.min(100, Math.max(0, rawY));
        metYesterday = goalTargetMet(goal, yesterdaySeconds);
        legacyYesterdayDateKey = yesterdayKeyForStrip;
    }

    let hitStreakDays = 0;
    let totalDaysHit = 0;
    if (computeStreak) {
        const rows = await perDayTotalsForGoal(goal, userId, streakTz, dateFloor);
        const byDay = new Map(rows.filter((r) => r._id).map((r) => [r._id, Number(r.total) || 0]));
        const r = hitStreakAndTotalDays(byDay, goal, todayKeyForStreak, metToday);
        hitStreakDays = r.hitStreakDays;
        totalDaysHit = r.totalDaysHit;
    }

    return {
        ...goal.toObject(),
        currentSeconds: seconds,
        progress,
        metToday,
        metYesterday,
        yesterdaySeconds,
        yesterdayProgress,
        todayDateKey: todayKeyForStreak,
        yesterdayDateKey: legacyYesterdayDateKey,
        displayDateKey: archiveDateKey || todayKeyForStreak,
        isArchive: Boolean(archiveDateKey),
        hitStreakDays,
        totalDaysHit,
    };
}

export async function GET(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }

        const { searchParams } = new URL(req.url);
        const tz = searchParams.get("tz");
        const dateKey = searchParams.get("dateKey");

        const now = new Date();
        let todayBaseMatch;
        let yesterdayBaseMatch;

        if (tz && dateKey) {
            todayBaseMatch = matchUserCalendarDay(userId, tz, dateKey);
            const yKey = previousCalendarDateKey(dateKey);
            yesterdayBaseMatch = yKey
                ? matchUserCalendarDay(userId, tz, yKey)
                : { userId, time: { $lt: 0 } };
        } else {
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            todayBaseMatch = { userId, date: { $gte: startOfToday } };
            yesterdayBaseMatch = { userId, date: { $gte: startYesterday, $lt: startOfToday } };
        }

        const streakTz = tz || "UTC";
        const todayKeyForStreak = dateKey || todayDateKeyInTimezone(streakTz);
        const yesterdayKey = previousCalendarDateKey(todayKeyForStreak);
        const dateFloor = new Date(now.getTime() - HISTORY_MS);

        const all = await Goal.find({ userId, isActive: true });

        /* Today = only objectives explicitly created for this calendar day. No legacy “rolling” rows
           and no auto-carry from yesterday — user adds again or uses Copy from Yesterday. */
        const todayDocs = all.filter((g) => goalHasPinnedDay(g) && String(g.dateKey) === todayKeyForStreak);
        const yesterdayDocs = all.filter((g) => goalHasPinnedDay(g) && String(g.dateKey) === yesterdayKey);

        const ctxToday = {
            todayKeyForStreak,
            streakTz,
            dateFloor,
            computeStreak: true,
            archiveDateKey: null,
            yesterdayBaseMatch,
            yesterdayKeyForStrip: yesterdayKey || null,
        };
        const ctxArchive = {
            todayKeyForStreak,
            streakTz,
            dateFloor,
            computeStreak: false,
            archiveDateKey: yesterdayKey || null,
            yesterdayBaseMatch: null,
            yesterdayKeyForStrip: null,
        };

        const today = await Promise.all(
            todayDocs.map((g) => buildGoalProgressPayload(g, userId, todayBaseMatch, ctxToday))
        );
        const yesterday = await Promise.all(
            yesterdayDocs.map((g) => buildGoalProgressPayload(g, userId, yesterdayBaseMatch, ctxArchive))
        );

        const payload = {
            today,
            yesterday,
            todayDateKey: todayKeyForStreak,
            yesterdayDateKey: yesterdayKey || null,
        };

        return withCors(NextResponse.json(payload));
    } catch (err) {
        console.error("Goals Progress API Error:", err);
        if (isDbUnavailableError(err)) {
            return withCors(
                NextResponse.json({
                    today: [],
                    yesterday: [],
                    todayDateKey: null,
                    yesterdayDateKey: null,
                })
            );
        }
        return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

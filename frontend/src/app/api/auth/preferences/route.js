import { NextResponse } from 'next/server';
import { withCors, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
    return corsOptions();
}

import dbConnect, { isDbUnavailableError } from '../../../../../../backend/db/mongodb.js';
import Preference from '../../../../../../backend/models/Preference.js';
import User from '../../../../../../backend/models/User.js';
import { getUserIdFromRequest } from '@/lib/apiUser';

function userIsPremium(user) {
    if (!user) return false;
    return user.subscription === 'pro' || Boolean(user.isPremium);
}

const DEFAULT_PREFERENCES = {
    strictMode: true,
    smartBlock: true,
    breakReminders: true,
    focusSessionMinutes: 25,
    breakSessionMinutes: 5,
    deepWorkMinutes: 25,
    breakMinutes: 5,
    theme: "dark",
    productivityNudges: true,
    weeklyDigestEmail: false,
    weeklyDigestPush: false,
    coachLlmPhrasing: false,
};

const PREFERENCE_KEYS = Object.keys(DEFAULT_PREFERENCES);

/** Plain object with every known preference key (for JSON responses). */
function mergeDocIntoDefaults(doc) {
    const out = { ...DEFAULT_PREFERENCES };
    if (!doc || typeof doc !== "object") return out;
    for (const key of PREFERENCE_KEYS) {
        if (doc[key] !== undefined && doc[key] !== null) {
            out[key] = doc[key];
        }
    }
    return out;
}

/** Only allow known schema keys in $set so stray JSON does not touch Mongo. */
function pickPreferenceUpdates(body) {
    if (!body || typeof body !== "object") return {};
    const set = {};
    for (const key of PREFERENCE_KEYS) {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
            set[key] = body[key];
        }
    }
    return set;
}

export async function GET(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }
        const [pref, u] = await Promise.all([
            Preference.findOne({ userId }).lean(),
            User.findById(userId).select('subscription isPremium').lean(),
        ]);
        const payload = pref ? mergeDocIntoDefaults(pref) : DEFAULT_PREFERENCES;
        if (!userIsPremium(u)) {
            payload.smartBlock = false;
            payload.breakReminders = false;
        }
        return withCors(NextResponse.json(payload));
    } catch (err) {
        console.error("Auth Preferences GET Error:", err);
        if (isDbUnavailableError(err)) return withCors(NextResponse.json(DEFAULT_PREFERENCES));
        return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

export async function PUT(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }
        const body = await req.json();
        const $set = pickPreferenceUpdates(body);
        if (Object.keys($set).length === 0) {
            return withCors(NextResponse.json({ error: "No valid preference fields" }, { status: 400 }));
        }

        const u = await User.findById(userId).select('subscription isPremium').lean();
        const premium = userIsPremium(u);
        if ($set.smartBlock === true && !premium) {
            return withCors(
                NextResponse.json({ error: "AI Smart Block requires ProdLytics Premium" }, { status: 403 })
            );
        }
        if ($set.breakReminders === true && !premium) {
            return withCors(
                NextResponse.json({ error: "Flow Reminders require ProdLytics Premium" }, { status: 403 })
            );
        }

        const pref = await Preference.findOneAndUpdate(
            { userId },
            { $set },
            { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true }
        ).lean();

        const merged = mergeDocIntoDefaults(pref);
        if (!premium) {
            merged.smartBlock = false;
            merged.breakReminders = false;
        }
        return withCors(NextResponse.json(merged));
    } catch (err) {
        console.error("Auth Preferences PUT Error:", err);
        return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

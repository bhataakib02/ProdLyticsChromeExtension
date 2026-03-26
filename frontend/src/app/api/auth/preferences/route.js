import { NextResponse } from 'next/server';
import { withCors, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
    return corsOptions();
}

import mongoose from 'mongoose';
import dbConnect, { isDbUnavailableError } from '../../../../../../backend/db/mongodb.js';
import Preference from '../../../../../../backend/models/Preference.js';

const MOCK_USER_ID = "65f1a2b3c4d5e6f7a8b9c0d1";

const DEFAULT_PREFERENCES = {
    strictMode: true,
    smartBlock: true,
    breakReminders: true,
    focusSessionMinutes: 25,
    breakSessionMinutes: 5,
    deepWorkMinutes: 25,
    breakMinutes: 5,
    theme: "dark"
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

export async function GET() {
    try {
        await dbConnect();
        const pref = await Preference.findOne({ userId: new mongoose.Types.ObjectId(MOCK_USER_ID) }).lean();
        const payload = pref ? mergeDocIntoDefaults(pref) : DEFAULT_PREFERENCES;
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
        const body = await req.json();
        const $set = pickPreferenceUpdates(body);
        if (Object.keys($set).length === 0) {
            return withCors(NextResponse.json({ error: "No valid preference fields" }, { status: 400 }));
        }

        const pref = await Preference.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(MOCK_USER_ID) },
            { $set },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        ).lean();

        return withCors(NextResponse.json(mergeDocIntoDefaults(pref)));
    } catch (err) {
        console.error("Auth Preferences PUT Error:", err);
        return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

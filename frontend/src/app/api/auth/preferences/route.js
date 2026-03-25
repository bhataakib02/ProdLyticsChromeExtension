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
    theme: "dark"
};

export async function GET() {
    try {
        await dbConnect();
        const pref = await Preference.findOne({ userId: new mongoose.Types.ObjectId(MOCK_USER_ID) });
        return withCors(NextResponse.json(pref || DEFAULT_PREFERENCES));
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

        const pref = await Preference.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(MOCK_USER_ID) },
            { $set: body },
            { upsert: true, new: true }
        );

        return withCors(NextResponse.json(pref));
    } catch (err) {
        console.error("Auth Preferences PUT Error:", err);
        return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

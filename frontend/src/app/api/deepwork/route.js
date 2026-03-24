import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect, { isDbUnavailableError } from '../../../../../backend/db/mongodb.js';
import DeepWorkSession from '../../../../../backend/models/DeepWorkSession.js';

const MOCK_USER_ID = "65f1a2b3c4d5e6f7a8b9c0d1";

export async function GET() {
    try {
        await dbConnect();
        const sessions = await DeepWorkSession.find({ userId: new mongoose.Types.ObjectId(MOCK_USER_ID) }).sort({ startTime: -1 }).limit(10);
        return NextResponse.json(sessions);
    } catch (err) {
        console.error("DeepWork GET Error:", err);
        if (isDbUnavailableError(err)) {
            return NextResponse.json([]);
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const body = await req.json();
        const session = await DeepWorkSession.create({ ...body, userId: new mongoose.Types.ObjectId(MOCK_USER_ID) });
        return NextResponse.json(session);
    } catch (err) {
        console.error("DeepWork POST Error:", err);
        if (isDbUnavailableError(err)) {
            return NextResponse.json({ success: true, offline: true });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

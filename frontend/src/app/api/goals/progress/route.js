import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect, { isDbUnavailableError } from '../../../../../../backend/db/mongodb.js';
import Goal from '../../../../../../backend/models/Goal.js';

const MOCK_USER_ID = "65f1a2b3c4d5e6f7a8b9c0d1";

export async function GET(req) {
    try {
        await dbConnect();
        // For progress view, we return all goals for the user
        const goals = await Goal.find({ userId: new mongoose.Types.ObjectId(MOCK_USER_ID) });
        return NextResponse.json(goals);
    } catch (err) {
        console.error("Goals Progress API Error:", err);
        if (isDbUnavailableError(err)) {
            return NextResponse.json([]);
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

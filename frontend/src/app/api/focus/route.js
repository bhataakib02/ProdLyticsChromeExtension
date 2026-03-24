import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect, { isDbUnavailableError } from '../../../../../backend/db/mongodb.js';
import FocusBlock from '../../../../../backend/models/FocusBlock.js';
import { withCors, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
    return corsOptions();
}

const MOCK_USER_ID = "65f1a2b3c4d5e6f7a8b9c0d1";

export async function GET() {
    try {
        await dbConnect();
        const blocks = await FocusBlock.find({ userId: new mongoose.Types.ObjectId(MOCK_USER_ID), isActive: true });
        return withCors(NextResponse.json(blocks));
    } catch (err) {
        console.error("Focus GET Error:", err);
        if (isDbUnavailableError(err)) {
            return withCors(NextResponse.json([]));
        }
        return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const { website, schedule } = await req.json();
        if (!website) return withCors(NextResponse.json({ error: "Website URL is required." }, { status: 400 }));

        const block = await FocusBlock.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(MOCK_USER_ID), website: website.toLowerCase().trim() },
            { schedule, isActive: true },
            { upsert: true, new: true }
        );

        return withCors(NextResponse.json(block));
    } catch (err) {
        console.error("Focus POST Error:", err);
        if (isDbUnavailableError(err)) {
            return withCors(NextResponse.json({ success: true, offline: true }));
        }
        return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

export async function DELETE(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return withCors(NextResponse.json({ error: "ID required" }, { status: 400 }));

        await FocusBlock.findOneAndDelete({ _id: id, userId: new mongoose.Types.ObjectId(MOCK_USER_ID) });
        return withCors(NextResponse.json({ success: true }));
    } catch (err) {
        console.error("Focus DELETE Error:", err);
        if (isDbUnavailableError(err)) {
            return withCors(NextResponse.json({ success: true, offline: true }));
        }
        return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

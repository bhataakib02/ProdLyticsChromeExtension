import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '../../../../../backend/db/mongodb.jsx';
import FocusBlock from '../../../../../backend/models/FocusBlock.jsx';

const MOCK_USER_ID = "65f1a2b3c4d5e6f7a8b9c0d1";

export async function GET() {
    try {
        await dbConnect();
        const blocks = await FocusBlock.find({ userId: new mongoose.Types.ObjectId(MOCK_USER_ID), isActive: true });
        return NextResponse.json(blocks);
    } catch (err) {
        console.error("Focus GET Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const { website, schedule } = await req.json();
        if (!website) return NextResponse.json({ error: "Website URL is required." }, { status: 400 });

        const block = await FocusBlock.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(MOCK_USER_ID), website: website.toLowerCase().trim() },
            { schedule, isActive: true },
            { upsert: true, new: true }
        );

        return NextResponse.json(block);
    } catch (err) {
        console.error("Focus POST Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await FocusBlock.findOneAndDelete({ _id: id, userId: new mongoose.Types.ObjectId(MOCK_USER_ID) });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Focus DELETE Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

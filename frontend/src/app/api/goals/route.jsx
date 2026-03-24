import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '../../../../../backend/db/mongodb.jsx';
import Goal from '../../../../../backend/models/Goal.jsx';

const MOCK_USER_ID = "65f1a2b3c4d5e6f7a8b9c0d1";

export async function GET(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (id) {
            const goal = await Goal.findOne({ _id: id, userId: new mongoose.Types.ObjectId(MOCK_USER_ID) });
            return NextResponse.json(goal);
        }

        const goals = await Goal.find({ userId: new mongoose.Types.ObjectId(MOCK_USER_ID) });
        return NextResponse.json(goals);
    } catch (err) {
        console.error("Goals GET Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const body = await req.json();
        const goal = await Goal.create({ ...body, userId: new mongoose.Types.ObjectId(MOCK_USER_ID) });
        return NextResponse.json(goal);
    } catch (err) {
        console.error("Goals POST Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const body = await req.json();
        const goal = await Goal.findOneAndUpdate({ _id: id, userId: new mongoose.Types.ObjectId(MOCK_USER_ID) }, body, { new: true });
        return NextResponse.json(goal);
    } catch (err) {
        console.error("Goals PUT Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await Goal.findOneAndDelete({ _id: id, userId: new mongoose.Types.ObjectId(MOCK_USER_ID) });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Goals DELETE Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

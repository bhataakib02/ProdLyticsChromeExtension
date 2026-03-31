import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect, { isDbUnavailableError } from '../../../../../backend/db/mongodb.js';
import FocusBlock from '../../../../../backend/models/FocusBlock.js';
import { withCors, corsOptions } from '@/lib/cors';
import { normalizeWebsiteHost } from '@/lib/normalizeWebsiteHost.js';

export async function OPTIONS() {
    return corsOptions();
}

const MOCK_USER_ID = "65f1a2b3c4d5e6f7a8b9c0d1";

export async function GET() {
    try {
        await dbConnect();
        const userObjectId = new mongoose.Types.ObjectId(MOCK_USER_ID);
        let blocks = await FocusBlock.find({ userId: userObjectId, isActive: true });
        // Self-heal rows saved as full URLs (e.g. https://www.youtube.com/) so blocking matches hostnames
        for (const b of blocks) {
            const n = normalizeWebsiteHost(b.website);
            if (n && n !== b.website) {
                try {
                    await FocusBlock.updateOne({ _id: b._id }, { $set: { website: n } });
                } catch (err) {
                    if (err.code === 11000) {
                        await FocusBlock.deleteOne({ _id: b._id });
                    }
                }
            }
        }
        blocks = await FocusBlock.find({ userId: userObjectId, isActive: true });
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
        const { website, schedule, source: sourceRaw } = await req.json();
        if (!website) return withCors(NextResponse.json({ error: "Website URL is required." }, { status: 400 }));

        const normalized = normalizeWebsiteHost(website);
        if (!normalized) {
            return withCors(NextResponse.json({ error: "Could not parse a hostname from that value." }, { status: 400 }));
        }

        const userObjectId = new mongoose.Types.ObjectId(MOCK_USER_ID);
        const fromSmartCap = sourceRaw === "smart_daily_cap";

        if (fromSmartCap) {
            let block = await FocusBlock.findOne({ userId: userObjectId, website: normalized });
            if (!block) {
                block = await FocusBlock.create({
                    userId: userObjectId,
                    website: normalized,
                    isActive: true,
                    source: "smart_daily_cap",
                });
            } else {
                block.isActive = true;
                await block.save();
            }
            return withCors(NextResponse.json(block));
        }

        const existing = await FocusBlock.find({ userId: userObjectId });
        for (const b of existing) {
            if (normalizeWebsiteHost(b.website) === normalized) {
                await FocusBlock.deleteOne({ _id: b._id });
            }
        }

        const block = await FocusBlock.findOneAndUpdate(
            { userId: userObjectId, website: normalized },
            { schedule, isActive: true, source: "manual" },
            { upsert: true, returnDocument: "after" }
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

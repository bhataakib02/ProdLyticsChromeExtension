import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '../../../../../backend/db/mongodb.jsx';
import Tracking from '../../../../../backend/models/Tracking.jsx';
import Category from '../../../../../backend/models/Category.jsx';
import aiClassifier from '../../../../../backend/services/aiClassifier.jsx';

// Mock user ID for now since auth is mocked in frontend
const MOCK_USER_ID = "65f1a2b3c4d5e6f7a8b9c0d1";

export async function POST(req) {
    try {
        await dbConnect();
        const body = await req.json();
        const { website, time, pageTitle, scrolls, clicks, content } = body;

        if (!website || typeof time !== 'number' || time <= 0) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        }

        // Determine category
        let catDoc = await Category.findOne({ userId: MOCK_USER_ID, website });
        let category = "neutral";
        let source = "default";

        if (catDoc && catDoc.source === "user") {
            category = catDoc.category;
            source = "user";
        } else {
            const aiResult = aiClassifier.classify(website, pageTitle || "", content || "");
            category = aiResult.category;
            source = "ai";

            await Category.findOneAndUpdate(
                { userId: MOCK_USER_ID, website },
                {
                    category: aiResult.category,
                    source: "ai",
                    confidence: aiResult.confidence,
                    tags: aiResult.tags,
                },
                { upsert: true, new: true }
            );
        }

        await Tracking.create({
            userId: MOCK_USER_ID,
            website,
            pageTitle: pageTitle || "",
            time,
            category,
            categorySource: source,
            scrolls: scrolls || 0,
            clicks: clicks || 0,
            date: new Date(),
        });

        return NextResponse.json({ success: true, category });
    } catch (err) {
        console.error("Tracking POST Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const range = searchParams.get('range') || 'today';

        // Date range helper
        const now = new Date();
        let start;
        if (range === 'today') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        else if (range === 'week') start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        else if (range === 'month') start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        else start = new Date(0);

        const data = await Tracking.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(MOCK_USER_ID), date: { $gte: start } } },
            {
                $group: {
                    _id: "$website",
                    totalTime: { $sum: "$time" },
                    category: { $last: "$category" },
                    sessions: { $sum: 1 },
                },
            },
            { $sort: { totalTime: -1 } },
            { $limit: 50 },
        ]);

        return NextResponse.json(data);
    } catch (err) {
        console.error("Tracking GET Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await dbConnect();
        await Tracking.deleteMany({ userId: MOCK_USER_ID });
        return NextResponse.json({ success: true, message: "Cleared all data" });
    } catch (err) {
        console.error("Tracking DELETE Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

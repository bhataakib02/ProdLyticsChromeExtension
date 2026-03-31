import { NextResponse } from 'next/server';
import dbConnect, { isDbUnavailableError } from '../../../../../backend/db/mongodb.js';
import Tracking from '../../../../../backend/models/Tracking.js';
import Category from '../../../../../backend/models/Category.js';
import aiClassifier from '../../../../../backend/services/aiClassifier.js';
import { withCors, corsOptions } from '@/lib/cors';
import { getUserIdFromRequest } from '@/lib/apiUser';

export async function OPTIONS() {
    return corsOptions();
}

export async function POST(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }
        const body = await req.json();
        const { website, time, pageTitle, scrolls, clicks, content } = body;


        if (!website || typeof time !== 'number' || time <= 0) {
            return withCors(NextResponse.json({ error: "Invalid data" }, { status: 400 }));
        }

        // Determine category
        let catDoc = await Category.findOne({ userId, website });
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
                { userId, website },
                {
                    category: aiResult.category,
                    source: "ai",
                    confidence: aiResult.confidence,
                    tags: aiResult.tags,
                },
                { upsert: true, returnDocument: "after" }
            );
        }

        await Tracking.create({
            userId,
            website,
            pageTitle: pageTitle || "",
            time,
            category,
            categorySource: source,
            scrolls: scrolls || 0,
            clicks: clicks || 0,
            date: new Date(),
        });

        return withCors(NextResponse.json({ success: true, category }));
    } catch (err) {
        console.error("Tracking POST Error:", err);
        if (isDbUnavailableError(err)) {
            // Keep extension flow usable when MongoDB is temporarily unreachable.
            return withCors(NextResponse.json({ success: true, category: "neutral", offline: true }));
        }
        return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

export async function GET(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }
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
            { $match: { userId, date: { $gte: start } } },
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

        return withCors(NextResponse.json(data));
    } catch (err) {
        console.error("Tracking GET Error:", err);
        if (isDbUnavailableError(err)) {
            return withCors(NextResponse.json([]));
        }
        return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

export async function DELETE(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }
        await Tracking.deleteMany({ userId });
        return withCors(NextResponse.json({ success: true, message: "Cleared all data" }));
    } catch (err) {
        console.error("Tracking DELETE Error:", err);
        if (isDbUnavailableError(err)) {
            return withCors(NextResponse.json({ success: true, message: "Cleared all data (offline mode)" }));
        }
        return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

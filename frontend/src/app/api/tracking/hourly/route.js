import { NextResponse } from 'next/server';
import dbConnect, { isDbUnavailableError } from '../../../../../../backend/db/mongodb.js';
import Tracking from '../../../../../../backend/models/Tracking.js';
import { getUserIdFromRequest } from '@/lib/apiUser';

export async function GET(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const range = searchParams.get('range') || 'today';

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
                    _id: { hour: "$hour", category: "$category" },
                    totalTime: { $sum: "$time" },
                },
            },
        ]);

        // Map to 24-hour array with categories
        const hourlyData = Array(24).fill(0).map((_, i) => ({
            hour: i,
            productive: 0,
            neutral: 0,
            unproductive: 0
        }));

        data.forEach(item => {
            const h = item._id.hour;
            const cat = item._id.category || "neutral";
            if (h >= 0 && h < 24) {
                // frontend expects minutes for h.productive, etc.
                hourlyData[h][cat] = Math.round(item.totalTime / 60);
            }
        });

        return NextResponse.json(hourlyData);
    } catch (err) {
        console.error("❌ Hourly Stats API Error:", err);
        if (isDbUnavailableError(err)) {
            const hourlyData = Array(24).fill(0).map((_, i) => ({ hour: i, time: 0 }));
            return NextResponse.json(hourlyData);
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

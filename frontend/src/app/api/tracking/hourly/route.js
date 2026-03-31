import { NextResponse } from 'next/server';
import dbConnect, { isDbUnavailableError } from '../../../../../../backend/db/mongodb.js';
import Tracking from '../../../../../../backend/models/Tracking.js';
import { getUserIdFromRequest } from '@/lib/apiUser';
import { resolveTrackingMatch } from '@/lib/trackingRangeServer';

export async function GET(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const range = searchParams.get('range') || 'today';

        const { match, hourZone } = resolveTrackingMatch(userId, range, searchParams);

        const data = await Tracking.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        hour: { $hour: { date: "$date", timezone: hourZone } },
                        category: "$category",
                    },
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
            const hourlyData = Array(24)
                .fill(0)
                .map((_, i) => ({ hour: i, productive: 0, neutral: 0, unproductive: 0 }));
            return NextResponse.json(hourlyData);
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

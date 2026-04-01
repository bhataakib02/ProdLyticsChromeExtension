import { NextResponse } from 'next/server';
import dbConnect, { isDbUnavailableError } from '../../../../../../backend/db/mongodb.js';
import Tracking from '../../../../../../backend/models/Tracking.js';
import { getUserIdFromRequest } from '@/lib/apiUser';
import {
    resolveTrackingMatch,
    todayDateKeyInTimezone,
    previousCalendarDateKey,
} from '@/lib/trackingRangeServer';

export async function GET(req) {
    try {
        await dbConnect();
        const userObjectId = await getUserIdFromRequest(req);
        if (!userObjectId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const range = searchParams.get('range') || 'today';

        const { match, hourZone } = resolveTrackingMatch(userObjectId, range, searchParams);

        const data = await Tracking.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$category",
                    totalTime: { $sum: "$time" },
                },
            },
        ]);


        let productiveTime = 0, unproductiveTime = 0, neutralTime = 0;
        data.forEach(({ _id, totalTime }) => {
            if (_id === "productive") productiveTime = totalTime;
            else if (_id === "unproductive") unproductiveTime = totalTime;
            else neutralTime = (neutralTime || 0) + totalTime;
        });

        const totalTime = productiveTime + unproductiveTime + neutralTime;
        const denominator = productiveTime + unproductiveTime + neutralTime * 0.5;
        const score = denominator > 0 ? Math.round((productiveTime / denominator) * 100) : 0;


        const peakHourData = await Tracking.aggregate([
            { $match: { ...match, category: "productive" } },
            {
                $group: {
                    _id: { $hour: { date: "$date", timezone: hourZone } },
                    totalTime: { $sum: "$time" },
                },
            },
            { $sort: { totalTime: -1 } },
            { $limit: 1 },
        ]);
        const peakHour = peakHourData.length > 0 ? peakHourData[0]._id : null;


        const streakTz = searchParams.get("tz") || hourZone || "UTC";
        const clientDateKey = searchParams.get("dateKey");
        const todayStr = clientDateKey || todayDateKeyInTimezone(streakTz);

        const activeDaysData = await Tracking.aggregate([
            { $match: { userId: userObjectId, category: "productive" } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: streakTz } },
                },
            },
            { $sort: { _id: -1 } },
        ]);

        const activeSet = new Set(activeDaysData.map((d) => d._id).filter(Boolean));
        const yesterdayStr = previousCalendarDateKey(todayStr);

        let streak = 0;
        const hasToday = activeSet.has(todayStr);
        const hasYesterday = Boolean(yesterdayStr && activeSet.has(yesterdayStr));

        if (hasToday || hasYesterday) {
            let checkStr = hasToday ? todayStr : yesterdayStr;
            while (checkStr && activeSet.has(checkStr)) {
                streak++;
                checkStr = previousCalendarDateKey(checkStr);
            }
        }



        return NextResponse.json({ score, totalTime, productiveTime, unproductiveTime, neutralTime, streak, peakHour });
    } catch (err) {
        console.error("❌ [STATS] Tracking Stats API Error:", err.message);
        console.error("❌ [STATS] Stack Trace:", err.stack);
        if (isDbUnavailableError(err)) {
            return NextResponse.json({ score: 0, totalTime: 0, productiveTime: 0, unproductiveTime: 0, neutralTime: 0, streak: 0, peakHour: null });
        }
        return NextResponse.json({
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }, { status: 500 });
    }
}

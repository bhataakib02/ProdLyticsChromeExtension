import { NextResponse } from 'next/server';
import dbConnect, { isDbUnavailableError } from '../../../../../../backend/db/mongodb.js';
import Tracking from '../../../../../../backend/models/Tracking.js';
import { getUserIdFromRequest } from '@/lib/apiUser';

export async function GET(req) {
    try {
        await dbConnect();
        const userObjectId = await getUserIdFromRequest(req);
        if (!userObjectId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const range = searchParams.get('range') || 'today';


        const now = new Date();


        let start;
        let endExclusive = null;
        if (range === 'today') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (range === 'yesterday') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            endExclusive = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (range === 'week') {
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (range === 'month') {
            start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else {
            start = new Date(0);
        }

        if (isNaN(start.getTime())) {
            console.error("❌ [STATS] Invalid Start Date calculated:", start);
            throw new Error("Invalid Start Date calculated");
        }

        const dateMatch = endExclusive
            ? { $gte: start, $lt: endExclusive }
            : { $gte: start };


        const data = await Tracking.aggregate([
            { $match: { userId: userObjectId, date: dateMatch } },
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
            { $match: { userId: userObjectId, date: dateMatch, category: "productive" } },
            { $group: { _id: "$hour", totalTime: { $sum: "$time" } } },
            { $sort: { totalTime: -1 } },
            { $limit: 1 }
        ]);
        const peakHour = peakHourData.length > 0 ? peakHourData[0]._id : null;


        const activeDaysData = await Tracking.aggregate([
            { $match: { userId: userObjectId, category: "productive" } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } } } },
            { $sort: { _id: -1 } }
        ]);

        let streak = 0;
        let todayStr = new Date().toISOString().split('T')[0];
        let yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        let hasToday = activeDaysData.some(d => d._id === todayStr);
        let hasYesterday = activeDaysData.some(d => d._id === yesterdayStr);

        if (hasToday || hasYesterday) {
            let currentCheckDate = hasToday ? new Date() : new Date(Date.now() - 86400000);
            while (true) {
                const checkStr = currentCheckDate.toISOString().split('T')[0];
                if (activeDaysData.some(d => d._id === checkStr)) {
                    streak++;
                    currentCheckDate.setDate(currentCheckDate.getDate() - 1);
                } else {
                    break;
                }
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

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

        const { match } = resolveTrackingMatch(userId, range, searchParams);

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
            else neutralTime += totalTime;
        });

        const totalTime = productiveTime + unproductiveTime + neutralTime;
        const denominator = productiveTime + unproductiveTime + (neutralTime * 0.5);
        const score = denominator > 0 ? Math.round((productiveTime / denominator) * 100) : 0;

        return NextResponse.json({
            score,
            total: totalTime,
            productive: productiveTime,
            neutral: neutralTime,
            unproductive: unproductiveTime
        });
    } catch (err) {
        console.error("❌ Score API Error:", err);
        if (isDbUnavailableError(err)) {
            return NextResponse.json({ score: 0, total: 0 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

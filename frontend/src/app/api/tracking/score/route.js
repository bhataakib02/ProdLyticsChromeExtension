import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect, { isDbUnavailableError } from '../../../../../../backend/db/mongodb.js';
import Tracking from '../../../../../../backend/models/Tracking.js';

const MOCK_USER_ID = "65f1a2b3c4d5e6f7a8b9c0d1";

export async function GET(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const range = searchParams.get('range') || 'today';

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

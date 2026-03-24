import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '../../../../../../backend/db/mongodb.jsx';
import Tracking from '../../../../../../backend/models/Tracking.jsx';

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
                    _id: "$hour",
                    totalTime: { $sum: "$time" },
                },
            },
            { $sort: { _id: 1 } }
        ]);

        // Map to 24-hour array
        const hourlyData = Array(24).fill(0).map((_, i) => ({
            hour: i,
            time: 0
        }));

        data.forEach(item => {
            if (item._id >= 0 && item._id < 24) {
                hourlyData[item._id].time = Math.round(item.totalTime / 60); // Convert to minutes
            }
        });

        return NextResponse.json(hourlyData);
    } catch (err) {
        console.error("❌ Hourly Stats API Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

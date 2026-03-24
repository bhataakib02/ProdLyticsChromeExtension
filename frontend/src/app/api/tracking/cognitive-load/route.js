import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect, { isDbUnavailableError } from '../../../../../../backend/db/mongodb.js';
import Tracking from '../../../../../../backend/models/Tracking.js';

const MOCK_USER_ID = "65f1a2b3c4d5e6f7a8b9c0d1";

export async function GET(req) {
    try {
        await dbConnect();
        
        // Cognitive load is a complex metric usually calculated from scrolls, clicks, and time
        // For now, we'll return a simple calculation based on recent activity
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        const data = await Tracking.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(MOCK_USER_ID), date: { $gte: oneHourAgo } } },
            {
                $group: {
                    _id: null,
                    avgScrolls: { $avg: "$scrolls" },
                    avgClicks: { $avg: "$clicks" },
                    totalTime: { $sum: "$time" }
                }
            }
        ]);

        if (data.length === 0) {
            return NextResponse.json({ cognitiveLoad: 0, level: "low" });
        }

        const { avgScrolls, avgClicks, totalTime } = data[0];
        
        // Simple heuristic for cognitive load (0-100)
        let load = (avgScrolls * 0.2) + (avgClicks * 0.5) + (totalTime / 300);
        load = Math.min(Math.round(load), 100);

        let level = "low";
        if (load > 70) level = "high";
        else if (load > 30) level = "moderate";

        return NextResponse.json({ cognitiveLoad: load, level });
    } catch (err) {
        console.error("❌ Cognitive Load API Error:", err);
        if (isDbUnavailableError(err)) {
            return NextResponse.json({ cognitiveLoad: 0, level: "low" });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

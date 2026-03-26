import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect, { isDbUnavailableError } from '../../../../../../backend/db/mongodb.js';
import Goal from '../../../../../../backend/models/Goal.js';
import Tracking from '../../../../../../backend/models/Tracking.js';

const MOCK_USER_ID = "65f1a2b3c4d5e6f7a8b9c0d1";

export async function GET(req) {
    try {
        await dbConnect();

        let goals = await Goal.find({ userId: new mongoose.Types.ObjectId(MOCK_USER_ID), isActive: true });

        // Only return an empty list if they have really deleted everything.
        // We'll remove the auto-create logic from the GET request to prevent "voodoo" reappearing.

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // For each goal, calculate real progress
        const goalsWithProgress = await Promise.all(goals.map(async (goal) => {
            let currentSeconds = 0;

            if (goal.type === "productive") {
                const stats = await Tracking.aggregate([
                    {
                        $match: {
                            userId: new mongoose.Types.ObjectId(MOCK_USER_ID),
                            date: { $gte: startOfToday },
                            category: "productive"
                        }
                    },
                    { $group: { _id: null, total: { $sum: "$time" } } }
                ]);
                currentSeconds = stats[0]?.total || 0;
            } else if (goal.type === "unproductive" && goal.website) {
                const stats = await Tracking.aggregate([
                    {
                        $match: {
                            userId: new mongoose.Types.ObjectId(MOCK_USER_ID),
                            date: { $gte: startOfToday },
                            website: new RegExp(goal.website, 'i')
                        }
                    },
                    { $group: { _id: null, total: { $sum: "$time" } } }
                ]);
                currentSeconds = stats[0]?.total || 0;
            }

            const rawPercent =
                goal.targetSeconds > 0 ? Math.round((currentSeconds / goal.targetSeconds) * 100) : 0;
            // Cap at 100% for display and "complete" logic — tracking seconds still reflect real usage
            const progress = Math.min(100, Math.max(0, rawPercent));

            return {
                ...goal.toObject(),
                currentSeconds,
                progress,
            };
        }));

        return NextResponse.json(goalsWithProgress);
    } catch (err) {
        console.error("Goals Progress API Error:", err);
        if (isDbUnavailableError(err)) {
            return NextResponse.json([]);
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

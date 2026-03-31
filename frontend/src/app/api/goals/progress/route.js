import { NextResponse } from 'next/server';
import dbConnect, { isDbUnavailableError } from '../../../../../../backend/db/mongodb.js';
import Goal from '../../../../../../backend/models/Goal.js';
import Tracking from '../../../../../../backend/models/Tracking.js';
import { getUserIdFromRequest } from '@/lib/apiUser';
import { withCors } from '@/lib/cors';

export async function GET(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }

        let goals = await Goal.find({ userId, isActive: true });

        // Only return an empty list if they have really deleted everything.
        // We'll remove the auto-create logic from the GET request to prevent "voodoo" reappearing.

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // For each goal, calculate real progress
        const goalsWithProgress = await Promise.all(goals.map(async (goal) => {
            let currentSeconds = 0;

            if (goal.type === "productive") {
                // If the goal targets a specific website, filter tracking by that site.
                // If website is blank or "*", sum all productive time.
                const hasTargetSite = goal.website && goal.website.trim() !== "" && goal.website.trim() !== "*";
                const matchCondition = {
                    userId,
                    date: { $gte: startOfToday },
                    category: "productive",
                    ...(hasTargetSite && { website: new RegExp(goal.website.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }),
                };
                const stats = await Tracking.aggregate([
                    { $match: matchCondition },
                    { $group: { _id: null, total: { $sum: "$time" } } }
                ]);
                currentSeconds = stats[0]?.total || 0;
            } else if (goal.type === "unproductive" && goal.website) {
                const stats = await Tracking.aggregate([
                    {
                        $match: {
                            userId,
                            date: { $gte: startOfToday },
                            website: new RegExp(goal.website.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
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

        return withCors(NextResponse.json(goalsWithProgress));
    } catch (err) {
        console.error("Goals Progress API Error:", err);
        if (isDbUnavailableError(err)) {
            return withCors(NextResponse.json([]));
        }
        return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

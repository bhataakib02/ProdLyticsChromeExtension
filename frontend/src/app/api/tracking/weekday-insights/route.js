import { NextResponse } from "next/server";
import dbConnect, { isDbUnavailableError } from "../../../../../../backend/db/mongodb.js";
import Tracking from "../../../../../../backend/models/Tracking.js";
import { getUserIdFromRequest } from "@/lib/apiUser";
import { requirePremiumForUserId } from "@/lib/serverPremium";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function GET(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const premiumBlock = await requirePremiumForUserId(userId);
        if (premiumBlock) {
            return NextResponse.json({ error: premiumBlock.error || "Premium required" }, { status: premiumBlock.status });
        }

        const now = new Date();
        const start = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

        const rows = await Tracking.aggregate([
            {
                $match: {
                    userId,
                    date: { $gte: start },
                    category: "productive",
                },
            },
            {
                $group: {
                    _id: "$dayOfWeek",
                    productiveSeconds: { $sum: "$time" },
                },
            },
        ]).exec();

        const byDay = Object.fromEntries(rows.map((r) => [r._id, r.productiveSeconds]));
        let bestIdx = -1;
        let bestSec = 0;
        for (let d = 0; d <= 6; d++) {
            const v = Number(byDay[d]) || 0;
            if (v > bestSec) {
                bestSec = v;
                bestIdx = d;
            }
        }

        const breakdown = DAY_NAMES.map((name, i) => ({
            day: name,
            dayIndex: i,
            productiveMinutes: Math.round((Number(byDay[i]) || 0) / 60),
        }));

        return NextResponse.json({
            rangeDays: 28,
            bestDayName: bestIdx >= 0 ? DAY_NAMES[bestIdx] : null,
            bestDayIndex: bestIdx >= 0 ? bestIdx : null,
            bestProductiveMinutes: Math.round(bestSec / 60),
            breakdown,
        });
    } catch (err) {
        console.error("weekday-insights:", err);
        if (isDbUnavailableError(err)) {
            return NextResponse.json({
                rangeDays: 28,
                bestDayName: null,
                bestDayIndex: null,
                bestProductiveMinutes: 0,
                breakdown: [],
            });
        }
        return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
    }
}

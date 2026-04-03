import { NextResponse } from "next/server";
import dbConnect, { isDbUnavailableError } from "../../../../../../backend/db/mongodb.js";
import Tracking from "../../../../../../backend/models/Tracking.js";
import { getUserIdFromRequest } from "@/lib/apiUser";
import { requirePremiumForUserId } from "@/lib/serverPremium";

function clamp(n, min, max) {
    const x = Number(n);
    if (!Number.isFinite(x)) return min;
    return Math.min(max, Math.max(min, x));
}

async function computeRangeStats({ userId, start, endExclusive }) {
    const dateMatch = { $gte: start };
    if (endExclusive) dateMatch.$lt = endExclusive;

    const data = await Tracking.aggregate([
        { $match: { userId, date: dateMatch } },
        {
            $group: {
                _id: "$category",
                totalTime: { $sum: "$time" },
            },
        },
    ]);

    let productiveTime = 0;
    let unproductiveTime = 0;
    let neutralTime = 0;

    data.forEach(({ _id, totalTime }) => {
        if (_id === "productive") productiveTime = totalTime || 0;
        else if (_id === "unproductive") unproductiveTime = totalTime || 0;
        else neutralTime = totalTime || 0;
    });

    const totalTime = productiveTime + unproductiveTime + neutralTime;
    const denominator = productiveTime + unproductiveTime + neutralTime * 0.5;
    const score = denominator > 0 ? Math.round((productiveTime / denominator) * 100) : 0;

    return {
        score,
        totalTime,
        productiveTime,
        unproductiveTime,
        neutralTime,
        productiveHours: Math.round((productiveTime / 3600) * 10) / 10,
        distractionHours: Math.round((unproductiveTime / 3600) * 10) / 10,
        neutralHours: Math.round((neutralTime / 3600) * 10) / 10,
        scoreSafe: clamp(score, 0, 100),
    };
}

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
        const dayMs = 24 * 60 * 60 * 1000;

        // Align with existing `/api/tracking/stats?range=week` which uses "now - 7 days" with `$gte` only.
        const startCurrent = new Date(now.getTime() - 7 * dayMs);
        const startPrevious = new Date(now.getTime() - 14 * dayMs);
        const endPreviousExclusive = startCurrent;

        const [current, previous] = await Promise.all([
            computeRangeStats({ userId, start: startCurrent, endExclusive: now }),
            computeRangeStats({ userId, start: startPrevious, endExclusive: endPreviousExclusive }),
        ]);

        return NextResponse.json({
            current,
            previous,
            deltas: {
                scoreDelta: current.scoreSafe - previous.scoreSafe,
                productiveHoursDelta: Math.round(((current.productiveTime - previous.productiveTime) / 3600) * 10) / 10,
                productiveShareDelta:
                    current.totalTime > 0 && previous.totalTime > 0
                        ? Math.round(
                              ((
                                  current.productiveTime / current.totalTime -
                                  previous.productiveTime / previous.totalTime
                              ) *
                                  100) *
                                  10
                          ) / 10
                        : null,
            },
        });
    } catch (err) {
        console.error("❌ Week-compare Tracking API Error:", err);
        if (isDbUnavailableError(err)) {
            return NextResponse.json({
                current: {
                    score: 0,
                    totalTime: 0,
                    productiveTime: 0,
                    unproductiveTime: 0,
                    neutralTime: 0,
                    productiveHours: 0,
                },
                previous: {
                    score: 0,
                    totalTime: 0,
                    productiveTime: 0,
                    unproductiveTime: 0,
                    neutralTime: 0,
                    productiveHours: 0,
                },
                deltas: { scoreDelta: 0, productiveHoursDelta: 0, productiveShareDelta: null },
            });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}


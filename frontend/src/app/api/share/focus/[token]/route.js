import { NextResponse } from "next/server";
import dbConnect, { isDbUnavailableError } from "../../../../../../../backend/db/mongodb.js";
import Tracking from "../../../../../../../backend/models/Tracking.js";
import User from "../../../../../../../backend/models/User.js";
import UserSettings from "../../../../../../../backend/models/UserSettings.js";

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

    const denominator = productiveTime + unproductiveTime + neutralTime * 0.5;
    const score = denominator > 0 ? Math.round((productiveTime / denominator) * 100) : 0;

    return {
        scoreSafe: clamp(score, 0, 100),
    };
}

export async function GET(req, ctx) {
    try {
        const params = await Promise.resolve(ctx.params);
        const token = params?.token;
        if (typeof token !== "string" || token.length < 8) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        await dbConnect();
        const settings = await UserSettings.findOne({
            "partnerShare.enabled": true,
            "partnerShare.token": token,
        })
            .select("userId")
            .lean();

        if (!settings?.userId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const user = await User.findById(settings.userId).select("name").lean();
        const rawName = String(user?.name || "").trim();
        const displayName = rawName ? rawName.split(/\s+/)[0] : "ProdLytics user";

        const now = new Date();
        const dayMs = 24 * 60 * 60 * 1000;
        const userId = settings.userId;

        const windows = [];
        for (let i = 0; i < 4; i++) {
            const endExclusive = new Date(now.getTime() - i * 7 * dayMs);
            const start = new Date(now.getTime() - (i + 1) * 7 * dayMs);
            const stats = await computeRangeStats({ userId, start, endExclusive });
            windows.push({
                label: i === 0 ? "Latest 7 days" : `${i + 1} weeks ago`,
                score: stats.scoreSafe,
            });
        }

        windows.reverse();

        return NextResponse.json({
            displayName,
            weeks: windows,
        });
    } catch (err) {
        console.error("share focus:", err);
        if (isDbUnavailableError(err)) {
            return NextResponse.json({ error: "Unavailable" }, { status: 503 });
        }
        return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
}

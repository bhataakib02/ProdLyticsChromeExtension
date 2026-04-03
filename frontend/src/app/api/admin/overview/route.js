import { NextResponse } from "next/server";
import User from "../../../../../../backend/models/User.js";
import Payment from "../../../../../../backend/models/Payment.js";
import { requireAdminUser } from "@/lib/adminAuth";

/** Match `/api/admin/payments`: inclusive local day range so “to” includes payments that evening. */
function parseAdminRange(fromParam, toParam, fallbackFrom) {
    const now = new Date();
    let fromSafe = fallbackFrom;
    let toSafe = now;
    if (fromParam) {
        const fromD = new Date(fromParam);
        if (!Number.isNaN(fromD.getTime())) fromSafe = fromD;
    }
    if (toParam) {
        const toD = new Date(toParam);
        if (!Number.isNaN(toD.getTime())) {
            toD.setHours(23, 59, 59, 999);
            toSafe = toD;
        }
    }
    return { fromSafe, toSafe };
}

/** Calendar buckets aligned with $dateToString(..., timezone) — same TZ as Node (dev = usually your laptop). */
const CHART_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function eachLocalDayKeyBetween(fromDate, toDate) {
    const keys = [];
    const cur = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
    const end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
    while (cur <= end) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, "0");
        const d = String(cur.getDate()).padStart(2, "0");
        keys.push(`${y}-${m}-${d}`);
        cur.setDate(cur.getDate() + 1);
    }
    return keys;
}

export async function GET(req) {
    const admin = await requireAdminUser(req);
    if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const { fromSafe, toSafe } = parseAdminRange(fromParam, toParam, since30);

    const [totalUsers, anonymousUsers, registeredUsers, proUsers, paidPayments, revenueAgg, recentUsers, recentPayments] =
        await Promise.all([
            User.countDocuments({}),
            User.countDocuments({ isAnonymous: true }),
            User.countDocuments({ isAnonymous: { $ne: true } }),
            User.countDocuments({ subscription: "pro" }),
            Payment.countDocuments({ status: "paid", createdAt: { $gte: fromSafe, $lte: toSafe } }),
            Payment.aggregate([
                { $match: { status: "paid", createdAt: { $gte: fromSafe, $lte: toSafe } } },
                { $group: { _id: null, revenue: { $sum: "$amount" } } },
            ]),
            User.find({})
                .sort({ createdAt: -1 })
                .limit(8)
                .select("name email isAnonymous subscription role createdAt")
                .lean(),
            Payment.find({})
                .sort({ createdAt: -1 })
                .limit(8)
                .select("email amount currency status type createdAt")
                .lean(),
        ]);

    const [userGrowthRaw, revenueRaw] = await Promise.all([
        User.aggregate([
            { $match: { createdAt: { $gte: fromSafe, $lte: toSafe } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: CHART_TZ } },
                    users: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        Payment.aggregate([
            { $match: { createdAt: { $gte: fromSafe, $lte: toSafe }, status: "paid" } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: CHART_TZ } },
                    revenue: { $sum: "$amount" },
                },
            },
            { $sort: { _id: 1 } },
        ]),
    ]);

    const usersByDayMap = new Map(userGrowthRaw.map((x) => [x._id, Number(x.users || 0)]));
    const revenueByDayMap = new Map(revenueRaw.map((x) => [x._id, Number(x.revenue || 0)]));
    const growthSeries = [];
    for (const key of eachLocalDayKeyBetween(fromSafe, toSafe)) {
        growthSeries.push({
            date: key,
            users: usersByDayMap.get(key) || 0,
            revenue: revenueByDayMap.get(key) || 0,
        });
    }

    return NextResponse.json({
        kpis: {
            totalUsers,
            anonymousUsers,
            registeredUsers,
            freeUsers: Math.max(totalUsers - proUsers, 0),
            proUsers,
            paidPayments,
            totalRevenue: Number(revenueAgg?.[0]?.revenue || 0),
            currency: "INR",
            rangeFrom: fromSafe,
            rangeTo: toSafe,
        },
        growthSeries,
        recentUsers: recentUsers.map((u) => ({
            id: u._id.toString(),
            name: u.name || "ProdLytics user",
            email: u.isAnonymous ? null : u.email || null,
            isAnonymous: Boolean(u.isAnonymous),
            subscription: u.subscription || "free",
            role: u.role || "user",
            createdAt: u.createdAt,
        })),
        recentPayments: recentPayments.map((p) => ({
            id: p._id.toString(),
            email: p.email || null,
            amount: Number(p.amount || 0),
            currency: p.currency || "inr",
            status: p.status || "pending",
            type: p.type || "subscription",
            createdAt: p.createdAt,
        })),
    });
}

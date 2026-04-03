import { NextResponse } from "next/server";
import Payment from "../../../../../../backend/models/Payment.js";
import { requireAdminUser } from "@/lib/adminAuth";

export async function GET(req) {
    const admin = await requireAdminUser(req);
    if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim();
    const status = String(searchParams.get("status") || "all"); // all | paid | failed | pending | canceled
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(5, Number(searchParams.get("limit") || 20)));
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filter = {};
    if (status !== "all") filter.status = status;
    if (q) filter.email = { $regex: q, $options: "i" };
    if (from || to) {
        const fromD = from ? new Date(from) : null;
        const toD = to ? new Date(to) : null;
        filter.createdAt = {};
        if (fromD && !Number.isNaN(fromD.getTime())) filter.createdAt.$gte = fromD;
        if (toD && !Number.isNaN(toD.getTime())) {
            toD.setHours(23, 59, 59, 999);
            filter.createdAt.$lte = toD;
        }
        if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
    }

    const [total, revenueAgg, rows] = await Promise.all([
        Payment.countDocuments(filter),
        Payment.aggregate([
            { $match: { ...filter, status: "paid" } },
            { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
        ]),
        Payment.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select("email amount currency status type stripeSessionId stripeSubscriptionId createdAt")
            .lean(),
    ]);

    return NextResponse.json({
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
        totalRevenue: Number(revenueAgg?.[0]?.totalRevenue || 0),
        payments: rows.map((p) => ({
            id: p._id.toString(),
            email: p.email || null,
            amount: Number(p.amount || 0),
            currency: p.currency || "inr",
            status: p.status || "pending",
            type: p.type || "subscription",
            stripeSessionId: p.stripeSessionId || null,
            stripeSubscriptionId: p.stripeSubscriptionId || null,
            createdAt: p.createdAt,
        })),
    });
}

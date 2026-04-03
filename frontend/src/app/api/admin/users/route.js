import { NextResponse } from "next/server";
import User from "../../../../../../backend/models/User.js";
import { requireAdminUser } from "@/lib/adminAuth";

export async function GET(req) {
    const admin = await requireAdminUser(req);
    if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim();
    const kind = String(searchParams.get("kind") || "all"); // all | anonymous | registered
    const subscription = String(searchParams.get("subscription") || "all"); // all | free | pro
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(5, Number(searchParams.get("limit") || 20)));
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filter = {};
    if (kind === "anonymous") filter.isAnonymous = true;
    if (kind === "registered") filter.isAnonymous = { $ne: true };
    if (subscription === "free" || subscription === "pro") filter.subscription = subscription;
    if (q) {
        filter.$or = [{ name: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }];
    }
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

    const [total, rows] = await Promise.all([
        User.countDocuments(filter),
        User.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select("name email isAnonymous subscription role createdAt")
            .lean(),
    ]);

    return NextResponse.json({
        total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(total / limit)),
        users: rows.map((u) => ({
            id: u._id.toString(),
            name: u.name || "ProdLytics user",
            email: u.isAnonymous ? null : u.email || null,
            isAnonymous: Boolean(u.isAnonymous),
            subscription: u.subscription || "free",
            role: u.role || "user",
            createdAt: u.createdAt,
        })),
    });
}

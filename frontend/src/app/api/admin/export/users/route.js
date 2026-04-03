import { NextResponse } from "next/server";
import User from "@backend/models/User.js";
import { requireAdminUser } from "@/lib/adminAuth";

function csvEscape(s) {
    const str = String(s ?? "");
    return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(req) {
    const admin = await requireAdminUser(req);
    if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim();
    const kind = String(searchParams.get("kind") || "all");
    const subscription = String(searchParams.get("subscription") || "all");

    const filter = {};
    if (kind === "anonymous") filter.isAnonymous = true;
    if (kind === "registered") filter.isAnonymous = { $ne: true };
    if (subscription === "free" || subscription === "pro") filter.subscription = subscription;
    if (q) filter.$or = [{ name: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }];

    const users = await User.find(filter).sort({ createdAt: -1 }).select("name email isAnonymous subscription role createdAt").lean();
    const lines = [
        "id,name,email,isAnonymous,subscription,role,createdAt",
        ...users.map((u) =>
            [
                csvEscape(u._id.toString()),
                csvEscape(u.name || "ProdLytics user"),
                csvEscape(u.isAnonymous ? "" : u.email || ""),
                csvEscape(Boolean(u.isAnonymous)),
                csvEscape(u.subscription || "free"),
                csvEscape(u.role || "user"),
                csvEscape(u.createdAt?.toISOString?.() || ""),
            ].join(",")
        ),
    ];
    const csv = lines.join("\n");
    return new NextResponse(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="prodlytics-admin-users.csv"',
        },
    });
}

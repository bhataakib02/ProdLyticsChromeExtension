import { NextResponse } from "next/server";
import Payment from "../../../../../../../../backend/models/Payment.js";
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
    const status = String(searchParams.get("status") || "all");

    const filter = {};
    if (status !== "all") filter.status = status;
    if (q) filter.email = { $regex: q, $options: "i" };

    const payments = await Payment.find(filter)
        .sort({ createdAt: -1 })
        .select("email amount currency status type stripeSessionId stripeSubscriptionId createdAt")
        .lean();

    const lines = [
        "id,email,amount,currency,status,type,stripeSessionId,stripeSubscriptionId,createdAt",
        ...payments.map((p) =>
            [
                csvEscape(p._id.toString()),
                csvEscape(p.email || ""),
                csvEscape(Number(p.amount || 0)),
                csvEscape(p.currency || "inr"),
                csvEscape(p.status || "pending"),
                csvEscape(p.type || "subscription"),
                csvEscape(p.stripeSessionId || ""),
                csvEscape(p.stripeSubscriptionId || ""),
                csvEscape(p.createdAt?.toISOString?.() || ""),
            ].join(",")
        ),
    ];
    const csv = lines.join("\n");
    return new NextResponse(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="prodlytics-admin-payments.csv"',
        },
    });
}

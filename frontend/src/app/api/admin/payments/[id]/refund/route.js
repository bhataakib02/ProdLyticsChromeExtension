import { NextResponse } from "next/server";
import Payment from "../../../../../../../../backend/models/Payment.js";
import { requireAdminUser } from "@/lib/adminAuth";

export async function PATCH(req, ctx) {
    const admin = await requireAdminUser(req);
    if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const params = await Promise.resolve(ctx.params);
    const paymentId = String(params?.id || "");
    if (!paymentId || paymentId === "undefined") {
        return NextResponse.json({ error: "Missing payment id." }, { status: 400 });
    }

    try {
        const payment = await Payment.findByIdAndUpdate(
            paymentId,
            { $set: { status: "refunded" } },
            { new: true }
        )
            .select("email amount currency status type createdAt")
            .lean();
        if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });

        return NextResponse.json({
            ok: true,
            payment: {
                id: payment._id.toString(),
                email: payment.email || null,
                amount: Number(payment.amount || 0),
                currency: payment.currency || "inr",
                status: payment.status || "pending",
                type: payment.type || "subscription",
                createdAt: payment.createdAt,
            },
        });
    } catch (err) {
        console.error("PATCH /api/admin/payments/[id]/refund:", err);
        const msg = err?.message || "Failed to update payment.";
        const status = /Cast to ObjectId failed/i.test(msg) ? 400 : 500;
        return NextResponse.json({ error: msg }, { status });
    }
}

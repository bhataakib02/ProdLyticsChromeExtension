import { NextResponse } from "next/server";
import User from "../../../../../../../../backend/models/User.js";
import { requireAdminUser } from "@/lib/adminAuth";

export async function PATCH(req, ctx) {
    const admin = await requireAdminUser(req);
    if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const params = await Promise.resolve(ctx.params);
    const userId = String(params?.id || "");
    const body = await req.json().catch(() => ({}));
    const subscription = String(body?.subscription || "");
    if (!["free", "pro"].includes(subscription)) {
        return NextResponse.json({ error: "Invalid subscription. Use free or pro." }, { status: 400 });
    }
    if (!userId || userId === "undefined") {
        return NextResponse.json({ error: "Missing user id." }, { status: 400 });
    }

    try {
        const updated = await User.findByIdAndUpdate(
            userId,
            { $set: { subscription, isPremium: subscription === "pro" } },
            { new: true }
        )
            .select("name email subscription isPremium role isAnonymous")
            .lean();
        if (!updated) return NextResponse.json({ error: "User not found." }, { status: 404 });

        return NextResponse.json({
            ok: true,
            user: {
                id: updated._id.toString(),
                subscription: updated.subscription || "free",
                isPremium: Boolean(updated.isPremium),
            },
        });
    } catch (err) {
        console.error("PATCH /api/admin/users/[id]/subscription:", err);
        const msg = err?.message || "Failed to update subscription.";
        const status = /Cast to ObjectId failed/i.test(msg) ? 400 : 500;
        return NextResponse.json({ error: msg }, { status });
    }
}

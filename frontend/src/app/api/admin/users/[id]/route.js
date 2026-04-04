import { NextResponse } from "next/server";
import User from "../../../../../../../backend/models/User.js";
import { requireAdminUser } from "@/lib/adminAuth";

// DELETE /api/admin/users/:id — delete a user
export async function DELETE(req, ctx) {
    const admin = await requireAdminUser(req);
    if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const params = await Promise.resolve(ctx.params);
    const userId = String(params?.id || "");
    if (!userId || userId === "undefined") {
        return NextResponse.json({ error: "Missing user id." }, { status: 400 });
    }

    try {
        const deleted = await User.findByIdAndDelete(userId).lean();
        if (!deleted) return NextResponse.json({ error: "User not found." }, { status: 404 });
        return NextResponse.json({ ok: true, deleted: deleted._id.toString() });
    } catch (err) {
        console.error("DELETE /api/admin/users/[id]:", err);
        const msg = err?.message || "Failed to delete user.";
        const status = /Cast to ObjectId failed/i.test(msg) ? 400 : 500;
        return NextResponse.json({ error: msg }, { status });
    }
}

// PATCH /api/admin/users/:id — update subscription (used by bulk downgrade)
export async function PATCH(req, ctx) {
    const admin = await requireAdminUser(req);
    if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const params = await Promise.resolve(ctx.params);
    const userId = String(params?.id || "");
    if (!userId || userId === "undefined") {
        return NextResponse.json({ error: "Missing user id." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const subscription = String(body?.subscription || "free");

    try {
        const updated = await User.findByIdAndUpdate(
            userId,
            { $set: { subscription, isPremium: subscription === "pro" } },
            { new: true }
        ).select("name email subscription isPremium").lean();

        if (!updated) return NextResponse.json({ error: "User not found." }, { status: 404 });

        return NextResponse.json({ ok: true, user: { id: updated._id.toString(), subscription: updated.subscription } });
    } catch (err) {
        console.error("PATCH /api/admin/users/[id]:", err);
        const msg = err?.message || "Failed to update user.";
        const status = /Cast to ObjectId failed/i.test(msg) ? 400 : 500;
        return NextResponse.json({ error: msg }, { status });
    }
}

import { NextResponse } from "next/server";
import User from "../../../../../../../../backend/models/User.js";
import { requireAdminUser } from "@/lib/adminAuth";

export async function PATCH(req, ctx) {
    const admin = await requireAdminUser(req);
    if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const params = await Promise.resolve(ctx.params);
    const userId = String(params?.id || "");
    const body = await req.json().catch(() => ({}));
    const role = String(body?.role || "");
    if (!["user", "admin"].includes(role)) {
        return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    if (!userId || userId === "undefined") {
        return NextResponse.json({ error: "Missing user id." }, { status: 400 });
    }

    try {
        const updated = await User.findByIdAndUpdate(userId, { $set: { role } }, { new: true })
            .select("name email role isAnonymous")
            .lean();
        if (!updated) return NextResponse.json({ error: "User not found." }, { status: 404 });

        return NextResponse.json({
            ok: true,
            user: {
                id: updated._id.toString(),
                name: updated.name || "ProdLytics user",
                email: updated.isAnonymous ? null : updated.email || null,
                role: updated.role || "user",
            },
        });
    } catch (err) {
        console.error("PATCH /api/admin/users/[id]/role:", err);
        const msg = err?.message || "Failed to update role.";
        const status = /Cast to ObjectId failed/i.test(msg) ? 400 : 500;
        return NextResponse.json({ error: msg }, { status });
    }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "../../../../../../backend/db/mongodb.js";
import User from "../../../../../../backend/models/User.js";
import { getUserIdFromRequest } from "@/lib/apiUser";

export async function POST(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const currentPassword = String(body.currentPassword || "");
        const newPassword = String(body.newPassword || "");

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
        }
        if (newPassword.length < 6) {
            return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
        }

        const user = await User.findById(userId).select("+password");
        if (!user || user.isAnonymous) {
            return NextResponse.json({ error: "Password change is not available for this account." }, { status: 403 });
        }
        if (!user.password) {
            return NextResponse.json({ error: "This account uses Google sign-in. Set a password via account recovery or support." }, { status: 400 });
        }

        const ok = await bcrypt.compare(currentPassword, user.password);
        if (!ok) {
            return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
        }

        user.password = newPassword;
        await user.save();

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error("POST /api/auth/password:", err);
        return NextResponse.json({ error: err.message || "Failed to change password" }, { status: 500 });
    }
}

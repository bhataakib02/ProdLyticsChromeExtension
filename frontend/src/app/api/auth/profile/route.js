import { NextResponse } from "next/server";
import dbConnect from "../../../../../../backend/db/mongodb.js";
import User from "../../../../../../backend/models/User.js";
import { getUserIdFromRequest } from "@/lib/apiUser";

export async function PATCH(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (user.isAnonymous || String(user.email || "").startsWith("anon-")) {
            return NextResponse.json({ error: "Profile editing requires a registered account." }, { status: 403 });
        }

        const body = await req.json().catch(() => ({}));
        const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : undefined;
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
        const avatar = typeof body.avatar === "string" ? body.avatar.trim().slice(0, 2000) : undefined;

        if (email) {
            if (!/^\S+@\S+\.\S+$/.test(email)) {
                return NextResponse.json({ error: "Invalid email." }, { status: 400 });
            }
            const exists = await User.findOne({ email, _id: { $ne: userId } }).select("_id").lean();
            if (exists) {
                return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
            }
            user.email = email;
        }
        if (name !== undefined) user.name = name || user.name;
        if (avatar !== undefined) {
            user.avatar = avatar;
            user.image = avatar;
        }

        await user.save();

        return NextResponse.json({
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            avatar: user.avatar || "",
        });
    } catch (err) {
        console.error("PATCH /api/auth/profile:", err);
        return NextResponse.json({ error: err.message || "Update failed" }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "../../../../../../backend/db/mongodb.js";
import User from "../../../../../../backend/models/User.js";
import { signUserJwt } from "@/lib/jwt";

export async function POST(req) {
    try {
        await dbConnect();
        const body = await req.json().catch(() => ({}));
        const email = String(body?.email || "")
            .trim()
            .toLowerCase();
        const password = String(body?.password || "").trim();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
        }

        const user = await User.findOne({ email }).select("+password");
        if (!user || !user.password) {
            return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
        }

        const hash = String(user.password);
        let ok = false;
        try {
            ok = await bcrypt.compare(password, hash);
        } catch {
            ok = false;
        }
        if (!ok) {
            return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
        }

        user.isAnonymous = false;
        if (!user.subscription) user.subscription = user.isPremium ? "pro" : "free";
        user.isPremium = user.subscription === "pro";
        user.lastSeen = new Date();
        await user.save();

        const accessToken = await signUserJwt(user._id.toString());
        return NextResponse.json({
            accessToken,
            user: {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                avatar: user.avatar || "",
                subscription: user.subscription || "free",
                role: user.role || "user",
            },
        });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Login failed." }, { status: 500 });
    }
}

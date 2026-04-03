import { NextResponse } from "next/server";
import dbConnect from "../../../../../../backend/db/mongodb.js";
import User from "../../../../../../backend/models/User.js";

/**
 * One-time: create admin user in the SAME MongoDB your Next.js app uses.
 * POST JSON: { "email": "admin@gmail.com", "password": "admin123", "name": "Admin" }
 * Header: x-setup-secret: <ADMIN_SETUP_SECRET from .env.local>
 */
export async function POST(req) {
    try {
        const expected = process.env.ADMIN_SETUP_SECRET?.trim();
        if (!expected) {
            return NextResponse.json(
                {
                    error:
                        "ADMIN_SETUP_SECRET is not set. Add it to frontend/.env.local (same file as MONGO_URI), restart dev server, then try again.",
                },
                { status: 503 }
            );
        }

        const hdr = req.headers.get("x-setup-secret") || "";
        const body = await req.json().catch(() => ({}));
        const secret = String(hdr || body?.secret || "").trim();
        if (secret !== expected) {
            return NextResponse.json({ error: "Invalid or missing setup secret." }, { status: 401 });
        }

        const email = String(body?.email || "admin@gmail.com")
            .trim()
            .toLowerCase();
        const password = String(body?.password || "").trim();
        const name = String(body?.name || "Admin").trim() || "Admin";

        if (!email || !password || password.length < 6) {
            return NextResponse.json(
                { error: "email and password (min 6 chars) are required." },
                { status: 400 }
            );
        }

        await dbConnect();

        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({
                name,
                email,
                password,
                role: "admin",
                subscription: "free",
                isPremium: false,
                isAnonymous: false,
            });
        } else {
            user.name = name;
            user.password = password;
            user.role = "admin";
            user.subscription = "free";
            user.isPremium = false;
            user.isAnonymous = false;
            await user.save();
        }

        return NextResponse.json({
            ok: true,
            message: "Admin user created or updated. You can log in at /auth/login.",
            user: {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                role: user.role || "admin",
                subscription: user.subscription || "free",
            },
        });
    } catch (error) {
        console.error("POST /api/auth/setup-admin:", error);
        return NextResponse.json({ error: error.message || "Setup failed." }, { status: 500 });
    }
}

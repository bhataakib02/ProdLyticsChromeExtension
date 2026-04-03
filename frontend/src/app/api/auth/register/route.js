import { NextResponse } from "next/server";
import dbConnect from "../../../../../../backend/db/mongodb.js";
import User from "../../../../../../backend/models/User.js";
import { getUserIdFromRequest } from "@/lib/apiUser";
import { signUserJwt } from "@/lib/jwt";

export async function POST(req) {
    try {
        await dbConnect();
        const body = await req.json().catch(() => ({}));
        const name = String(body?.name || "").trim();
        const email = String(body?.email || "")
            .trim()
            .toLowerCase();
        const password = String(body?.password || "");

        if (!name || !email || password.length < 6) {
            return NextResponse.json(
                { error: "Name, valid email, and password (min 6 chars) are required." },
                { status: 400 }
            );
        }

        const upgradeUserId = await getUserIdFromRequest(req);
        if (upgradeUserId) {
            const existingAnon = await User.findById(upgradeUserId);
            if (existingAnon?.isAnonymous) {
                const emailTaken = await User.findOne({ email, _id: { $ne: upgradeUserId } });
                if (emailTaken) {
                    return NextResponse.json({ error: "Email already registered." }, { status: 409 });
                }
                existingAnon.name = name;
                existingAnon.email = email;
                existingAnon.password = password;
                existingAnon.isAnonymous = false;
                existingAnon.anonymousDeviceKey = undefined;
                await existingAnon.save();

                let accessToken;
                try {
                    accessToken = await signUserJwt(existingAnon._id.toString());
                } catch (signErr) {
                    console.error("JWT sign after upgrade:", signErr);
                    return NextResponse.json(
                        { error: signErr.message || "Could not issue session." },
                        { status: 500 }
                    );
                }
                return NextResponse.json({
                    ok: true,
                    upgraded: true,
                    accessToken,
                    user: {
                        id: existingAnon._id.toString(),
                        email: existingAnon.email,
                        name: existingAnon.name,
                        role: existingAnon.role || "user",
                    },
                });
            }
        }

        const existing = await User.findOne({ email }).lean();
        if (existing) {
            return NextResponse.json({ error: "Email already registered." }, { status: 409 });
        }

        await User.create({
            name,
            email,
            password,
            subscription: "free",
            isPremium: false,
            isAnonymous: false,
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json({ error: error.message || "Registration failed." }, { status: 500 });
    }
}

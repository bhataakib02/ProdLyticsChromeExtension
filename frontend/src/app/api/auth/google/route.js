import { NextResponse } from "next/server";
import dbConnect, { isDbUnavailableError } from "../../../../../../backend/db/mongodb.js";
import User from "../../../../../../backend/models/User.js";
import { signUserJwt } from "@/lib/jwt";
import {
    verifyGoogleIdToken,
    verifyGoogleAccessToken,
    getGoogleWebClientAudiences,
} from "@/lib/googleVerify";
import { withCors, corsOptions } from "@/lib/cors";

export async function OPTIONS() {
    return corsOptions();
}

export async function POST(req) {
    try {
        await dbConnect();
        const body = await req.json().catch(() => ({}));
        const { idToken, accessToken } = body;

        let profile = null;
        const audiences = getGoogleWebClientAudiences();
        if (idToken && typeof idToken === "string") {
            profile = await verifyGoogleIdToken(idToken, audiences);
        } else if (accessToken && typeof accessToken === "string") {
            profile = await verifyGoogleAccessToken(accessToken);
        }

        if (!profile) {
            return withCors(NextResponse.json({ error: "Invalid or missing Google credentials" }, { status: 401 }));
        }

        const email = String(profile.email).toLowerCase();
        let user = await User.findOne({
            $or: [{ email }, { googleId: profile.sub }],
        });

        if (!user) {
            user = await User.create({
                name: profile.name || email.split("@")[0],
                email,
                googleId: profile.sub,
                avatar: profile.picture || "",
            });
        } else {
            user.googleId = user.googleId || profile.sub;
            if (profile.picture) user.avatar = profile.picture;
            if (profile.name) user.name = profile.name;
            user.lastSeen = new Date();
            await user.save();
        }

        let accessTokenJwt;
        try {
            accessTokenJwt = await signUserJwt(user._id.toString());
        } catch (signErr) {
            console.error("JWT sign error:", signErr);
            return withCors(
                NextResponse.json(
                    { error: signErr.message || "Server missing JWT_SECRET (min 16 chars)." },
                    { status: 500 }
                )
            );
        }
        return withCors(
            NextResponse.json({
                accessToken: accessTokenJwt,
                user: {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    avatar: user.avatar || "",
                },
            })
        );
    } catch (err) {
        console.error("POST /api/auth/google:", err);
        if (isDbUnavailableError(err)) {
            return withCors(NextResponse.json({ error: "Database unavailable" }, { status: 503 }));
        }
        return withCors(NextResponse.json({ error: err.message || "Auth failed" }, { status: 500 }));
    }
}

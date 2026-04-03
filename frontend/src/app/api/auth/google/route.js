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
import { getUserIdFromRequest } from "@/lib/apiUser";
import { mergeAnonymousUserIntoTarget } from "../../../../../../backend/lib/mergeAnonymousUserData.js";

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
        const bearerUserId = await getUserIdFromRequest(req);
        let bearerAnonId = null;
        if (bearerUserId) {
            const bu = await User.findById(bearerUserId).select("isAnonymous").lean();
            if (bu?.isAnonymous) bearerAnonId = bearerUserId;
        }

        let user = await User.findOne({
            $or: [{ email }, { googleId: profile.sub }],
        });

        if (!user && bearerAnonId) {
            const anon = await User.findById(bearerAnonId);
            if (anon?.isAnonymous) {
                anon.name = profile.name || email.split("@")[0];
                anon.email = email;
                anon.googleId = profile.sub;
                anon.image = profile.picture || "";
                anon.avatar = profile.picture || "";
                anon.isAnonymous = false;
                anon.anonymousDeviceKey = undefined;
                if (!anon.subscription) anon.subscription = "free";
                anon.isPremium = anon.subscription === "pro";
                anon.lastSeen = new Date();
                await anon.save();
                user = anon;
            }
        }

        if (!user) {
            user = await User.create({
                name: profile.name || email.split("@")[0],
                email,
                googleId: profile.sub,
                image: profile.picture || "",
                avatar: profile.picture || "",
                subscription: "free",
                isPremium: false,
                isAnonymous: false,
            });
        } else {
            if (bearerAnonId && !user._id.equals(bearerAnonId)) {
                await mergeAnonymousUserIntoTarget(bearerAnonId, user._id);
                user = await User.findById(user._id);
            }
            user.googleId = user.googleId || profile.sub;
            if (profile.picture) {
                user.avatar = profile.picture;
                user.image = profile.picture;
            }
            if (profile.name) user.name = profile.name;
            user.isAnonymous = false;
            user.anonymousDeviceKey = undefined;
            if (!user.subscription) user.subscription = user.isPremium ? "pro" : "free";
            user.isPremium = user.subscription === "pro";
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
                    subscription: user.subscription || (user.isPremium ? "pro" : "free"),
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

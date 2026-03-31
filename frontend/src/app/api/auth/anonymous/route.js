import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import dbConnect, { isDbUnavailableError } from "../../../../../../backend/db/mongodb.js";
import User from "../../../../../../backend/models/User.js";
import { signUserJwt } from "@/lib/jwt";
import { withCors, corsOptions } from "@/lib/cors";

export async function OPTIONS() {
    return corsOptions();
}

/**
 * Silent signup: no Google, no UI. Creates a dedicated MongoDB user + JWT for this browser/extension.
 */
export async function POST() {
    try {
        await dbConnect();
        const email = `anon-${randomUUID()}@anonymous.prodlytics`;
        const user = await User.create({
            name: "ProdLytics user",
            email,
            isAnonymous: true,
        });

        let accessToken;
        try {
            accessToken = await signUserJwt(user._id.toString());
        } catch (signErr) {
            await User.deleteOne({ _id: user._id }).catch(() => {});
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
                accessToken,
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    isAnonymous: true,
                },
            })
        );
    } catch (err) {
        console.error("POST /api/auth/anonymous:", err);
        if (isDbUnavailableError(err)) {
            return withCors(NextResponse.json({ error: "Database unavailable" }, { status: 503 }));
        }
        return withCors(NextResponse.json({ error: err.message || "Could not create account" }, { status: 500 }));
    }
}

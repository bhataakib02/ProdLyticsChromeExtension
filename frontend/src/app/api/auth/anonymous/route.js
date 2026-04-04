import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import dbConnect, { isDbUnavailableError } from "../../../../../../backend/db/mongodb.js";
import User from "../../../../../../backend/models/User.js";
import { signUserJwt } from "@/lib/jwt";
import { withCors, corsOptions } from "@/lib/cors";

export async function OPTIONS() {
    return corsOptions();
}

function isValidDeviceKey(s) {
    if (typeof s !== "string") return false;
    const t = s.trim();
    if (t.length < 32 || t.length > 64) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t);
}

/**
 * Silent signup: no Google, no UI.
 * Optional JSON body: `{ "deviceKey": "<uuid>" }` — same key from extension + web merges to one guest user.
 */
export async function POST(req) {
    try {
        await dbConnect();

        let deviceKey = null;
        try {
            const body = await req.json().catch(() => ({}));
            const raw = body?.deviceKey;
            if (typeof raw === "string" && isValidDeviceKey(raw)) {
                deviceKey = raw.trim();
            }
        } catch {
            /* no body */
        }

        if (deviceKey) {
            const existing = await User.findOne({
                anonymousDeviceKey: deviceKey,
                isAnonymous: true,
            }).lean();
            if (existing?._id) {
                const accessToken = await signUserJwt(existing._id.toString());
                return withCors(
                    NextResponse.json({
                        accessToken,
                        user: {
                            id: existing._id.toString(),
                            name: existing.name || "ProdLytics user",
                            isAnonymous: true,
                        },
                    })
                );
            }
        }

        const anonymousId = randomUUID().slice(0, 4).toUpperCase();
        const email = `anon-${randomUUID()}@anonymous.prodlytics`;
        const createPayload = {
            name: `ProdLytics User #${anonymousId}`,
            email,
            isAnonymous: true,
            subscription: "free",
            isPremium: false,
        };
        if (deviceKey) {
            createPayload.anonymousDeviceKey = deviceKey;
        }

        let user;
        try {
            user = await User.create(createPayload);
        } catch (err) {
            if (err?.code === 11000 && deviceKey) {
                const again = await User.findOne({ anonymousDeviceKey: deviceKey, isAnonymous: true });
                if (again?._id) {
                    const accessToken = await signUserJwt(again._id.toString());
                    return withCors(
                        NextResponse.json({
                            accessToken,
                            user: {
                                id: again._id.toString(),
                                name: again.name || "ProdLytics user",
                                isAnonymous: true,
                            },
                        })
                    );
                }
            }
            throw err;
        }

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

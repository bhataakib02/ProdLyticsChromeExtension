import { NextResponse } from "next/server";
import dbConnect, { isDbUnavailableError } from "../../../../../../backend/db/mongodb.js";
import User from "../../../../../../backend/models/User.js";
import { getUserIdFromRequest } from "@/lib/apiUser";
import { withCors, corsOptions } from "@/lib/cors";

export async function OPTIONS() {
    return corsOptions();
}

export async function GET(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }
        const user = await User.findById(userId).select("name email avatar isAnonymous").lean();
        if (!user) {
            return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }
        const anonymous = Boolean(user.isAnonymous) || String(user.email || "").startsWith("anon-");
        return withCors(
            NextResponse.json({
                id: user._id.toString(),
                email: anonymous ? "" : user.email,
                name: anonymous ? "ProdLytics user" : user.name,
                avatar: anonymous ? "" : user.avatar || "",
                isAnonymous: anonymous,
            })
        );
    } catch (err) {
        console.error("GET /api/auth/me:", err);
        if (isDbUnavailableError(err)) {
            return withCors(NextResponse.json({ error: "Database unavailable" }, { status: 503 }));
        }
        return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

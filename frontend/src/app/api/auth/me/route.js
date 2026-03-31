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
        const user = await User.findById(userId).select("name email avatar").lean();
        if (!user) {
            return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }
        return withCors(
            NextResponse.json({
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                avatar: user.avatar || "",
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

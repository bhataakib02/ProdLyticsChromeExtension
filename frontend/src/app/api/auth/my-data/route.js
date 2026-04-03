import { NextResponse } from "next/server";
import dbConnect, { isDbUnavailableError } from "@backend/db/mongodb.js";
import { getUserIdFromRequest } from "@/lib/apiUser";
import { withCors, corsOptions } from "@/lib/cors";
import { buildUserDataExportPayload, pickBoolean } from "@/lib/userDataExportServer";

export async function OPTIONS() {
    return corsOptions();
}

/**
 * GET /api/auth/my-data
 * - Default: returns proof-style per-user counts + latest activity info.
 * - ?includeRaw=true: also returns raw documents (still only for this user).
 */
export async function GET(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }

        const { searchParams } = new URL(req.url);
        const includeRaw = pickBoolean(searchParams.get("includeRaw"));

        const payload = await buildUserDataExportPayload(userId, {
            includeRaw,
            exportSource: "self_service",
        });

        return withCors(NextResponse.json(payload));
    } catch (err) {
        console.error("GET /api/auth/my-data:", err);
        if (isDbUnavailableError(err)) {
            return withCors(NextResponse.json({ error: "Database unavailable" }, { status: 503 }));
        }
        return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

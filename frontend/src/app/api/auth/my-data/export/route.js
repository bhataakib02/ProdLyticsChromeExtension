import { NextResponse } from "next/server";
import dbConnect, { isDbUnavailableError } from "../../../../../../../backend/db/mongodb.js";
import { getUserIdFromRequest } from "@/lib/apiUser";
import { withCors, corsOptions } from "@/lib/cors";
import { buildUserDataCsvZipBuffer, buildUserDataPdfBuffer } from "@/lib/userDataExportFormatsServer";

export async function OPTIONS() {
    return corsOptions();
}

/**
 * GET /api/auth/my-data/export?format=csv|pdf
 * Authenticated user only — same files as admin export, scoped to the signed-in account.
 */
export async function GET(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }

        const { searchParams } = new URL(req.url);
        const format = String(searchParams.get("format") || "csv").toLowerCase();

        if (format === "csv" || format === "zip") {
            const buf = await buildUserDataCsvZipBuffer(userId, "self_service");
            return withCors(
                new NextResponse(buf, {
                    status: 200,
                    headers: {
                        "Content-Type": "application/zip",
                        "Content-Disposition": `attachment; filename="prodlytics-my-data-csv.zip"`,
                        "Cache-Control": "no-store",
                    },
                })
            );
        }

        if (format === "pdf") {
            const buf = await buildUserDataPdfBuffer(userId, "self_service");
            return withCors(
                new NextResponse(buf, {
                    status: 200,
                    headers: {
                        "Content-Type": "application/pdf",
                        "Content-Disposition": `attachment; filename="prodlytics-my-data-summary.pdf"`,
                        "Cache-Control": "no-store",
                    },
                })
            );
        }

        return withCors(NextResponse.json({ error: 'Use format=csv or format=pdf.' }, { status: 400 }));
    } catch (err) {
        console.error("GET /api/auth/my-data/export:", err);
        if (isDbUnavailableError(err)) {
            return withCors(NextResponse.json({ error: "Database unavailable" }, { status: 503 }));
        }
        return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

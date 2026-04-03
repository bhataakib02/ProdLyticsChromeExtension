import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdminUser } from "@/lib/adminAuth";
import { buildUserDataExportPayload, pickBoolean } from "@/lib/userDataExportServer";
import { buildUserDataCsvZipBuffer, buildUserDataPdfBuffer } from "@/lib/userDataExportFormatsServer";
import { isDbUnavailableError } from "../../../../../../../../backend/db/mongodb.js";
import User from "../../../../../../../../backend/models/User.js";

/**
 * GET /api/admin/users/:id/export-data
 * Admin-only.
 * - format=json (default): JSON body; use includeRaw=true for full dump (same as /api/auth/my-data).
 * - format=csv: application/zip of multiple .csv files (send to users who want Excel/Sheets).
 * - format=pdf: application/pdf summary (readable; CSV ZIP has complete capped rows).
 */
export async function GET(req, ctx) {
    const admin = await requireAdminUser(req);
    if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const params = await Promise.resolve(ctx.params);
    const id = String(params?.id || "").trim();
    if (!id || !mongoose.isValidObjectId(id)) {
        return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
    }

    const userId = new mongoose.Types.ObjectId(id);
    const { searchParams } = new URL(req.url);
    const format = String(searchParams.get("format") || "json").toLowerCase();
    const includeRaw = pickBoolean(searchParams.get("includeRaw"));

    try {
        const exists = await User.exists({ _id: userId });
        if (!exists) return NextResponse.json({ error: "User not found." }, { status: 404 });

        if (format === "csv" || format === "zip") {
            const buf = await buildUserDataCsvZipBuffer(userId, "admin_dashboard");
            return new NextResponse(buf, {
                status: 200,
                headers: {
                    "Content-Type": "application/zip",
                    "Content-Disposition": `attachment; filename="prodlytics-user-${id}-data-csv.zip"`,
                    "Cache-Control": "no-store",
                },
            });
        }

        if (format === "pdf") {
            const buf = await buildUserDataPdfBuffer(userId, "admin_dashboard");
            return new NextResponse(buf, {
                status: 200,
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="prodlytics-user-${id}-data-summary.pdf"`,
                    "Cache-Control": "no-store",
                },
            });
        }

        const payload = await buildUserDataExportPayload(userId, {
            includeRaw,
            exportSource: "admin_dashboard",
        });

        const filename = `prodlytics-user-${id}${includeRaw ? "-full" : "-summary"}.json`;
        return NextResponse.json(payload, {
            headers: {
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (err) {
        console.error("GET /api/admin/users/[id]/export-data:", err);
        if (isDbUnavailableError(err)) {
            return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

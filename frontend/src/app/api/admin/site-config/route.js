import { NextResponse } from "next/server";
import SiteConfig from "../../../../../../backend/models/SiteConfig.js";
import { requireAdminUser } from "@/lib/adminAuth";

export async function GET(req) {
    const admin = await requireAdminUser(req);
    if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const configs = await SiteConfig.find({});
    // Diagnostic trace
    return NextResponse.json([...configs, { key: "debug_trace", value: "api_connected_" + Date.now() }]);
}

export async function PATCH(req) {
    const admin = await requireAdminUser(req);
    if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

    try {
        const { key, value, description } = await req.json();
        if (!key) return NextResponse.json({ error: "Key is required" }, { status: 400 });

        const config = await SiteConfig.findOneAndUpdate(
            { key },
            { value, description, updatedBy: admin.id },
            { upsert: true, new: true }
        );

        return NextResponse.json(config);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

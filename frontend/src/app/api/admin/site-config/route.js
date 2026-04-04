import { NextResponse } from "next/server";
import mongoose from "mongoose";
import SiteConfig from "../../../../../../backend/models/SiteConfig.js";
import { requireAdminUser } from "@/lib/adminAuth";

export async function GET(req) {
    const admin = await requireAdminUser(req);
    if (admin.error) return NextResponse.json({ error: admin.error }, { status: admin.status });

    const db = mongoose.connection.db;
    let configs = await db.collection("siteconfigs").find({}).toArray();
    
    let debugMsg = "db_" + mongoose.connection.name;
    if (configs.length === 0) {
        try {
            const cols = await db.listCollections().toArray();
            debugMsg += "_cols_" + cols.map(c => c.name).join(",");
        } catch (e) {
            debugMsg += "_err_" + e.message;
        }
    } else {
        debugMsg += "_found_" + configs.length;
    }
    
    return NextResponse.json([
        ...configs.map(c => ({ ...c, _id: c._id?.toString(), id: c._id?.toString() })), 
        { key: "debug_trace", value: debugMsg + "_" + Date.now() }
    ]);
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

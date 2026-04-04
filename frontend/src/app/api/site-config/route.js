import { NextResponse } from "next/server";
import SiteConfig from "../../../../../../backend/models/SiteConfig.js";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (key) {
        const config = await SiteConfig.findOne({ key });
        if (!config) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(config);
    }

    const configs = await SiteConfig.find({});
    return NextResponse.json(configs);
}

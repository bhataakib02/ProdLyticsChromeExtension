import { NextResponse } from 'next/server';
import dbConnect, { isDbUnavailableError } from '../../../../../backend/db/mongodb.js';
import Goal from '../../../../../backend/models/Goal.js';
import { getUserIdFromRequest } from '@/lib/apiUser';
import { splitGoalWebsiteForStorage, normalizeStoredPathPrefix } from '@/lib/goalWebsiteSpec';

function normalizeGoalWebsite(body) {
    if (!body || typeof body !== "object") return body;
    const next = { ...body };
    if (typeof next.website === "string") {
        const raw = next.website.trim();
        if (raw === "*" || raw === "") {
            next.website = raw;
            next.pathPrefix = "";
        } else {
            const spec = splitGoalWebsiteForStorage(raw);
            next.website = spec.host;
            next.pathPrefix = normalizeStoredPathPrefix(spec.pathPrefix);
        }
    }
    if ("pathPrefix" in next) {
        next.pathPrefix = normalizeStoredPathPrefix(next.pathPrefix);
    }
    return next;
}

export async function GET(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (id) {
            const goal = await Goal.findOne({ _id: id, userId });
            return NextResponse.json(goal);
        }

        const goals = await Goal.find({ userId });
        return NextResponse.json(goals);
    } catch (err) {
        console.error("Goals GET Error:", err);
        if (isDbUnavailableError(err)) {
            const { searchParams } = new URL(req.url);
            const id = searchParams.get("id");
            return NextResponse.json(id ? null : []);
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = normalizeGoalWebsite(await req.json());
        const goal = await Goal.create({ ...body, userId });
        return NextResponse.json(goal);
    } catch (err) {
        console.error("Goals POST Error:", err);
        if (isDbUnavailableError(err)) {
            return NextResponse.json({ success: true, offline: true });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const body = normalizeGoalWebsite(await req.json());
        const goal = await Goal.findOneAndUpdate({ _id: id, userId }, body, { returnDocument: "after" });
        return NextResponse.json(goal);
    } catch (err) {
        console.error("Goals PUT Error:", err);
        if (isDbUnavailableError(err)) {
            return NextResponse.json({ success: true, offline: true });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await Goal.findOneAndDelete({ _id: id, userId });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Goals DELETE Error:", err);
        if (isDbUnavailableError(err)) {
            return NextResponse.json({ success: true, offline: true });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

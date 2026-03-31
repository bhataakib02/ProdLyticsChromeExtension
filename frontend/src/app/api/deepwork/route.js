import { NextResponse } from 'next/server';
import dbConnect, { isDbUnavailableError } from '../../../../../backend/db/mongodb.js';
import DeepWorkSession from '../../../../../backend/models/DeepWorkSession.js';
import { withCors, corsOptions } from '@/lib/cors';
import { getUserIdFromRequest } from '@/lib/apiUser';

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
        const sessions = await DeepWorkSession.find({ userId })
            .sort({ startedAt: -1 })
            .limit(20)
            .lean();
        return withCors(NextResponse.json(sessions));
    } catch (err) {
        console.error("DeepWork GET Error:", err);
        if (isDbUnavailableError(err)) {
            return withCors(NextResponse.json([]));
        }
        return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

const ALLOWED_TYPES = new Set(["work", "short_break", "long_break"]);

export async function POST(req) {
    try {
        await dbConnect();
        const userId = await getUserIdFromRequest(req);
        if (!userId) {
            return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
        }
        const body = await req.json();
        const type = ALLOWED_TYPES.has(body?.type) ? body.type : "work";
        const durationMinutes = Math.min(480, Math.max(1, Number(body?.durationMinutes) || 25));
        const actualMinutes = Math.min(480, Math.max(0, Number(body?.actualMinutes) ?? durationMinutes));
        const doc = {
            userId,
            type,
            durationMinutes,
            actualMinutes,
            completed: body?.completed !== false,
            startedAt: body?.startedAt ? new Date(body.startedAt) : new Date(),
            endedAt: body?.endedAt ? new Date(body.endedAt) : new Date(),
            task: typeof body?.task === "string" ? body.task.slice(0, 500) : "",
            subtasks: Array.isArray(body?.subtasks)
                ? body.subtasks.slice(0, 30).map((s) => ({
                      text: String(s?.text || "").slice(0, 300),
                      completed: !!s?.completed,
                  }))
                : [],
        };
        const session = await DeepWorkSession.create(doc);
        return withCors(NextResponse.json(session));
    } catch (err) {
        console.error("DeepWork POST Error:", err);
        if (isDbUnavailableError(err)) {
            return withCors(NextResponse.json({ success: true, offline: true }));
        }
        return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

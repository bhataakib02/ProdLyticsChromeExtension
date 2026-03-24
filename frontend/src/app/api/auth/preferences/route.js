import { NextResponse } from 'next/server';
import { withCors, corsOptions } from '@/lib/cors';

export async function OPTIONS() {
    return corsOptions();
}

const DEFAULT_PREFERENCES = {
    strictMode: true,
    smartBlock: true,
    breakReminders: true,
    theme: "dark"
};

export async function GET() {
    return withCors(NextResponse.json(DEFAULT_PREFERENCES));
}

// This is a mock API for preferences since auth is mocked in the frontend
export async function PUT(req) {
    try {
        const body = await req.json();
        console.log("Saving preferences:", body);
        return withCors(NextResponse.json({ success: true, preferences: body }));
    } catch (err) {
        console.error("Auth Preferences PUT Error:", err);
        return withCors(NextResponse.json({ error: err.message }, { status: 500 }));
    }
}

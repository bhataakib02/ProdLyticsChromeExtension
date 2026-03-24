import { NextResponse } from 'next/server';

// This is a mock API for preferences since auth is mocked in the frontend
export async function PUT(req) {
    try {
        const body = await req.json();
        console.log("Saving preferences:", body);
        return NextResponse.json({ success: true, preferences: body });
    } catch (err) {
        console.error("Auth Preferences PUT Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

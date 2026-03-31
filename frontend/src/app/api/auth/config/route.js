import { NextResponse } from "next/server";

/**
 * Public OAuth config for the browser (Google client IDs are not secret in web flows).
 * Lets production use only GOOGLE_CLIENT_ID on the server without duplicating NEXT_PUBLIC_* at build time.
 */
export async function GET() {
    const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
    const configured = Boolean(googleClientId && process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16);
    return NextResponse.json({
        googleClientId,
        authReady: configured,
    });
}

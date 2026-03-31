/**
 * Verify Google-issued tokens for /api/auth/google.
 * - idToken: GIS / One Tap (audience must match your Web client ID).
 * - accessToken: Chrome extension chrome.identity.getAuthToken.
 */

export async function verifyGoogleIdToken(idToken, allowedAudiences) {
    if (!allowedAudiences.length) return null;
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    const aud = data.aud;
    const ok = Array.isArray(aud) ? aud.some((a) => allowedAudiences.includes(a)) : allowedAudiences.includes(aud);
    if (!ok) return null;
    return {
        sub: data.sub,
        email: data.email,
        name: data.name || data.email?.split("@")[0] || "User",
        picture: data.picture || "",
    };
}

export async function verifyGoogleAccessToken(accessToken) {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.sub || !data.email) return null;
    return {
        sub: data.sub,
        email: data.email,
        name: data.name || data.email.split("@")[0],
        picture: data.picture || "",
    };
}

/** Comma-separated client IDs in GOOGLE_CLIENT_ID or NEXT_PUBLIC_GOOGLE_CLIENT_ID (web app / GIS). */
export function getGoogleWebClientAudiences() {
    const raw = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

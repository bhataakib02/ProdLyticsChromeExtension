/**
 * Accepts "youtube.com", "www.youtube.com", "https://www.youtube.com/watch?v=1", etc.
 * Returns bare registrable-style host for blocking, e.g. "youtube.com".
 */
export function normalizeWebsiteHost(input) {
    if (!input || typeof input !== "string") return "";
    let s = input.trim().toLowerCase();
    s = s.replace(/\/+$/, "");
    try {
        const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//.test(s);
        const href = hasScheme ? s : `https://${s.replace(/^\/+/, "")}`;
        const u = new URL(href);
        if (!u.hostname) return "";
        return u.hostname.replace(/^www\./, "");
    } catch {
        return s
            .replace(/^https?:\/\//, "")
            .split("/")[0]
            .replace(/^www\./, "");
    }
}

import { MAX_PATH_LEN } from "./privacyNormalizeUrl";

/** Stored/API: empty, "/", or whitespace → no path filter (whole host counts toward the goal). */
export function normalizeStoredPathPrefix(raw) {
    if (raw == null) return "";
    const s = String(raw).trim();
    if (!s || s === "/") return "";
    return s;
}

/**
 * Parse objective "website" input into stored host + optional path prefix (no query/hash).
 * Host-only → pathPrefix "" (goal counts all time on that domain in real time).
 */
export function splitGoalWebsiteForStorage(raw) {
    const trimmed = (raw || "").trim();
    if (!trimmed || trimmed === "*") {
        return { host: "*", pathPrefix: "" };
    }
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//.test(trimmed);
    const href = hasScheme ? trimmed : `https://${trimmed.replace(/^\/+/, "")}`;
    let u;
    try {
        u = new URL(href);
    } catch {
        const host = trimmed
            .replace(/^https?:\/\//, "")
            .split("/")[0]
            .replace(/^www\./, "")
            .toLowerCase();
        return { host: host || trimmed.toLowerCase(), pathPrefix: "" };
    }
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    let path = u.pathname || "/";
    path = path.replace(/\/+/g, "/");
    if (path.length > 1) {
        path = path.replace(/\/+$/, "") || "/";
    }
    path = path.toLowerCase();
    try {
        path = decodeURIComponent(path);
    } catch {
        /* ignore */
    }
    if (path.length > MAX_PATH_LEN) {
        path = path.slice(0, MAX_PATH_LEN);
    }
    let pathPrefix = path === "/" || path === "" ? "" : path.startsWith("/") ? path : `/${path}`;
    pathPrefix = normalizeStoredPathPrefix(pathPrefix);
    return { host, pathPrefix };
}

/**
 * Privacy-first URL normalization for tracking: hostname + pathname only.
 * Strips query strings, hash, and credentials — never stores tokens from URLs.
 */

export const MAX_PATH_LEN = 200;

/**
 * @param {string} href
 * @returns {{ host: string, pathNorm: string }}
 */
export function privacyNormalizeUrl(href) {
    try {
        const u = new URL(href);
        if (u.protocol !== "http:" && u.protocol !== "https:") {
            return { host: "", pathNorm: "" };
        }
        const host = u.hostname.toLowerCase().replace(/^www\./, "");
        let pathname = u.pathname || "/";
        pathname = pathname.replace(/\/+/g, "/");
        if (pathname.length > 1) {
            pathname = pathname.replace(/\/+$/, "");
        }
        pathname = pathname.toLowerCase();
        try {
            pathname = decodeURIComponent(pathname);
        } catch {
            /* ignore */
        }
        if (pathname.length > MAX_PATH_LEN) {
            pathname = pathname.slice(0, MAX_PATH_LEN);
        }
        if (pathname === "/" || pathname === "") {
            return { host, pathNorm: "" };
        }
        const pathNorm = pathname.startsWith("/") ? pathname : `/${pathname}`;
        return { host, pathNorm };
    } catch {
        return { host: "", pathNorm: "" };
    }
}

/** Server-side guard for client-sent pathNorm. */
export function sanitizePathNormField(raw, maxLen = MAX_PATH_LEN) {
    if (raw == null || typeof raw !== "string") return "";
    let p = raw.trim().toLowerCase();
    if (!p || p === "/") return "";
    p = p.replace(/\/+/g, "/");
    if (!p.startsWith("/")) p = `/${p}`;
    if (p.length > 1) p = p.replace(/\/+$/, "");
    return p.length > maxLen ? p.slice(0, maxLen) : p;
}

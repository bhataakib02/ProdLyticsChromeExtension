/**
 * Keep in sync with frontend/src/lib/privacyNormalizeUrl.js
 * Privacy-first: hostname + pathname only (no query, hash, or userinfo).
 */

export const MAX_PATH_LEN = 200;

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

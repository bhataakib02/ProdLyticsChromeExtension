/**
 * Notifies the ProdLytics content script to refresh blocklist + preferences from the API.
 * Uses window.postMessage so it works with unpacked dev extensions (no hard-coded extension id).
 */
function isProdlyticsDashboardPage() {
    if (typeof window === "undefined") return false;
    const { protocol, hostname } = window.location;
    const publicHost =
        (typeof process !== "undefined" && process.env.NEXT_PUBLIC_PRODLYTICS_DASHBOARD_HOST) || "";
    if (publicHost && hostname === publicHost) return protocol === "https:";
    if (hostname === "localhost" || hostname === "127.0.0.1") return protocol === "http:";
    if (hostname === "prodlytics.vercel.app") return protocol === "https:";
    return false;
}

export function requestExtensionSync() {
    if (typeof window === "undefined") return;
    if (!isProdlyticsDashboardPage()) return;
    window.postMessage(
        { type: "PRODLYTICS_SYNC_EXTENSION", source: "prodlytics-dashboard" },
        window.location.origin
    );
}

const BRIDGE_REPLY_SOURCE = "prodlytics-extension-bridge";

/**
 * Read JWT from the ProdLytics extension (chrome.storage) via the content script.
 * Uses window.postMessage so no NEXT_PUBLIC_EXTENSION_ID is required.
 */
export function bridgeGetAccessToken({ timeoutMs = 1800 } = {}) {
    if (typeof window === "undefined" || !isProdlyticsDashboardPage()) {
        return Promise.resolve(null);
    }
    return new Promise((resolve) => {
        const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const timer = setTimeout(() => {
            window.removeEventListener("message", onReply);
            resolve(null);
        }, timeoutMs);
        function onReply(event) {
            if (event.source !== window) return;
            if (event.origin !== window.location.origin) return;
            if (event.data?.source !== BRIDGE_REPLY_SOURCE) return;
            if (event.data?.type !== "PRODLYTICS_ACCESS_TOKEN_REPLY" || event.data?.nonce !== nonce) return;
            clearTimeout(timer);
            window.removeEventListener("message", onReply);
            const t = event.data.accessToken;
            resolve(typeof t === "string" && t.length > 0 ? t : null);
        }
        window.addEventListener("message", onReply);
        window.postMessage(
            { type: "PRODLYTICS_GET_ACCESS_TOKEN", source: "prodlytics-dashboard", nonce },
            window.location.origin
        );
    });
}

/** Push dashboard JWT into the extension so popup/background use the same session. */
export function bridgeSetAccessToken(accessToken) {
    if (typeof window === "undefined" || !isProdlyticsDashboardPage()) return;
    if (!accessToken || typeof accessToken !== "string") return;
    window.postMessage(
        {
            type: "PRODLYTICS_SET_ACCESS_TOKEN",
            source: "prodlytics-dashboard",
            accessToken,
        },
        window.location.origin
    );
}

/** Clear JWT in the extension (e.g. logout / new session). */
export function bridgeClearAccessToken() {
    if (typeof window === "undefined" || !isProdlyticsDashboardPage()) return;
    window.postMessage(
        { type: "PRODLYTICS_CLEAR_ACCESS_TOKEN", source: "prodlytics-dashboard" },
        window.location.origin
    );
}

/**
 * Shows a ProdLytics toast on whatever tab is currently focused (via extension),
 * not only the dashboard. Falls back to a system notification if the active tab
 * cannot run the content script (e.g. chrome:// URLs).
 */
/**
 * @param {object} opts
 * @param {boolean} [opts.systemNotify] — also show a Chrome / OS notification (goal, deep work, etc.)
 * @param {string} [opts.targetHost] — bare hostname (e.g. youtube.com): show in-page toast on every open tab on that site
 */
export function requestExtensionWorkspaceToast({
    title,
    message,
    variant = "success",
    systemNotify = false,
    targetHost,
}) {
    if (typeof window === "undefined") return;
    if (!isProdlyticsDashboardPage()) return;
    const { origin } = window.location;
    const th = typeof targetHost === "string" ? targetHost.trim() : "";
    window.postMessage(
        {
            type: "PRODLYTICS_WORKSPACE_TOAST",
            source: "prodlytics-dashboard",
            title: title || "ProdLytics",
            message: message || "",
            variant,
            systemNotify: Boolean(systemNotify),
            ...(th && th !== "*" ? { targetHost: th } : {}),
        },
        origin
    );
}

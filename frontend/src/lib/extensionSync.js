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

/**
 * Shows a ProdLytics toast on whatever tab is currently focused (via extension),
 * not only the dashboard. Falls back to a system notification if the active tab
 * cannot run the content script (e.g. chrome:// URLs).
 */
/**
 * @param {object} opts
 * @param {boolean} [opts.systemNotify] — also show a Chrome / OS notification (goal, deep work, etc.)
 */
export function requestExtensionWorkspaceToast({ title, message, variant = "success", systemNotify = false }) {
    if (typeof window === "undefined") return;
    if (!isProdlyticsDashboardPage()) return;
    const { origin } = window.location;
    window.postMessage(
        {
            type: "PRODLYTICS_WORKSPACE_TOAST",
            source: "prodlytics-dashboard",
            title: title || "ProdLytics",
            message: message || "",
            variant,
            systemNotify: Boolean(systemNotify),
        },
        origin
    );
}

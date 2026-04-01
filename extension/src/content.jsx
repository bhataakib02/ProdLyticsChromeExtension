/**
 * Content Script
 * Extracts page title and sends to background for classification
 * Tracks scroll and interaction activity for engagement proxy
 */

import { DASHBOARD_ORIGIN } from "./buildEnv.js";

/** Match built dashboard URL: same host+port, ignore www; localhost ↔ 127.0.0.1. */
function pageMatchesDashboardBuild() {
    try {
        const expected = DASHBOARD_ORIGIN.replace(/\/+$/, "");
        const pageOrigin = window.location.origin;
        if (pageOrigin === expected) return true;
        const base = new URL(expected + "/");
        const page = new URL(pageOrigin + "/");
        const bh = base.hostname.replace(/^www\./i, "").toLowerCase();
        const ph = page.hostname.replace(/^www\./i, "").toLowerCase();
        if (bh !== ph) {
            const loc = (h) => h === "localhost" || h === "127.0.0.1";
            if (!(loc(bh) && loc(ph))) return false;
        }
        const bp = base.port || (base.protocol === "https:" ? "443" : "80");
        const pp = page.port || (page.protocol === "https:" ? "443" : "80");
        return bp === pp;
    } catch {
        return false;
    }
}

/** After extension reload, old content scripts throw "Extension context invalidated" on sendMessage — swallow so Errors page stays clean. */
function safeRuntimeSendMessage(payload) {
    try {
        chrome.runtime.sendMessage(payload, () => {
            void chrome.runtime.lastError;
        });
    } catch {
        /* context invalidated; refresh the tab to attach a new content script */
    }
}

// Dashboard (same host as built-in DASHBOARD_ORIGIN) → background: sync, JWT bridge, workspace toasts
(() => {
    try {
        if (!pageMatchesDashboardBuild()) return;
        const { origin } = window.location;

        function pushTokenToPageLocalStorage(token) {
            try {
                if (token && typeof token === "string") {
                    localStorage.setItem("accessToken", token);
                } else {
                    localStorage.removeItem("accessToken");
                }
            } catch {
                /* ignore */
            }
        }

        chrome.storage.local.get(["accessToken"], (r) => {
            if (chrome.runtime.lastError) return;
            if (r?.accessToken) pushTokenToPageLocalStorage(r.accessToken);
        });

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== "local" || !changes.accessToken) return;
            const next = changes.accessToken.newValue;
            if (next === undefined) {
                pushTokenToPageLocalStorage("");
            } else if (typeof next === "string") {
                pushTokenToPageLocalStorage(next);
            }
        });

        window.addEventListener("message", (event) => {
            if (event.source !== window) return;
            if (event.origin !== origin) return;
            if (event.data?.source !== "prodlytics-dashboard") return;

            if (event.data?.type === "PRODLYTICS_GET_ACCESS_TOKEN") {
                const nonce = event.data.nonce;
                chrome.storage.local.get(["accessToken"], (r) => {
                    if (chrome.runtime.lastError) {
                        window.postMessage(
                            {
                                source: "prodlytics-extension-bridge",
                                type: "PRODLYTICS_ACCESS_TOKEN_REPLY",
                                nonce,
                                accessToken: "",
                            },
                            origin
                        );
                        return;
                    }
                    window.postMessage(
                        {
                            source: "prodlytics-extension-bridge",
                            type: "PRODLYTICS_ACCESS_TOKEN_REPLY",
                            nonce,
                            accessToken: r?.accessToken && typeof r.accessToken === "string" ? r.accessToken : "",
                        },
                        origin
                    );
                });
                return;
            }

            if (event.data?.type === "PRODLYTICS_SET_ACCESS_TOKEN") {
                const t = event.data.accessToken;
                if (typeof t === "string" && t.length > 0) {
                    chrome.storage.local.set({ accessToken: t });
                    pushTokenToPageLocalStorage(t);
                }
                return;
            }

            if (event.data?.type === "PRODLYTICS_CLEAR_ACCESS_TOKEN") {
                chrome.storage.local.remove("accessToken");
                pushTokenToPageLocalStorage("");
                return;
            }

            if (event.data?.type === "PRODLYTICS_SYNC_EXTENSION") {
                safeRuntimeSendMessage({ action: "syncAll" });
                return;
            }
            if (event.data?.type === "PRODLYTICS_WORKSPACE_TOAST") {
                safeRuntimeSendMessage({
                    action: "workspaceToastFromDashboard",
                    title: event.data.title,
                    message: event.data.message,
                    variant: event.data.variant || "success",
                    systemNotify: Boolean(event.data.systemNotify),
                    targetHost: typeof event.data.targetHost === "string" ? event.data.targetHost : "",
                });
            }
        });
    } catch (err) { /* ignore */ }
})();

function showProdlyticsWorkspaceToast(title, message, variant = "success") {
    const existing = document.getElementById("prodlytics-workspace-toast");
    if (existing) existing.remove();

    const wrap = document.createElement("div");
    wrap.id = "prodlytics-workspace-toast";
    wrap.setAttribute("role", "status");
    wrap.setAttribute("aria-live", "polite");

    const prefersLight =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: light)").matches;

    const accent = variant === "error" ? (prefersLight ? "#dc2626" : "#f87171") : prefersLight ? "#4f46e5" : "#a5b4fc";
    const bg = prefersLight ? "rgba(255, 255, 255, 0.97)" : "rgba(15, 23, 42, 0.96)";
    const fg = prefersLight ? "#0f172a" : "#f1f5f9";
    const borderCol = prefersLight ? "rgba(15, 23, 42, 0.12)" : "rgba(255, 255, 255, 0.14)";
    const shadow = prefersLight
        ? "0 12px 40px rgba(15,23,42,0.15), 0 0 0 1px rgba(15,23,42,0.06)"
        : "0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)";

    Object.assign(wrap.style, {
        position: "fixed",
        top: "20px",
        right: "20px",
        maxWidth: "min(380px, calc(100vw - 40px))",
        zIndex: "2147483647",
        padding: "16px 18px",
        borderRadius: "16px",
        background: bg,
        color: fg,
        fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif',
        fontSize: "14px",
        lineHeight: "1.45",
        boxShadow: shadow,
        border: `2px solid ${borderCol}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        animation: "prodlytics-toast-in 0.35s ease-out",
    });

    const style = document.createElement("style");
    style.textContent = `@keyframes prodlytics-toast-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`;
    wrap.appendChild(style);

    const h = document.createElement("div");
    h.textContent = title;
    Object.assign(h.style, {
        fontWeight: "800",
        marginBottom: "6px",
        color: accent,
        fontSize: "12px",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
    });

    const p = document.createElement("div");
    p.textContent = message;
    p.style.color = fg;

    wrap.appendChild(h);
    wrap.appendChild(p);
    document.documentElement.appendChild(wrap);

    window.setTimeout(() => {
        wrap.style.opacity = "0";
        wrap.style.transition = "opacity 0.35s ease";
        window.setTimeout(() => wrap.remove(), 400);
    }, 6500);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.action === "exportAccessTokenForBackground") {
        try {
            if (!pageMatchesDashboardBuild()) {
                sendResponse({ accessToken: null });
                return true;
            }
            const t = localStorage.getItem("accessToken");
            sendResponse({ accessToken: t && typeof t === "string" ? t : null });
        } catch {
            sendResponse({ accessToken: null });
        }
        return true;
    }
    if (msg?.action === "showWorkspaceToast") {
        try {
            showProdlyticsWorkspaceToast(msg.title, msg.message, msg.variant);
            sendResponse({ ok: true });
        } catch (e) {
            sendResponse({ ok: false });
        }
        return true;
    }
});

const sendPageLoaded = () => {
    if (document.body) {
        safeRuntimeSendMessage({
            action: "pageLoaded",
            url: window.location.href,
            title: document.title,
            content: document.body.innerText.substring(0, 500) // Send snippet for AI
        });
    } else {
        // Wait for body to be available
        setTimeout(sendPageLoaded, 100);
    }
};

sendPageLoaded();

const observer = new MutationObserver(() => {
    safeRuntimeSendMessage({
        action: "titleChanged",
        title: document.title,
        url: window.location.href,
    });
});

const titleNode = document.querySelector("title");
if (titleNode) {
    observer.observe(titleNode, { childList: true, subtree: true });
}

// Activity Tracking (Scrolls & Clicks)
let scrollCount = 0;
let clickCount = 0;

window.addEventListener("scroll", () => scrollCount++);
window.addEventListener("click", () => clickCount++);

// Send activity metrics every 15 seconds
setInterval(() => {
    if (scrollCount > 0 || clickCount > 0) {
        safeRuntimeSendMessage({
            action: "engagementActivity",
            scrolls: scrollCount,
            clicks: clickCount,
            url: window.location.href
        });
        scrollCount = 0;
        clickCount = 0;
    }
}, 15000);

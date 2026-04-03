/**
 * Authenticated fetch for ProdLytics API. Shares JWT with the dashboard (same Chrome profile).
 */
import { API_BASE, DASHBOARD_ORIGIN, DASHBOARD_ORIGINS } from "./buildEnv.js";
import { getOrCreateAnonymousDeviceKey } from "./anonymousDeviceKey.js";

const LAST_DASHBOARD_ORIGIN_KEY = "lastResolvedDashboardOrigin";

/** Same host + port as a known dashboard origin (ignores www; localhost ↔ 127.0.0.1). */
function tabMatchesDashboardOrigin(tabUrl, originStr) {
    if (!tabUrl || typeof tabUrl !== "string" || !tabUrl.startsWith("http")) return false;
    try {
        const base = new URL(String(originStr).replace(/\/+$/, "") + "/");
        const t = new URL(tabUrl);
        const bh = base.hostname.replace(/^www\./i, "").toLowerCase();
        const th = t.hostname.replace(/^www\./i, "").toLowerCase();
        if (bh !== th) {
            const loc = (h) => h === "localhost" || h === "127.0.0.1";
            if (!(loc(bh) && loc(th))) return false;
        }
        const bp = base.port || (base.protocol === "https:" ? "443" : "80");
        const tp = t.port || (t.protocol === "https:" ? "443" : "80");
        return bp === tp;
    } catch {
        return false;
    }
}

/** @returns {string|null} Normalized dashboard origin (no trailing slash) for this tab, or null. */
export function dashboardOriginForTabUrl(tabUrl) {
    for (const o of DASHBOARD_ORIGINS) {
        if (tabMatchesDashboardOrigin(tabUrl, o)) return o.replace(/\/+$/, "");
    }
    return null;
}

function tabMatchesAnyDashboard(tabUrl) {
    return dashboardOriginForTabUrl(tabUrl) !== null;
}

/**
 * API base (…/api) to use: open dashboard tab → that origin; else last successful sync; else build default.
 */
export async function resolveApiBase() {
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (!tab.url) continue;
            const origin = dashboardOriginForTabUrl(tab.url);
            if (origin) {
                const api = `${origin}/api`;
                await chrome.storage.local.set({ [LAST_DASHBOARD_ORIGIN_KEY]: origin });
                return api;
            }
        }
    } catch {
        /* ignore */
    }
    try {
        const { [LAST_DASHBOARD_ORIGIN_KEY]: last } = await chrome.storage.local.get(LAST_DASHBOARD_ORIGIN_KEY);
        if (last && typeof last === "string") {
            const norm = last.replace(/\/+$/, "");
            if (DASHBOARD_ORIGINS.some((o) => o.replace(/\/+$/, "") === norm)) {
                return `${norm}/api`;
            }
        }
    } catch {
        /* ignore */
    }
    return API_BASE;
}

/** Origin for auth / open-dashboard links in the popup (matches {@link resolveApiBase} priority). */
export async function resolveDashboardOriginForUi() {
    const api = await resolveApiBase();
    try {
        const origin = new URL(api).origin;
        // If it's localhost, quickly check if it's alive. If not, fallback to production.
        if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 800);
                await fetch(origin, { method: "HEAD", signal: controller.signal });
                clearTimeout(timeoutId);
                return origin;
            } catch {
                return "https://prodlytics.vercel.app";
            }
        }
        return origin;
    } catch {
        return String(DASHBOARD_ORIGIN || "").replace(/\/+$/, "") || "https://prodlytics.vercel.app";
    }
}

async function readAccessTokenFromTab(tabId) {
    try {
        const r = await chrome.tabs.sendMessage(tabId, { action: "exportAccessTokenForBackground" });
        if (r?.accessToken && typeof r.accessToken === "string" && r.accessToken.length > 0) {
            return r.accessToken;
        }
    } catch {
        /* content script missing or extension was reloaded — try MAIN world */
    }
    try {
        if (!chrome.scripting?.executeScript) return null;
        const injected = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                try {
                    return localStorage.getItem("accessToken");
                } catch {
                    return null;
                }
            },
            world: "MAIN",
        });
        const token = injected?.[0]?.result;
        if (token && typeof token === "string" && token.length > 0) return token;
    } catch {
        /* restricted page, etc. */
    }
    return null;
}

async function tryPullTokenFromDashboardTab() {
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (!tab.id || !tab.url) continue;
            if (!tabMatchesAnyDashboard(tab.url)) continue;
            const origin = dashboardOriginForTabUrl(tab.url);
            if (origin) {
                await chrome.storage.local.set({ [LAST_DASHBOARD_ORIGIN_KEY]: origin });
            }
            const token = await readAccessTokenFromTab(tab.id);
            if (token) return token;
        }
    } catch {
        /* ignore */
    }
    return null;
}

async function fetchWithFallback(path, init = {}) {
    const primaryApi = await resolveApiBase();
    try {
        const res = await fetch(`${primaryApi}${path}`, init);
        if (res.ok || res.status < 500) return res;
        throw new Error(`Server error ${res.status}`);
    } catch (e) {
        // If primary failed and it was localhost, try production fallback
        if (primaryApi.includes("localhost") || primaryApi.includes("127.0.0.1")) {
            const fallbackApi = "https://prodlytics.vercel.app/api";
            console.warn(`Primary API (${primaryApi}) failed, trying fallback (${fallbackApi})...`, e);
            return fetch(`${fallbackApi}${path}`, init);
        }
        throw e;
    }
}

/** Creates anonymous (guest) dashboard user; stores JWT and optional guest user id for support. */
export async function obtainNewJwt() {
    const deviceKey = await getOrCreateAnonymousDeviceKey();
    const res = await fetchWithFallback("/auth/anonymous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deviceKey ? { deviceKey } : {}),
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Session failed (${res.status})`);
    }
    const data = await res.json();
    if (!data?.accessToken) {
        throw new Error("No JWT from server");
    }
    await chrome.storage.local.set({
        accessToken: data.accessToken,
        extensionGuestUserId: data.user?.id || null,
        extensionAuthChoice: "guest",
    });
    return data.accessToken;
}

/**
 * JWT: existing storage, dashboard tab, or (only if user chose guest in popup) POST /anonymous.
 * Does not auto-create a guest until extensionAuthChoice === "guest".
 */
async function ensureAccessToken() {
    const { accessToken: existing, extensionAuthChoice } = await chrome.storage.local.get([
        "accessToken",
        "extensionAuthChoice",
    ]);
    if (existing && typeof existing === "string" && existing.length > 0) {
        return existing;
    }
    const pulled = await tryPullTokenFromDashboardTab();
    if (pulled) {
        await chrome.storage.local.set({ accessToken: pulled });
        return pulled;
    }
    if (extensionAuthChoice === "guest") {
        return obtainNewJwt();
    }
    return null;
}

/**
 * If a ProdLytics dashboard tab is open, copy its JWT into extension storage so goals/tracking match that account.
 * @returns {Promise<boolean>} true if storage was updated with a new token
 */
export async function syncAccessTokenFromDashboardTab() {
    const pulled = await tryPullTokenFromDashboardTab();
    if (!pulled) return false;
    const { accessToken } = await chrome.storage.local.get("accessToken");
    if (pulled === accessToken) return false;
    await chrome.storage.local.set({ accessToken: pulled });
    return true;
}

export async function plFetch(url, init = {}) {
    let { accessToken } = await chrome.storage.local.get("accessToken");
    if (!accessToken) {
        try {
            await ensureAccessToken();
            const { accessToken: t } = await chrome.storage.local.get("accessToken");
            accessToken = t;
        } catch {
            /* request may 401 below */
        }
    }

    const headers = {
        ...(init.headers || {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };

    // Extract endpoint from absolute URL if needed
    const path = url.includes("/api") ? url.substring(url.indexOf("/api") + 4) : url;
    let res = await fetchWithFallback(path, { ...init, headers });
    if (res.status !== 401) return res;

    try {
        await chrome.storage.local.remove("accessToken");
        const pulled = await tryPullTokenFromDashboardTab();
        if (pulled) {
            await chrome.storage.local.set({ accessToken: pulled });
        } else {
            await ensureAccessToken();
        }
    } catch {
        return res;
    }

    const { accessToken: t2 } = await chrome.storage.local.get("accessToken");
    const headers2 = {
        ...(init.headers || {}),
        ...(t2 ? { Authorization: `Bearer ${t2}` } : {}),
    };

    return fetchWithFallback(path, { ...init, headers: headers2 });
}

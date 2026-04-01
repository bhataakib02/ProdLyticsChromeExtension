/**
 * Authenticated fetch for ProdLytics API. Shares JWT with the dashboard (same Chrome profile).
 */
import { API_BASE, DASHBOARD_ORIGIN } from "./buildEnv.js";

/** Same host + port as the built-in dashboard URL (ignores www, treats localhost/127.0.0.1 as same). */
function tabMatchesDashboard(tabUrl) {
    if (!tabUrl || typeof tabUrl !== "string" || !tabUrl.startsWith("http")) return false;
    try {
        const base = new URL(DASHBOARD_ORIGIN.replace(/\/+$/, "") + "/");
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
            if (!tabMatchesDashboard(tab.url)) continue;
            const token = await readAccessTokenFromTab(tab.id);
            if (token) return token;
        }
    } catch {
        /* ignore */
    }
    return null;
}

async function obtainNewJwt() {
    const res = await fetch(`${API_BASE}/auth/anonymous`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Session failed (${res.status})`);
    }
    const data = await res.json();
    if (!data?.accessToken) {
        throw new Error("No JWT from server");
    }
    await chrome.storage.local.set({ accessToken: data.accessToken });
    return data.accessToken;
}

/**
 * Ensures chrome.storage has a valid JWT: reuse existing, copy from an open dashboard tab, or POST /anonymous.
 */
async function ensureAccessToken() {
    const { accessToken: existing } = await chrome.storage.local.get("accessToken");
    if (existing && typeof existing === "string" && existing.length > 0) {
        return existing;
    }
    const pulled = await tryPullTokenFromDashboardTab();
    if (pulled) {
        await chrome.storage.local.set({ accessToken: pulled });
        return pulled;
    }
    return obtainNewJwt();
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
            accessToken = (await chrome.storage.local.get("accessToken")).accessToken;
        } catch {
            /* request may 401 below */
        }
    }

    const headers = {
        ...(init.headers || {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
    let res = await fetch(url, { ...init, headers });
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
    return fetch(url, { ...init, headers: headers2 });
}

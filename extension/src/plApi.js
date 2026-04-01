/**
 * Authenticated fetch for ProdLytics API. Shares JWT with the dashboard (same Chrome profile).
 */
import { API_BASE, DASHBOARD_ORIGIN } from "./buildEnv.js";

async function tryPullTokenFromDashboardTab() {
    try {
        const base = DASHBOARD_ORIGIN.replace(/\/+$/, "");
        const tabs = await chrome.tabs.query({ url: `${base}/*` });
        for (const tab of tabs) {
            if (!tab.id) continue;
            try {
                const r = await chrome.tabs.sendMessage(tab.id, { action: "exportAccessTokenForBackground" });
                if (r?.accessToken && typeof r.accessToken === "string" && r.accessToken.length > 0) {
                    return r.accessToken;
                }
            } catch {
                /* tab without content script or not ready */
            }
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
        await ensureAccessToken();
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

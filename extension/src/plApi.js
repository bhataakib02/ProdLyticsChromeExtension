/**
 * Authenticated fetch for ProdLytics API. Creates a silent per-install session (no sign-in UI).
 */
import { API_BASE } from "./buildEnv.js";

async function ensureAnonymousJwt() {
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

export async function plFetch(url, init = {}) {
    let { accessToken } = await chrome.storage.local.get("accessToken");
    if (!accessToken) {
        try {
            await ensureAnonymousJwt();
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
        await ensureAnonymousJwt();
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

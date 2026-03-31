/**
 * Authenticated fetch for ProdLytics API. On 401, runs Google sign-in (chrome.identity) and retries once.
 */
import { API_BASE } from "./buildEnv.js";

function exchangeGoogleForJwt(googleAccessToken) {
    return fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: googleAccessToken }),
    });
}

function signInWithGoogleInteractive() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, async (googleToken) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            if (!googleToken) {
                reject(new Error("No Google token"));
                return;
            }
            try {
                const res = await exchangeGoogleForJwt(googleToken);
                if (!res.ok) {
                    const errText = await res.text();
                    reject(new Error(errText || `Auth failed (${res.status})`));
                    return;
                }
                const data = await res.json();
                if (!data?.accessToken) {
                    reject(new Error("No JWT from server"));
                    return;
                }
                await chrome.storage.local.set({ accessToken: data.accessToken });
                resolve(data.accessToken);
            } catch (e) {
                reject(e);
            }
        });
    });
}

export async function plFetch(url, init = {}) {
    const { accessToken } = await chrome.storage.local.get("accessToken");
    const headers = {
        ...(init.headers || {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
    let res = await fetch(url, { ...init, headers });
    if (res.status !== 401) return res;

    try {
        await signInWithGoogleInteractive();
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

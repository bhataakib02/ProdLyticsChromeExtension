/** Same storage key as extension `chrome.storage.local` — one anonymous profile per browser profile. */
export const PRODLYTICS_ANONYMOUS_DEVICE_KEY = "prodlytics_anonymous_device_key";

function getCookie(name) {
    if (typeof document === "undefined") return "";
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return "";
}

function setCookie(name, value, days = 3650) {
    if (typeof document === "undefined") return;
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `; expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value || ""}${expires}; path=/; SameSite=Lax`;
}

/**
 * Wait for content-script sync from extension → localStorage.
 * Default raised to 3000ms for permanent stability.
 * Checks localStorage, sessionStorage, and Cookies for the same ID.
 */
export async function waitForSyncedAnonymousDeviceKey(maxWaitMs = 3000) {
    if (typeof window === "undefined") return "";
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        try {
            const k =
                localStorage.getItem(PRODLYTICS_ANONYMOUS_DEVICE_KEY) ||
                sessionStorage.getItem(PRODLYTICS_ANONYMOUS_DEVICE_KEY) ||
                getCookie(PRODLYTICS_ANONYMOUS_DEVICE_KEY);
            if (k && k.length >= 32) {
                // Mirror to ALL stores to ensure maximum persistence
                try { localStorage.setItem(PRODLYTICS_ANONYMOUS_DEVICE_KEY, k); } catch { /* ignore */ }
                try { sessionStorage.setItem(PRODLYTICS_ANONYMOUS_DEVICE_KEY, k); } catch { /* ignore */ }
                setCookie(PRODLYTICS_ANONYMOUS_DEVICE_KEY, k);
                return k;
            }
        } catch {
            break;
        }
        await new Promise((r) => setTimeout(r, 100));
    }
    try {
        const lastResort =
            localStorage.getItem(PRODLYTICS_ANONYMOUS_DEVICE_KEY) ||
            sessionStorage.getItem(PRODLYTICS_ANONYMOUS_DEVICE_KEY) ||
            getCookie(PRODLYTICS_ANONYMOUS_DEVICE_KEY) ||
            "";
        if (lastResort) {
            setCookie(PRODLYTICS_ANONYMOUS_DEVICE_KEY, lastResort);
        }
        return lastResort;
    } catch {
        return "";
    }
}

/**
 * Create and persist a UUID for this origin (dashboard) when none exists after sync wait.
 * Saves to ALL storage layers for resilience.
 */
export function getOrCreateAnonymousDeviceKey() {
    if (typeof window === "undefined") return "";
    try {
        let k =
            localStorage.getItem(PRODLYTICS_ANONYMOUS_DEVICE_KEY) ||
            sessionStorage.getItem(PRODLYTICS_ANONYMOUS_DEVICE_KEY) ||
            getCookie(PRODLYTICS_ANONYMOUS_DEVICE_KEY);
        if (k && k.length >= 32) {
            // Ensure all stores are in sync
            try { localStorage.setItem(PRODLYTICS_ANONYMOUS_DEVICE_KEY, k); } catch { /* ignore */ }
            try { sessionStorage.setItem(PRODLYTICS_ANONYMOUS_DEVICE_KEY, k); } catch { /* ignore */ }
            setCookie(PRODLYTICS_ANONYMOUS_DEVICE_KEY, k);
            return k;
        }
        k = crypto.randomUUID();
        try { localStorage.setItem(PRODLYTICS_ANONYMOUS_DEVICE_KEY, k); } catch { /* ignore */ }
        try { sessionStorage.setItem(PRODLYTICS_ANONYMOUS_DEVICE_KEY, k); } catch { /* ignore */ }
        setCookie(PRODLYTICS_ANONYMOUS_DEVICE_KEY, k);
        return k;
    } catch {
        return "";
    }
}

/** Same storage key as extension `chrome.storage.local` — one anonymous profile per browser profile. */
export const PRODLYTICS_ANONYMOUS_DEVICE_KEY = "prodlytics_anonymous_device_key";

/**
 * Wait for content-script sync from extension → localStorage (short window).
 */
export async function waitForSyncedAnonymousDeviceKey(maxWaitMs = 450) {
    if (typeof window === "undefined") return "";
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        try {
            const k = localStorage.getItem(PRODLYTICS_ANONYMOUS_DEVICE_KEY);
            if (k && k.length >= 32) return k;
        } catch {
            break;
        }
        await new Promise((r) => setTimeout(r, 40));
    }
    try {
        return localStorage.getItem(PRODLYTICS_ANONYMOUS_DEVICE_KEY) || "";
    } catch {
        return "";
    }
}

/** Create and persist a UUID for this origin (dashboard) when none exists after sync wait. */
export function getOrCreateAnonymousDeviceKey() {
    if (typeof window === "undefined") return "";
    try {
        let k = localStorage.getItem(PRODLYTICS_ANONYMOUS_DEVICE_KEY);
        if (k && k.length >= 32) return k;
        k = crypto.randomUUID();
        localStorage.setItem(PRODLYTICS_ANONYMOUS_DEVICE_KEY, k);
        return k;
    } catch {
        return "";
    }
}

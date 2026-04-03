/** Must match `frontend/src/lib/anonymousDeviceKey.js` — shared anonymous profile across extension + dashboard. */
export const PRODLYTICS_ANONYMOUS_DEVICE_KEY = "prodlytics_anonymous_device_key";

export function getOrCreateAnonymousDeviceKey() {
    return new Promise((resolve) => {
        if (typeof chrome === "undefined" || !chrome.storage?.local) {
            resolve(typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "");
            return;
        }
        chrome.storage.local.get([PRODLYTICS_ANONYMOUS_DEVICE_KEY], (r) => {
            if (chrome.runtime.lastError) {
                resolve(crypto.randomUUID());
                return;
            }
            let k = r[PRODLYTICS_ANONYMOUS_DEVICE_KEY];
            if (typeof k === "string" && k.length >= 32) {
                resolve(k);
                return;
            }
            k = crypto.randomUUID();
            chrome.storage.local.set({ [PRODLYTICS_ANONYMOUS_DEVICE_KEY]: k }, () => resolve(k));
        });
    });
}

export const SESSION_REFLECTIONS_KEY = "prodlytics-session-reflections-v1";

export const REFLECTIONS_UPDATED_EVENT = "prodlytics-reflections-updated";

export function dispatchReflectionsUpdated() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(REFLECTIONS_UPDATED_EVENT));
}

export function readSessionReflections(limit = 5) {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(SESSION_REFLECTIONS_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        return arr.slice(0, limit);
    } catch {
        return [];
    }
}

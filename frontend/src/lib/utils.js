import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges tailwind classes safely
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Formats seconds into HH:MM:SS or similar
 */
export function formatTime(seconds) {
    if (!seconds || seconds < 0) return "0s";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

/**
 * Captures the current date as YYYY-MM-DD
 */
export function getTodayStr() {
    return new Date().toISOString().split("T")[0];
}

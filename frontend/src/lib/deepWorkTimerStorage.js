/** Must match TimerView persistence key. */
export const DEEP_WORK_TIMER_STORAGE_KEY = "prodlytics-deep-work-timer-v1";

export const DEEP_WORK_TIMER_SYNC_EVENT = "prodlytics-timer-sync";

export function dispatchDeepWorkTimerSync() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(DEEP_WORK_TIMER_SYNC_EVENT));
}

/**
 * @returns {null | {
 *   v: number,
 *   userId: string,
 *   timerMode: string,
 *   isActive: boolean,
 *   phaseEndsAt: number | null,
 *   timeLeft: number,
 *   focusIntention: string,
 *   workMinStr: string,
 *   breakMinStr: string,
 * }}
 */
export function readDeepWorkTimerSnapshot() {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(DEEP_WORK_TIMER_STORAGE_KEY);
        if (!raw) return null;
        const s = JSON.parse(raw);
        if (!s || s.v !== 1 || typeof s.userId !== "string") return null;
        return s;
    } catch {
        return null;
    }
}

export function formatTimerMmSs(totalSeconds) {
    const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const m = Math.floor(sec / 60)
        .toString()
        .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

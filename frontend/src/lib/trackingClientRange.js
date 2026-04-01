/**
 * Query params so API can bucket by the user's local calendar day and local hour.
 */
/** Today’s YYYY-MM-DD in the user’s local timezone (matches API dateKey). */
export function todayDateKeyClient() {
    if (typeof window === "undefined") return "";
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return new Date().toLocaleDateString("en-CA", { timeZone: tz });
    } catch {
        return "";
    }
}

export function trackingRangeQueryString(range) {
    if (typeof window === "undefined") return "";
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const ref = new Date();
        if (range === "yesterday") {
            ref.setDate(ref.getDate() - 1);
        }
        const dateKey = ref.toLocaleDateString("en-CA", { timeZone: tz });
        return `&tz=${encodeURIComponent(tz)}&dateKey=${encodeURIComponent(dateKey)}`;
    } catch {
        return "";
    }
}

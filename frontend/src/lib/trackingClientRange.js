/**
 * Query params so API can bucket by the user's local calendar day and local hour.
 */
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

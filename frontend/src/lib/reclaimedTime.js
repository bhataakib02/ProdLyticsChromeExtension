/**
 * Rough estimate of minutes "reclaimed" from distraction → productive week-over-week.
 * Uses both productive gain and unproductive drop (weighted) and caps at a sane ceiling.
 */
export function estimateReclaimedMinutesWeekOverWeek(weekComparison) {
    if (!weekComparison?.current || !weekComparison?.previous) {
        return { minutes: null, label: null, confidence: "none" };
    }
    const curP = Number(weekComparison.current.productiveTime) || 0;
    const prevP = Number(weekComparison.previous.productiveTime) || 0;
    const curU = Number(weekComparison.current.unproductiveTime) || 0;
    const prevU = Number(weekComparison.previous.unproductiveTime) || 0;

    const prodGain = Math.max(0, curP - prevP);
    const unprodDrop = Math.max(0, prevU - curU);
    const raw = prodGain * 0.55 + unprodDrop * 0.45;
    const minutes = Math.round(raw / 60);

    if (minutes <= 0) {
        return { minutes: 0, label: "Keep tracking — we’ll quantify shifts as both weeks fill in.", confidence: "low" };
    }

    const cap = 12 * 60;
    const m = Math.min(cap, minutes);
    return {
        minutes: m,
        label: `About ${m} min more aligned with deep work vs last week (estimated from your productive vs distracting shift).`,
        confidence: m >= 30 ? "medium" : "low",
    };
}

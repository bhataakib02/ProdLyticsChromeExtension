/**
 * Shared Tracking date filters for API routes (Vercel UTC vs user local calendar day).
 * When the dashboard sends `tz` (IANA) + `dateKey` (YYYY-MM-DD), "today"/"yesterday"
 * match that calendar day in the user's zone; hourly buckets use the same zone.
 */

export function resolveTrackingMatch(userId, range, searchParams) {
    const tz = searchParams.get("tz");
    const dateKey = searchParams.get("dateKey");
    const now = new Date();

    if ((range === "today" || range === "yesterday") && tz && dateKey) {
        return {
            match: {
                userId,
                $expr: {
                    $eq: [{ $dateToString: { format: "%Y-%m-%d", date: "$date", timezone: tz } }, dateKey],
                },
            },
            hourZone: tz,
        };
    }

    let start;
    let endExclusive = null;
    if (range === "today") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === "yesterday") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endExclusive = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === "week") {
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === "month") {
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
        start = new Date(0);
    }

    const dateMatch = endExclusive ? { $gte: start, $lt: endExclusive } : { $gte: start };
    return {
        match: { userId, date: dateMatch },
        hourZone: tz || "UTC",
    };
}

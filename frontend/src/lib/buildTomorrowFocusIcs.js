/**
 * Build a minimal iCalendar (.ics) file for a single focus block (local floating times).
 * @param {{ title: string, start: Date, end: Date, uid: string }} opts
 */
export function buildTomorrowFocusIcs({ title, start, end, uid }) {
    const fmt = (d) => {
        const pad = (n) => String(n).padStart(2, "0");
        return (
            `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T` +
            `${pad(d.getHours())}${pad(d.getMinutes())}00`
        );
    };
    const stamp = fmt(new Date());
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//ProdLytics//Focus Block//EN",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${escapeIcsText(title)}`,
        "DESCRIPTION:Deep work block suggested by ProdLytics from your peak focus window.",
        "END:VEVENT",
        "END:VCALENDAR",
    ];
    return lines.join("\r\n");
}

function escapeIcsText(s) {
    return String(s || "")
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,");
}

/**
 * Focus “shield” block for next week (same weekday/time as peak), local floating times.
 * @param {{ title: string, peakDate: Date, durationMinutes: number, uid: string }} opts
 */
export function buildNextWeekFocusIcs({ title, peakDate, durationMinutes, uid }) {
    const d = peakDate instanceof Date && !Number.isNaN(peakDate.getTime()) ? peakDate : new Date();
    const now = new Date();
    const target = new Date(now);
    const wantDow = d.getDay();
    const daysAhead = (wantDow - target.getDay() + 7) % 7;
    target.setDate(target.getDate() + daysAhead + 7);
    target.setHours(d.getHours(), d.getMinutes(), 0, 0);
    const end = new Date(target.getTime() + Math.max(5, Number(durationMinutes) || 25) * 60 * 1000);
    return buildTomorrowFocusIcs({
        title,
        start: target,
        end,
        uid,
    });
}

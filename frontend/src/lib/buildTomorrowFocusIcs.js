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

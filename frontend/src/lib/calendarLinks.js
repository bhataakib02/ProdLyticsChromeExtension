/**
 * Google Calendar "Add event" template uses local floating datetimes (no Z).
 * @param {Date} d
 */
function formatGcalLocalDate(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
        `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T` +
        `${pad(d.getHours())}${pad(d.getMinutes())}00`
    );
}

/**
 * Opens Google Calendar compose with title, time range, and description (one-click add).
 * @param {{ title: string, start: Date, end: Date, details?: string }} opts
 * @returns {string} URL
 */
export function buildGoogleCalendarTemplateUrl({ title, start, end, details = "" }) {
    const dates = `${formatGcalLocalDate(start)}/${formatGcalLocalDate(end)}`;
    const u = new URL("https://calendar.google.com/calendar/render");
    u.searchParams.set("action", "TEMPLATE");
    u.searchParams.set("text", title);
    u.searchParams.set("dates", dates);
    if (details) u.searchParams.set("details", details);
    return u.toString();
}

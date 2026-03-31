/** Case-insensitive substring match for navbar “Search activity…”. Empty query matches all. */
export function matchesActivitySearch(query, ...parts) {
    const q = String(query ?? "").trim().toLowerCase();
    if (!q) return true;
    return parts.some((p) => String(p ?? "").toLowerCase().includes(q));
}

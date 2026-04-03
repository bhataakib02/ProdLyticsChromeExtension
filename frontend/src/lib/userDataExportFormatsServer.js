import { buildUserDataExportPayload } from "@/lib/userDataExportServer";

function serializeCsvCell(v) {
    if (v == null || v === undefined) return "";
    if (v instanceof Date) return v.toISOString();
    const t = typeof v;
    if (t === "object") {
        try {
            if (typeof v.toHexString === "function") return String(v.toHexString());
        } catch {
            /* ignore */
        }
        try {
            if (v._bsontype === "ObjectId" || v._bsontype === "ObjectID") return String(v);
        } catch {
            /* ignore */
        }
        return JSON.stringify(v);
    }
    return String(v);
}

function escapeCsvField(s) {
    const str = serializeCsvCell(s);
    if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
}

/** @param {Record<string, unknown>[]} docs */
export function documentsToCsv(docs) {
    if (!Array.isArray(docs) || docs.length === 0) {
        return "message\n(no rows in export)\n";
    }
    const keys = new Set();
    for (const d of docs) {
        if (d && typeof d === "object") Object.keys(d).forEach((k) => keys.add(k));
    }
    const headers = [...keys].sort((a, b) => a.localeCompare(b));
    const lines = [headers.map((h) => escapeCsvField(h)).join(",")];
    for (const d of docs) {
        lines.push(headers.map((h) => escapeCsvField(d[h])).join(","));
    }
    return `${lines.join("\n")}\n`;
}

function preferencesToCsv(pref) {
    const lines = ["key,value"];
    if (!pref || typeof pref !== "object") {
        lines.push("message,(no preferences row)");
        return `${lines.join("\n")}\n`;
    }
    for (const [k, v] of Object.entries(pref)) {
        lines.push(`${escapeCsvField(k)},${escapeCsvField(v)}`);
    }
    return `${lines.join("\n")}\n`;
}

function summaryToCsv(payload) {
    const lines = ["section,field,value"];
    const proof = payload.separationProof || {};
    lines.push(`proof,userId,${escapeCsvField(proof.userId)}`);
    lines.push(`proof,generatedAt,${escapeCsvField(proof.generatedAt)}`);
    lines.push(`proof,exportSource,${escapeCsvField(proof.exportSource)}`);
    const u = payload.user;
    if (u) {
        for (const [k, v] of Object.entries(u)) {
            lines.push(`user,${k},${escapeCsvField(v)}`);
        }
    }
    const totals = payload.totals || {};
    for (const [k, v] of Object.entries(totals)) {
        lines.push(`totals,${k},${escapeCsvField(v)}`);
    }
    return `${lines.join("\n")}\n`;
}

/**
 * ZIP of CSV files (Excel-friendly). Full raw export, same row caps as JSON.
 * @returns {Promise<Buffer>}
 */
export async function buildUserDataCsvZipBuffer(userId, exportSource) {
    const JSZipModule = await import("jszip");
    const JSZip = JSZipModule.default || JSZipModule;
    const payload = await buildUserDataExportPayload(userId, { includeRaw: true, exportSource });
    const zip = new JSZip();
    const id = String(userId);

    zip.file(
        "README.txt",
        [
            "ProdLytics — personal data export (CSV)",
            "",
            `User id: ${id}`,
            `Generated: ${payload.separationProof?.generatedAt || ""}`,
            `Source: ${payload.separationProof?.exportSource || ""}`,
            "",
            "Open .csv files in Excel, Google Sheets, or LibreOffice.",
            "Tracking is capped at 2000 rows; deep work & notifications at 1000 each (same as API).",
            "",
        ].join("\n")
    );

    zip.file("01_user_summary.csv", summaryToCsv(payload));

    const raw = payload.raw;
    if (raw) {
        zip.file("02_tracking_activity.csv", documentsToCsv(raw.trackingRows));
        zip.file("03_goals.csv", documentsToCsv(raw.goals));
        zip.file("04_deep_work_sessions.csv", documentsToCsv(raw.deepWorkSessions));
        zip.file("05_focus_blocks.csv", documentsToCsv(raw.focusBlocks));
        zip.file("06_categories.csv", documentsToCsv(raw.categories));
        zip.file("07_notifications.csv", documentsToCsv(raw.notifications));
        zip.file("08_preferences_key_value.csv", preferencesToCsv(raw.preference));
    }

    return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

function tableFromDocs(docs, pick) {
    if (!Array.isArray(docs) || docs.length === 0) return [];
    const lim = docs.slice(0, pick.limit);
    return lim.map((d) => pick.cols.map((c) => serializeCsvCell(d[c] ?? "")));
}

/**
 * Human-readable PDF for emailing; large tables truncated (CSV ZIP has full export).
 * @returns {Promise<Buffer>}
 */
export async function buildUserDataPdfBuffer(userId, exportSource) {
    const payload = await buildUserDataExportPayload(userId, { includeRaw: true, exportSource });
    const [jspdfMod, autotableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const jsPDF = jspdfMod.jsPDF || jspdfMod.default || jspdfMod;
    const autoTable = autotableMod.default || autotableMod;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 14;
    let y = 16;
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text("ProdLytics — personal data export", margin, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70);
    doc.text(`User ID: ${payload.separationProof?.userId || ""}`, margin, y);
    y += 4;
    doc.text(`Generated: ${payload.separationProof?.generatedAt || ""}`, margin, y);
    y += 4;
    doc.text(`Source: ${payload.separationProof?.exportSource || ""}`, margin, y);
    y += 6;
    doc.setTextColor(0);

    const u = payload.user;
    autoTable(doc, {
        startY: y,
        head: [["Field", "Value"]],
        body: [
            ["Name", u?.name || "—"],
            ["Email", u?.email || "—"],
            ["Anonymous account", u?.isAnonymous ? "yes" : "no"],
            ["Created", u?.createdAt ? serializeCsvCell(u.createdAt) : "—"],
            ["Updated", u?.updatedAt ? serializeCsvCell(u.updatedAt) : "—"],
        ],
        theme: "grid",
        headStyles: { fillColor: [55, 65, 81], textColor: 255 },
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 1.2 },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;

    const totals = payload.totals || {};
    autoTable(doc, {
        startY: y,
        head: [["Totals", "Count"]],
        body: Object.entries(totals).map(([k, v]) => [k, String(v)]),
        theme: "grid",
        headStyles: { fillColor: [55, 65, 81], textColor: 255 },
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 1.2 },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 10;

    const raw = payload.raw;
    if (raw?.trackingRows?.length) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Tracking activity (first 200 of ${raw.trackingRows.length})`, margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const body = tableFromDocs(raw.trackingRows, {
            limit: 200,
            cols: ["website", "pathNorm", "category", "time", "date"],
        });
        autoTable(doc, {
            startY: y,
            head: [["Website", "Path", "Category", "Time", "Date"]],
            body,
            theme: "striped",
            headStyles: { fillColor: [79, 70, 229], textColor: 255 },
            margin: { left: margin, right: margin },
            styles: { fontSize: 7, cellPadding: 0.8 },
        });
        y = (doc.lastAutoTable?.finalY ?? y) + 8;
    }

    if (raw?.goals?.length) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Goals (first 80 of ${raw.goals.length})`, margin, y);
        y += 5;
        const body = tableFromDocs(raw.goals, {
            limit: 80,
            cols: ["label", "type", "website", "targetSeconds", "isActive", "repeat", "createdAt"],
        });
        autoTable(doc, {
            startY: y,
            head: [["Label", "Type", "Site", "Target (sec)", "Active", "Repeat", "Created"]],
            body,
            theme: "striped",
            headStyles: { fillColor: [55, 65, 81], textColor: 255 },
            margin: { left: margin, right: margin },
            styles: { fontSize: 7, cellPadding: 0.8 },
        });
        y = (doc.lastAutoTable?.finalY ?? y) + 8;
    }

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
        "This PDF is a readable summary. For a complete machine-readable export, use the CSV (ZIP) download — it includes all capped rows, preferences, sessions, notifications, etc.",
        margin,
        Math.min(y + 6, doc.internal.pageSize.getHeight() - 12),
        { maxWidth: pageW - margin * 2 }
    );

    const out = doc.output("arraybuffer");
    return Buffer.from(out);
}

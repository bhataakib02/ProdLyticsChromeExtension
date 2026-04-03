function safeNamePart(name) {
    const s = String(name || "user")
        .split(" ")[0]
        .replace(/[^a-zA-Z0-9-_]/g, "");
    return s.slice(0, 24) || "user";
}

/**
 * One-page “Focus playbook” from live AI Coach context (Pro).
 * @param {object} opts
 */
export async function downloadFocusPlaybookPdf({
    userName,
    peakProdWindow,
    peakDistractionWindow,
    topDistractionSite,
    topDistractionPretty,
    weekScores,
    threeRules,
    streak,
}) {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 16;
    let y = 18;

    const now = new Date();
    const fileDate = now.toISOString().slice(0, 10);

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Focus Playbook", margin, y);
    y += 9;

    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.setFont("helvetica", "normal");
    doc.text(`ProdLytics · ${fileDate} · ${String(userName || "User").trim()}`, margin, y);
    y += 12;
    doc.setTextColor(0);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Your peaks & leaks (from extension data)", margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const rows = [
        ["Peak focus window", peakProdWindow || "—"],
        ["Distraction cluster", peakDistractionWindow || "—"],
        ["Top time leak", topDistractionSite ? `${topDistractionSite} (${topDistractionPretty})` : "—"],
        ["Day streak", streak != null && Number(streak) > 0 ? `${streak} days` : "—"],
    ];

    autoTable(doc, {
        startY: y,
        head: [["Signal", "Detail"]],
        body: rows,
        theme: "plain",
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [40, 40, 48], textColor: 255 },
    });

    y = (doc.lastAutoTable?.finalY ?? y) + 10;

    if (weekScores && (Number.isFinite(weekScores.previous) || Number.isFinite(weekScores.current))) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Week-over-week focus score", margin, y);
        y += 6;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        autoTable(doc, {
            startY: y,
            head: [["Window", "Score"]],
            body: [
                ["Previous 7 days", `${Number(weekScores.previous ?? 0)}%`],
                ["Latest 7 days", `${Number(weekScores.current ?? 0)}%`],
            ],
            theme: "striped",
            margin: { left: margin, right: margin },
            styles: { fontSize: 9 },
            headStyles: { fillColor: [99, 102, 241], textColor: 255 },
        });
        y = (doc.lastAutoTable?.finalY ?? y) + 10;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("3 rules for this week", margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const rules = Array.isArray(threeRules) ? threeRules.filter(Boolean).slice(0, 3) : [];
    while (rules.length < 3) {
        rules.push("Sync the extension after deep work so your playbook stays honest.");
    }

    autoTable(doc, {
        startY: y,
        head: [["#", "Rule"]],
        body: rules.map((r, i) => [`${i + 1}`, String(r)]),
        theme: "striped",
        margin: { left: margin, right: margin },
        styles: { fontSize: 9.5, cellPadding: 2 },
        headStyles: { fillColor: [16, 185, 129], textColor: 255 },
        columnStyles: { 0: { cellWidth: 12 } },
    });

    y = (doc.lastAutoTable?.finalY ?? y) + 10;

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
        "Estimated from your browsing mix (productive vs distracting). Not medical or legal advice.",
        margin,
        y,
        { maxWidth: pageW - margin * 2 }
    );

    doc.setTextColor(0);
    doc.save(`prodlytics-focus-playbook-${safeNamePart(userName)}-${fileDate}.pdf`);
}

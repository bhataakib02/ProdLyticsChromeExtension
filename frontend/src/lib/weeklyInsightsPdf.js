function safeNamePart(name) {
    const s = String(name || "user")
        .split(" ")[0]
        .replace(/[^a-zA-Z0-9-_]/g, "");
    return s.slice(0, 24) || "user";
}

function secsToPretty(seconds) {
    const s = Math.max(0, Number(seconds) || 0);
    if (s < 60) return `${Math.round(s)}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}h ${r}m` : `${h}h`;
}

function drawWeeklyBars(doc, { previousScore, currentScore, x, y, w, h }) {
    const prev = Math.max(0, Math.min(100, Number(previousScore) || 0));
    const cur = Math.max(0, Math.min(100, Number(currentScore) || 0));
    const gap = 18;
    const barW = (w - gap) / 2;

    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.rect(x, y, w, h);

    const prevH = (prev / 100) * (h - 10);
    const curH = (cur / 100) * (h - 10);

    doc.setFillColor(99, 102, 241);
    doc.rect(x + 4, y + h - prevH - 4, barW - 8, prevH, "F");

    doc.setFillColor(16, 185, 129);
    doc.rect(x + barW + gap + 4, y + h - curH - 4, barW - 8, curH, "F");

    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text("Last week", x + 6, y + h + 5);
    doc.text("This week", x + barW + gap + 6, y + h + 5);
    doc.text(`${prev}%`, x + 7, y + h - prevH - 6);
    doc.text(`${cur}%`, x + barW + gap + 7, y + h - curH - 6);
    doc.setTextColor(0);
}

export async function downloadWeeklyInsightsPdf({
    userName,
    weeklySummary,
    predictiveAnalytics,
    currentWeek,
    previousWeek,
}) {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 18;

    const now = new Date();
    const dateStr = now.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    const fileDate = now.toISOString().slice(0, 10);

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("ProdLytics - Weekly insights report", margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Generated: ${dateStr}`, margin, y);
    y += 6;
    doc.text(`User: ${String(userName || "ProdLytics user").trim()}`, margin, y);
    y += 8;
    doc.setTextColor(0);

    const prevScore = Number(previousWeek?.scoreSafe ?? previousWeek?.score ?? 0) || 0;
    const curScore = Number(currentWeek?.scoreSafe ?? currentWeek?.score ?? 0) || 0;
    drawWeeklyBars(doc, { previousScore: prevScore, currentScore: curScore, x: margin, y, w: pageW - margin * 2, h: 50 });
    y += 62;

    autoTable(doc, {
        startY: y,
        head: [["Week", "Score", "Productive time", "Distracting time"]],
        body: [
            [
                "Last week",
                `${prevScore}%`,
                secsToPretty(previousWeek?.productiveTime || 0),
                secsToPretty(previousWeek?.unproductiveTime || 0),
            ],
            [
                "This week",
                `${curScore}%`,
                secsToPretty(currentWeek?.productiveTime || 0),
                secsToPretty(currentWeek?.unproductiveTime || 0),
            ],
        ],
        theme: "striped",
        headStyles: { fillColor: [99, 102, 241], textColor: 255 },
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 2 },
    });

    y = (doc.lastAutoTable?.finalY ?? y) + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("AI weekly summary", margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(String(weeklySummary || "No weekly summary available yet."), margin, y, {
        maxWidth: pageW - margin * 2,
    });
    y += 18;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Prediction", margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(String(predictiveAnalytics || "No prediction available yet."), margin, y, {
        maxWidth: pageW - margin * 2,
    });

    const fname = `prodlytics-weekly-insights-${safeNamePart(userName)}-${fileDate}.pdf`;
    doc.save(fname);
}


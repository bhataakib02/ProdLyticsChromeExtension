function safeNamePart(name) {
  const s = String(name || "user")
    .split(" ")[0]
    .replace(/[^a-zA-Z0-9-_]/g, "");
  return s.slice(0, 24) || "user";
}

function peakLabel(hour) {
  if (hour == null || hour === "") return "—";
  const h = Number(hour);
  if (!Number.isFinite(h)) return "—";
  const ampm = h >= 12 ? "PM" : "AM";
  const display = h % 12 || 12;
  return `${display} ${ampm}`;
}

/**
 * Build and download an overview PDF (today’s snapshot).
 * Dynamic-imports jsPDF so it never loads on the server (Next/Turbopack).
 */
export async function downloadOverviewPdf({ userName, metrics, objectives, topDomains, formatTime }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 18;

  const now = new Date();
  const dateStr = now.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const fileDate = now.toISOString().slice(0, 10);

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ProdLytics — Overview report", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text(`Generated: ${dateStr}`, margin, y);
  y += 6;
  doc.text(`User: ${String(userName || "—").trim()}`, margin, y);
  doc.setTextColor(0);
  y += 12;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Summary (today)", margin, y);
  y += 2;

  const summaryBody = [
    ["Focus score", `${metrics?.score ?? 0}%`],
    ["Total tracked time", formatTime(metrics?.totalTime ?? 0)],
    ["Productive time", formatTime(metrics?.productiveTime ?? 0)],
    ["Neutral time", formatTime(metrics?.neutralTime ?? 0)],
    ["Unproductive time", formatTime(metrics?.unproductiveTime ?? 0)],
    ["Streak", `${metrics?.streak ?? 0} days`],
    ["Peak period", peakLabel(metrics?.peakHour)],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: summaryBody,
    theme: "striped",
    headStyles: { fillColor: [99, 102, 241], textColor: 255 },
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 2 },
  });

  y = (doc.lastAutoTable?.finalY ?? y) + 10;

  if (Array.isArray(objectives) && objectives.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Objectives", margin, y);
    y += 2;

    const objRows = objectives.map((g) => {
      const label = String(g.label || g.website || "—").slice(0, 40);
      const type = String(g.type || "—");
      const target = formatTime(g.targetSeconds ?? 0);
      const prog = Math.min(100, Math.max(0, Number(g.progress) || 0));
      return [label, type, target, `${prog}%`];
    });

    autoTable(doc, {
      startY: y,
      head: [["Objective", "Type", "Target", "Progress"]],
      body: objRows,
      theme: "striped",
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 1.5 },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 10;
  }

  if (Array.isArray(topDomains) && topDomains.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Top sites (today)", margin, y);
    y += 2;

    const domRows = topDomains.slice(0, 20).map((d) => [
      String(d._id || "—").slice(0, 36),
      String(d.category || "—"),
      formatTime(d.totalTime ?? 0),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Site", "Category", "Time"]],
      body: domRows,
      theme: "grid",
      headStyles: { fillColor: [55, 65, 81], textColor: 255 },
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 1.5 },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  }

  doc.setFontSize(8);
  doc.setTextColor(120);
  const footY = Math.min(y + 6, doc.internal.pageSize.getHeight() - 8);
  doc.text(
    "ProdLytics — productivity overview. Data reflects dashboard sync for the current account.",
    margin,
    footY,
    { maxWidth: pageW - margin * 2 },
  );

  const fname = `prodlytics-overview-${safeNamePart(userName)}-${fileDate}.pdf`;
  doc.save(fname);
}

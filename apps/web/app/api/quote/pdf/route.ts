/**
 * POST /api/quote/pdf
 *
 * Accepts a quote payload and returns a branded iValeter PDF.
 * Uses jsPDF (lightweight, runs in Node) — no Python/ReportLab needed.
 */
import { NextResponse } from "next/server";

interface LineItem {
  id: string;
  service: string;
  qty: number;
  unitPrice: number;
  duration: string;
}

interface QuotePayload {
  meta: {
    dealership: string;
    contact: string;
    address: string;
    validUntil: string;
  };
  items: LineItem[];
  terms: string;
  quoteRef?: string;
}

export async function POST(req: Request) {
  const body = (await req.json()) as QuotePayload;

  // Dynamic import — jsPDF is ESM-friendly
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // ── Brand colours ──────────────────────────────────────────────────────
  const ORANGE: [number, number, number] = [232, 101, 10];
  const INK: [number, number, number] = [28, 26, 22];
  const CREAM: [number, number, number] = [245, 240, 232];
  const MUTED: [number, number, number] = [122, 121, 116];

  const PAGE_W = 210;
  const MARGIN = 16;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // ── Header bar ─────────────────────────────────────────────────────────
  doc.setFillColor(...INK);
  doc.rect(0, 0, PAGE_W, 26, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...ORANGE);
  doc.text("i", MARGIN, 17);

  doc.setTextColor(255, 255, 255);
  const iWidth = doc.getTextWidth("i");
  doc.text("Valeter", MARGIN + iWidth, 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.text("Total Valeting Ltd — ivaleter.co.uk", MARGIN, 23);

  // QUOTE label top right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...ORANGE);
  doc.text("QUOTE", PAGE_W - MARGIN, 17, { align: "right" });

  // ── Meta section ───────────────────────────────────────────────────────
  let y = 36;

  // Quote ref + date
  const quoteRef = body.quoteRef ?? `QT-${Date.now().toString(36).toUpperCase()}`;
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Ref: ${quoteRef}`, PAGE_W - MARGIN, y, { align: "right" });
  doc.text(`Date: ${today}`, PAGE_W - MARGIN, y + 5, { align: "right" });
  if (body.meta.validUntil) {
    const validDate = new Date(body.meta.validUntil).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    doc.text(`Valid until: ${validDate}`, PAGE_W - MARGIN, y + 10, { align: "right" });
  }

  // Addressee
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text("Prepared for:", MARGIN, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 6;
  if (body.meta.dealership) { doc.text(body.meta.dealership, MARGIN, y); y += 5; }
  if (body.meta.contact)    { doc.setTextColor(...MUTED); doc.text(body.meta.contact, MARGIN, y); doc.setTextColor(...INK); y += 5; }
  if (body.meta.address)    { doc.setTextColor(...MUTED); doc.text(body.meta.address, MARGIN, y); doc.setTextColor(...INK); y += 5; }

  y += 6;

  // ── Line items table ───────────────────────────────────────────────────
  const subtotal = body.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const vat = subtotal * 0.2;
  const total = subtotal + vat;

  const tableRows = body.items.map((i) => [
    i.service || "—",
    i.duration || "—",
    i.qty.toString(),
    `£${i.unitPrice.toFixed(2)}`,
    `£${(i.qty * i.unitPrice).toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Service", "Duration", "Qty", "Unit price", "Total"]],
    body: tableRows,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 9, cellPadding: 3, textColor: INK },
    headStyles: {
      fillColor: INK,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: CREAM },
    columnStyles: {
      0: { cellWidth: CONTENT_W * 0.38 },
      1: { cellWidth: CONTENT_W * 0.15 },
      2: { cellWidth: CONTENT_W * 0.1, halign: "right" },
      3: { cellWidth: CONTENT_W * 0.18, halign: "right" },
      4: { cellWidth: CONTENT_W * 0.19, halign: "right", fontStyle: "bold" },
    },
  });

  // ── Totals ─────────────────────────────────────────────────────────────
  const afterTable = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  const totalsX = PAGE_W - MARGIN - 60;
  let ty = afterTable;

  const fmtGbp = (n: number) => `£${n.toFixed(2)}`;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Subtotal", totalsX, ty);
  doc.text(fmtGbp(subtotal), PAGE_W - MARGIN, ty, { align: "right" });
  ty += 6;
  doc.text("VAT (20%)", totalsX, ty);
  doc.text(fmtGbp(vat), PAGE_W - MARGIN, ty, { align: "right" });
  ty += 2;

  doc.setDrawColor(...MUTED);
  doc.line(totalsX, ty, PAGE_W - MARGIN, ty);
  ty += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Total", totalsX, ty);
  doc.setTextColor(...ORANGE);
  doc.text(fmtGbp(total), PAGE_W - MARGIN, ty, { align: "right" });

  // ── Terms ──────────────────────────────────────────────────────────────
  ty += 10;
  if (body.terms) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text("Terms & Conditions", MARGIN, ty);
    ty += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    const termLines = doc.splitTextToSize(body.terms, CONTENT_W);
    doc.text(termLines, MARGIN, ty);
    ty += termLines.length * 4.5 + 6;
  }

  // ── Signature block ────────────────────────────────────────────────────
  const sigY = Math.max(ty + 6, 240);
  doc.setDrawColor(...MUTED);
  doc.line(MARGIN, sigY, MARGIN + 60, sigY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("Authorised signature", MARGIN, sigY + 4);
  doc.line(PAGE_W - MARGIN - 60, sigY, PAGE_W - MARGIN, sigY);
  doc.text("Date", PAGE_W - MARGIN - 60, sigY + 4);

  // ── Footer ─────────────────────────────────────────────────────────────
  doc.setFillColor(...INK);
  doc.rect(0, 285, PAGE_W, 12, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text("iValeter  ·  info@totalvaleting.co.uk  ·  ivaleter.co.uk", PAGE_W / 2, 292, { align: "center" });

  // ── Metadata ───────────────────────────────────────────────────────────
  doc.setProperties({
    title: `iValeter Quote — ${body.meta.dealership || "Draft"}`,
    author: "Perplexity Computer",
    creator: "iValeter",
  });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ivaleter-quote-${quoteRef}.pdf"`,
    },
  });
}

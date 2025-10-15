// controllers/stockReportController.js
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import Stock from "../models/StockModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Colors / layout ----
const GREEN = "#2A5540";
const BORDER = "#d4d7db";
const HEADER_BORDER = "#9bb3a7";

// Only these reasons are included (exactly 7 “sections” in the report)
const REASON_ORDER = [
  "coco-create",
  "products-in",
  "for-sale",
  "purchase-create",
  "item-purchased",
  "item-used",
  "wastage",
];

// Pretty labels (left column). Fallback to raw reason if not listed.
const REASON_LABELS = {
  "coco-create": "Coco-create",
  "products-in": "Products-in",
  "for-sale": "For-sale",
  "purchase-create": "Purchase-create",
  "item-purchased": "Item-purchased",
  "item-used": "Item-used",
  "wastage": "Wastage",
};

// ---- Formatters ----
const fmtMoney = (n) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const fmtRs = (n) => `Rs.${fmtMoney(n)}`;

// Friendly footer period text: 2025.09.16 to 2025.10.16 (September 16 to October 16)
function buildPeriodText(start, end) {
  const pad = (x) => String(x).padStart(2, "0");
  const dotDate = (d) =>
    `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  const nice = (d) =>
    `${d.toLocaleString("en-US", { month: "long" })} ${d.getDate()}`;

  if (!(start || end)) return "Period: 2025-09-15 - 2025-10-15";

  const s = start ? new Date(`${start}T00:00:00Z`) : null;
  const e = end ? new Date(`${end}T00:00:00Z`) : null;

  if (s && e) {
    return `Period: ${dotDate(s)} to ${dotDate(e)} (${nice(s)} to ${nice(e)})`;
  }
  if (s) return `Period: ${dotDate(s)} (${nice(s)})`;
  return `Period: ${dotDate(e)} (${nice(e)})`;
}

// ---- Controller ----
// GET /api/stocks/report/pdf?start=YYYY-MM-DD&end=YYYY-MM-DD
export async function getStockMovementsSummaryPDF(req, res) {
  try {
    const { start, end } = req.query;

    // optional date range match
    const match = {};
    if (start || end) {
      match.date = {};
      if (start) match.date.$gte = new Date(`${start}T00:00:00.000Z`);
      if (end) match.date.$lte = new Date(`${end}T23:59:59.999Z`);
    }

    // --- Aggregate: reason+item sums, keeping only the 7 reasons ---
    const pipeline = [
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      { $addFields: { reason_lc: { $toLower: "$reason" } } },
      { $match: { reason_lc: { $in: REASON_ORDER } } },

      // Sum per (reason,item)
      {
        $group: {
          _id: { reason: "$reason_lc", item_id: "$item_id" },
          qty: { $sum: "$qty" },
          value: { $sum: "$tot_value" },
        },
      },

      // Group back per reason to get items[]
      {
        $group: {
          _id: "$_id.reason",
          items: {
            $push: {
              item_id: "$_id.item_id",
              qty: "$qty",
              value: "$value",
            },
          },
          totalQty: { $sum: "$qty" },
          totalValue: { $sum: "$value" },
        },
      },

      {
        $project: {
          _id: 0,
          reason: "$_id",
          items: 1,
          totalQty: 1,
          totalValue: 1,
        },
      },
    ];

    const grouped = await Stock.aggregate(pipeline);

    // Normalize to all 7 sections in fixed order
    const map = new Map(grouped.map((g) => [g.reason, g]));
    const sections = REASON_ORDER.map((r) => {
      const g = map.get(r);
      // sort items by item code (A→Z)
      const items = (g?.items || []).sort((a, b) =>
        String(a.item_id).localeCompare(String(b.item_id))
      );
      const totalQty = g?.totalQty || 0;
      const totalValue = g?.totalValue || 0;
      return { reason: r, items, totalQty, totalValue };
    });

    // Totals for summary bar
    const totalMovements = await Stock.countDocuments(
      Object.keys(match).length ? match : {}
    );
    const totalPurchaseValue =
      (map.get("purchase-create")?.totalValue || 0) +
      (map.get("item-purchased")?.totalValue || 0);
    const totalWastageValue = map.get("wastage")?.totalValue || 0;

    // ---- PDF setup ----
    const doc = new PDFDocument({ size: "A4", margin: 36 });
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=stock-movements-summary.pdf"
    );
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    doc.pipe(res);

    // dimensions
    const margin = 36;
    const pageW = doc.page.width;
    const contentX = margin;
    const contentW = pageW - margin * 2;

    // Footer setup (reserve space + util)
    doc.page.margins.bottom = 40; // keep space for footer
    const periodText = buildPeriodText(start, end);

    // footer drawer — single line, no wrap (prevents page add)
    const drawFooter = () => {
      // draw INSIDE the drawable area to avoid auto page add
      const y = doc.page.height - doc.page.margins.bottom - 12;
      doc.save();
      doc.font("Helvetica").fontSize(9).fillColor("#555");
      doc.text(
        `${periodText} — Page ${doc.page.number}`,
        contentX,
        y,
        { width: contentW, align: "center", lineBreak: false }
      );
      doc.restore();
    };
    // draw on every new page
    doc.on("pageAdded", drawFooter);

    // Header
    let y = 35;
    try {
      const logoPath = path.join(__dirname, "../static/clogo.png");
      doc.image(logoPath, contentX - 0, y - 20, { width: 90, height: 90 });
    } catch {}

    doc.font("Helvetica-Bold")
      .fillColor("#000")
      .fontSize(20)
      .text("CocoSmart Pvt Ltd", contentX, y, {
        width: contentW,
        align: "center",
      });

    doc.moveDown(0.3);
    doc
      .font("Helvetica")
      .fontSize(14)
      .text("Smart Solutions for Coconut Plantations", contentX, undefined, {
        width: contentW,
        align: "center",
      });

    doc.moveDown(0.6);
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(
        "Hotline: +94 77 123 4567 | Email: info@cocosmart.com  |  Fax: +1-234-567-890",
        contentX,
        undefined,
        { width: contentW, align: "center" }
      );

    doc.moveDown(0.5);
    doc
      .font("Helvetica")
      .fontSize(9)
      .text("123/C, Main Street, Colombo 01, Sri Lanka", contentX, undefined, {
        width: contentW,
        align: "center",
      });

      // Report Title (centered, like your other reports)
doc.moveDown(1.2);
doc.font("Helvetica-Bold").fillColor("#000").fontSize(14)
  .text("Stock Movements Report", contentX, undefined, {
    width: contentW, align: "center",
  });

    // Meta line (Period left, Generated on right — same row)
    doc.moveDown(1.0);
    const metaY = doc.y;
    doc.font("Helvetica").fontSize(10).fillColor("#222");
    doc.text(periodText, contentX, metaY, {
      width: contentW / 2,
      align: "left",
    });
    doc.text(
      `Generated on: ${new Date().toLocaleString()}`,
      contentX + contentW / 2,
      metaY,
      {
        width: contentW / 2,
        align: "right",
      }
    );
    doc.moveDown(0.6);

    // Summary block (NOW 3 items)
    doc.moveDown(0.6);
    const sumH = 72;
    const sumY = doc.y;
    doc.save();
    doc.rect(contentX, sumY, contentW, sumH).fillAndStroke("#f7fff8", "#e6f2e9");
    doc.restore();

    const sumCols = 3;
    const sumColW = contentW / sumCols;
    const sumLabels = [
      "Total Movements (all)",
      "Total Purchase Value",
      "Total Wastage",
    ];
    const sumVals = [
      String(totalMovements),
      fmtRs(totalPurchaseValue),
      fmtRs(totalWastageValue),
    ];
    for (let i = 0; i < sumCols; i++) {
      const cx = contentX + i * sumColW;
      doc.fillColor("#666").fontSize(10).text(sumLabels[i], cx, sumY + 12, {
        width: sumColW,
        align: "center",
      });
      doc.fillColor("#111").fontSize(14).text(sumVals[i], cx, sumY + 32, {
        width: sumColW,
        align: "center",
      });
    }
    doc.y = sumY + sumH + 14;
    doc.fillColor("#222");

    // ---- Table (Movements / Item Code / Quantity / Total value (Rs.)) ----
    const ROW_H = 24;
    const HEADER_H = 28;
    const HEADER_FONT = 10;
    const DATA_FONT = 10;

    // Movements wider
    const FRACTIONS = [0.36, 0.24, 0.18, 0.22];
    let widths = FRACTIONS.map((f) => Math.floor(contentW * f));
    const used = widths.reduce((a, b) => a + b, 0);
    widths[widths.length - 1] += Math.round(contentW - used);

    const COLS = [
      ["Movements", widths[0]],
      ["Item Code", widths[1]],
      ["Quantity", widths[2]],
      ["Total value (Rs.)", widths[3]],
    ];

    const colXs = [contentX];
    for (let i = 0; i < COLS.length; i++) colXs.push(colXs[i] + COLS[i][1]);

    const drawHeader = (yy) => {
      doc.save();
      doc.rect(contentX, yy, contentW, HEADER_H).fill(GREEN);
      doc.restore();

      let x = contentX;
      doc.fillColor("#fff").fontSize(HEADER_FONT);
      COLS.forEach(([label, w]) => {
        doc.text(label, x + 6, yy + (HEADER_H - HEADER_FONT) / 2, {
          width: w - 12,
          align: "left",
          lineBreak: false,
          ellipsis: true,
        });
        x += w;
      });

      doc.save();
      doc.lineWidth(0.7).strokeColor(HEADER_BORDER);
      doc.rect(contentX, yy, contentW, HEADER_H).stroke();
      for (let i = 1; i < colXs.length; i++) {
        doc.moveTo(colXs[i], yy).lineTo(colXs[i], yy + HEADER_H).stroke();
      }
      doc.restore();

      return yy + HEADER_H;
    };

    const drawLineBorders = (yy, bg = null) => {
      if (bg) {
        doc.save();
        doc.rect(contentX, yy, contentW, ROW_H).fill(bg);
        doc.restore();
      }
      doc.save();
      doc.lineWidth(0.5).strokeColor(BORDER);
      doc.rect(contentX, yy, contentW, ROW_H).stroke();
      for (let i = 1; i < colXs.length; i++) {
        doc.moveTo(colXs[i], yy).lineTo(colXs[i], yy + ROW_H).stroke();
      }
      doc.restore();
    };

    const drawDataRow = (yy, { reasonCell, itemCode, qty, value }, isOdd) => {
      drawLineBorders(yy, isOdd ? "#ffffff" : "#f9f9f9");

      let tx = contentX;
      doc.font("Helvetica").fontSize(DATA_FONT).fillColor("#222");

      // Movements
      doc.text(reasonCell, tx + 6, yy + 6, {
        width: COLS[0][1] - 12,
        align: "left",
        ellipsis: true,
      });
      tx += COLS[0][1];

      // Item Code
      doc.text(itemCode || "", tx + 6, yy + 6, {
        width: COLS[1][1] - 12,
        align: "left",
        ellipsis: true,
      });
      tx += COLS[1][1];

      // Quantity (right)
      doc.text(
        qty !== undefined && qty !== null ? String(qty) : "",
        tx + 6,
        yy + 6,
        {
          width: COLS[2][1] - 12,
          align: "right",
          ellipsis: true,
        }
      );
      tx += COLS[2][1];

      // Total value (Rs.) (right)
      doc.text(
        value !== undefined && value !== null ? fmtRs(value) : "",
        tx + 6,
        yy + 6,
        {
          width: COLS[3][1] - 12,
          align: "right",
          ellipsis: true,
        }
      );
    };

    const drawSubtotalRow = (yy, label, qty, value) => {
      drawLineBorders(yy, "#eef6f0");
      let tx = contentX;
      doc.font("Helvetica-Bold").fontSize(DATA_FONT).fillColor("#0f2f22");
      doc.text(label, tx + 6, yy + 6, { width: COLS[0][1] - 12, align: "left" });
      tx += COLS[0][1];

      doc.text("", tx + 6, yy + 6, { width: COLS[1][1] - 12, align: "left" });
      tx += COLS[1][1];

      doc.text(String(qty), tx + 6, yy + 6, { width: COLS[2][1] - 12, align: "right" });
      tx += COLS[2][1];

      doc.text(fmtRs(value), tx + 6, yy + 6, { width: COLS[3][1] - 12, align: "right" });
    };

    // Draw table header
    y = drawHeader(doc.y);

    // Render each reason section
    let odd = false;
    for (const section of sections) {
      const label = REASON_LABELS[section.reason] || section.reason;

      if (section.items.length === 0) {
        // blank line + subtotal for empty sections (optional)
        drawDataRow(
          y,
          { reasonCell: label, itemCode: "", qty: "", value: "" },
          (odd = !odd)
        );
        y += ROW_H;
        if (y > doc.page.height - 72) {
          doc.addPage();
          y = drawHeader(48);
        }

        drawSubtotalRow(y, `${label} (total)`, 0, 0);
        y += ROW_H;
        if (y > doc.page.height - 72) {
          doc.addPage();
          y = drawHeader(48);
        }
        continue;
      }

      // items
      for (let i = 0; i < section.items.length; i++) {
        const it = section.items[i];
        const reasonCell = i === 0 ? label : "";
        drawDataRow(
          y,
          { reasonCell, itemCode: it.item_id, qty: it.qty, value: it.value },
          (odd = !odd)
        );
        y += ROW_H;

        if (y > doc.page.height - 72) {
          doc.addPage();
          y = drawHeader(48);
        }
      }

      // subtotal
      drawSubtotalRow(y, `${label} (total)`, section.totalQty, section.totalValue);
      y += ROW_H;
      if (y > doc.page.height - 72) {
        doc.addPage();
        y = drawHeader(48);
      }
    }

    // ensure footer on the last (and first) page, then end
    drawFooter();
    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error generating stock summary PDF",
    });
  }
}

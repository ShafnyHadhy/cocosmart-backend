// controllers/stockReportController.js
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

import PDFDocument from "pdfkit";
import Stock from "../models/StockModel.js";

// Format helper
const fmt2 = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export async function getStocksReportPDF(req, res) {
  try {
    // Pull all stock records (lean for perf)
    const stocks = await Stock.find().lean();

    // --- Summary metrics ---
    const totalRecords = stocks.length;
    const qtyIn  = stocks
      .filter(s => String(s.type).toLowerCase() === "in")
      .reduce((sum, s) => sum + Number(s.qty || 0), 0);
    const qtyOut = stocks
      .filter(s => String(s.type).toLowerCase() === "out")
      .reduce((sum, s) => sum + Number(s.qty || 0), 0);
    const valIn  = stocks
      .filter(s => String(s.type).toLowerCase() === "in")
      .reduce((sum, s) => sum + Number(s.tot_value || 0), 0);
    const valOut = stocks
      .filter(s => String(s.type).toLowerCase() === "out")
      .reduce((sum, s) => sum + Number(s.tot_value || 0), 0);
    const netQty   = qtyIn - qtyOut;
    const netValue = valIn - valOut;

    // --- PDF setup ---
    const doc = new PDFDocument({ size: "A4", margin: 36 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=stock-movements-report.pdf"
    );
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    doc.pipe(res);

    // Colors & layout (match your style)
    const GREEN = "#2A5540";
    const margin = 36;
    const pageW = doc.page.width;
    const contentX = margin;
    const contentW = pageW - margin * 2;

    // --- Header / Title ---
    let y = 35;

    // Optional logo (safe if missing)
    try {
      const logoPath = path.join(__dirname, "../static/clogo.png");
      doc.image(logoPath, contentX - 21, y - 4, { width: 90, height: 90 });
    } catch (e) {
      console.warn("Logo not found:", e.message);
    }

    // Company title
    doc
      .font("Helvetica-Bold")
      .fillColor("#000")
      .fontSize(20)
      .text("CocoSmart Pvt Ltd", contentX, y, { width: contentW, align: "center" });

    // Tagline
    doc.moveDown(0.3);
    doc
      .font("Helvetica")
      .fillColor("#000")
      .fontSize(14)
      .text("Smart Solutions for Coconut Plantations", contentX, undefined, {
        width: contentW,
        align: "center",
      });

    // Hotline / Email / Fax
    doc.moveDown(0.5);
    doc
      .font("Helvetica")
      .fillColor("#000")
      .fontSize(9)
      .text(
        "Hotline: +94 77 123 4567 | Email: info@cocosmart.com  |  Fax: +1-234-567-890",
        contentX,
        undefined,
        { width: contentW, align: "center" }
      );

    // Address
    doc.moveDown(0.5);
    doc
      .font("Helvetica")
      .fillColor("#000")
      .fontSize(9)
      .text("123/C, Main Street, Colombo 01, Sri Lanka", contentX, undefined, {
        width: contentW,
        align: "center",
      });

    // Report Title
    doc.moveDown(1.2);
    doc
      .font("Helvetica-Bold")
      .fillColor("#000")
      .fontSize(14)
      .text("Stock Movements Report", contentX, undefined, {
        width: contentW,
        align: "center",
      });

    // Generated on (right)
    doc.moveDown(0.9);
    const metaY = doc.y;
    doc
      .font("Helvetica")
      .fillColor("#000")
      .fontSize(10)
      .text(`Generated on: ${new Date().toLocaleString()}`, contentX, metaY, {
        width: contentW,
        align: "right",
      });

    // Small gap before summary
    doc.moveDown(0.8);

    // --- Summary block (4 items inline) ---
    const boxH = 72;
    const boxY = doc.y;
    doc.rect(contentX, boxY, contentW, boxH).fillAndStroke("#f7fff8", "#e6f2e9");

    const cols = 4;
    const colW = contentW / cols;
    const labels = [
      "Total Records",
      "Net Quantity (In - Out)",
      "Total Value In",
      "Total Value Out",
    ];
    const values = [
      String(totalRecords),
      String(netQty),
      fmt2(valIn),
      fmt2(valOut),
    ];
    const valueColors = ["#111", netQty >= 0 ? "#1f6f24" : "#c1121f", "#1f6f24", "#b26a00"];

    for (let i = 0; i < cols; i++) {
      const x = contentX + i * colW;
      doc
        .fillColor("#666")
        .fontSize(10)
        .text(labels[i], x, boxY + 12, { width: colW, align: "center" });

      doc
        .fillColor(valueColors[i])
        .fontSize(14)
        .text(values[i], x, boxY + 32, { width: colW, align: "center" });
    }

    // Move cursor below summary box
    doc.y = boxY + boxH + 14;
    doc.fillColor("#222");

    // --- Table layout ---
    const ROW_H = 24;
    const HEADER_H = 28;
    const HEADER_FONT = 10;
    const DATA_FONT = 10;

    // Columns (fractions add to 1.0)
    // STOCK ID | ITEM ID | CATEGORY | TYPE | REASON | QTY | TOTAL VALUE | DATE | ENTERED BY
    const FRACTIONS = [0.12, 0.12, 0.12, 0.08, 0.18, 0.08, 0.14, 0.08, 0.08];

    let widths = FRACTIONS.map((f) => Math.floor(contentW * f));
    const used = widths.reduce((a, b) => a + b, 0);
    widths[widths.length - 1] += Math.round(contentW - used);

    const COLS = [
      ["Stock ID", widths[0]],
      ["Item ID", widths[1]],
      ["Category", widths[2]],
      ["Type", widths[3]],
      ["Reason", widths[4]],
      ["Qty", widths[5]],
      ["Total Value", widths[6]],
      ["Date", widths[7]],
      ["Entered By", widths[8]],
    ];

    const drawHeader = (y) => {
      doc.rect(contentX, y, contentW, HEADER_H).fill(GREEN);

      let x = contentX;
      doc.fillColor("#fff").fontSize(HEADER_FONT);
      COLS.forEach(([label, w]) => {
        doc.text(label, x + 4, y + (HEADER_H - HEADER_FONT) / 2, {
          width: w - 8,
          align: "left",
          lineBreak: false,
          ellipsis: true,
        });
        x += w;
      });
      return y + HEADER_H;
    };

    let yTable = drawHeader(doc.y);

    // Sort by date desc (optional; keeps recent first)
    const sorted = [...stocks].sort((a, b) => {
      const da = a?.date ? new Date(a.date).getTime() : 0;
      const db = b?.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

    // --- Rows ---
    sorted.forEach((s, idx) => {
      // banded rows
      doc
        .rect(contentX, yTable, contentW, ROW_H)
        .fill(idx % 2 ? "#ffffff" : "#f9f9f9");

      let x = contentX;
      const cell = (w, text, color = "#222") => {
        doc
          .fillColor(color)
          .fontSize(DATA_FONT)
          .text(String(text ?? ""), x + 4, yTable + (ROW_H - DATA_FONT) / 2, {
            width: w - 8,
            align: "left",
            lineBreak: false,
            ellipsis: true,
          });
        x += w;
      };

      cell(COLS[0][1], s.stock_id || "-");
      cell(COLS[1][1], s.item_id || "-");
      cell(COLS[2][1], s.category || "-");
      cell(COLS[3][1], s.type || "-");
      cell(COLS[4][1], s.reason || "-");
      cell(COLS[5][1], s.qty ?? 0);
      cell(COLS[6][1], fmt2(s.tot_value || 0), "#1f6f24"); // greenish for value
      cell(
        COLS[7][1],
        s.date ? new Date(s.date).toLocaleDateString() : "-"
      );
      cell(COLS[8][1], s.enter_by || "-");

      yTable += ROW_H;

      // Page break + redraw header
      if (yTable > doc.page.height - 72) {
        doc.addPage();
        yTable = drawHeader(48);
      }
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Error generating Stock Movements PDF",
    });
  }
}

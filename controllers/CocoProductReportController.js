// controllers/CocoProductReportController.js
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import PDFDocument from "pdfkit";
import CocoProduct from "../models/CocoProductModel.js";

// --- Rules ---
const LOW_STOCK_THRESHOLD = 150; // qty_on_hand < 10000 → red
const EXPIRY_SOON_DAYS = 30;       // within 30 days → orange

// --- Formatters ---
const fmtMoney = (n) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(n || 0));

const fmtLKR = (n) => `LKR.${fmtMoney(n)}`;

export async function getCocoInventoryReportPDF(req, res) {
  try {
    const products = await CocoProduct.find().lean();

    const now = new Date();
    const soon = new Date(now.getTime() + EXPIRY_SOON_DAYS * 24 * 60 * 60 * 1000);

    // --- Summary metrics ---
    const totalItems = products.length;
    const lowStockCount = products.filter(p => Number(p.qty_on_hand || 0) < LOW_STOCK_THRESHOLD).length;
    const expiryItemCount = products.filter(p => p.expire_date && new Date(p.expire_date) <= soon).length;
    const totalInventoryValue = products.reduce(
      (sum, p) => sum + Number(p.std_cost || 0) * Number(p.qty_on_hand || 0),
      0
    );

    // --- PDF setup (Finance PDF style) ---
    const doc = new PDFDocument({ size: "A4", margin: 36 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=cocosmart-inventory.pdf");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    doc.pipe(res);

    const GREEN = "#2A5540";
    const BORDER = "#d4d7db";
    const HEADER_BORDER = "#9bb3a7";
    const margin = 36;
    const pageW = doc.page.width;
    const contentX = margin;
    const contentW = pageW - margin * 2;

    // --- Header / Title ---
    let y = 35;

    // Optional logo (tolerates missing file)
    try {
      const logoPath = path.join(__dirname, "../static/clogo.png");
      doc.image(logoPath, contentX - 0, y - 20, { width: 90, height: 90 });
    } catch (e) {
      console.warn("Logo not found:", e.message);
    }

    // Company name
    doc.font("Helvetica-Bold").fillColor("#000").fontSize(20)
      .text("CocoSmart Pvt Ltd", contentX, y, { width: contentW, align: "center" });

    // Tagline
    doc.moveDown(0.3);
    doc.font("Helvetica").fillColor("#000").fontSize(14)
      .text("Smart Solutions for Coconut Plantations", contentX, undefined, {
        width: contentW, align: "center",
      });

    // Hotline / Email / Fax
    doc.moveDown(0.6);
    doc.font("Helvetica").fillColor("#000").fontSize(9)
      .text("Hotline: +94 77 123 4567 | Email: info@cocosmart.com  |  Fax: +1-234-567-890",
        contentX, undefined, { width: contentW, align: "center" });

    // Address
    doc.moveDown(0.5);
    doc.font("Helvetica").fillColor("#000").fontSize(9)
      .text("123/C, Main Street, Colombo 01, Sri Lanka", contentX, undefined, {
        width: contentW, align: "center",
      });

    // Report Title
    doc.moveDown(1.5);
    doc.font("Helvetica-Bold").fillColor("#000").fontSize(14)
      .text("Coconut Products Inventory Report", contentX, undefined, {
        width: contentW, align: "center",
      });

    // Generated on (right aligned)
    doc.moveDown(1.2);
    const metaY = doc.y;
    doc.font("Helvetica").fillColor("#000").fontSize(10)
      .text(`Generated on: ${new Date().toLocaleString()}`, contentX, metaY, {
        width: contentW, align: "right",
      });

    // --- Summary block (4 items inline) ---
    doc.moveDown(0.6);
    const boxH = 72;
    const boxY = doc.y;
    doc.save();
    doc.rect(contentX, boxY, contentW, boxH).fillAndStroke("#f7fff8", "#e6f2e9");
    doc.restore();

    const cols = 4;
    const colW = contentW / cols;
    const labels = [
      "Total Items",
      "Expiry Item Count",
      "Low Stock Count",
      "Total Inventory Value",
    ];
    const values = [
      String(totalItems),
      String(expiryItemCount),
      String(lowStockCount),
      fmtLKR(totalInventoryValue),
    ];

    for (let i = 0; i < cols; i++) {
      const cx = contentX + i * colW;
      doc.fillColor("#666").fontSize(10)
        .text(labels[i], cx, boxY + 12, { width: colW, align: "center" });

      let valColor = "#111";
      if (i === 1) valColor = expiryItemCount ? "#b26a00" : "#1f6f24"; // expiry
      if (i === 2) valColor = lowStockCount ? "#c1121f" : "#1f6f24";     // low stock

      doc.fillColor(valColor).fontSize(14)
        .text(values[i], cx, boxY + 32, { width: colW, align: "center" });
    }

    // move cursor below summary box
    doc.y = boxY + boxH + 14;
    doc.fillColor("#222");

    // --- Table layout ---
    const ROW_H = 24;
    const HEADER_H = 28;
    const HEADER_FONT = 10;
    const DATA_FONT = 10;

    // 6 columns (Notes removed)
    const FRACTIONS = [0.16, 0.28, 0.14, 0.14, 0.14, 0.14];
    let widths = FRACTIONS.map(f => Math.floor(contentW * f));
    const used = widths.reduce((a, b) => a + b, 0);
    widths[widths.length - 1] += Math.round(contentW - used); // fix rounding on last col

    const COLS = [
      ["Product ID", widths[0]],
      ["Product Name", widths[1]],
      ["Qty On Hand", widths[2]],
      ["Qty Reserved", widths[3]],
      ["Avg Cost(Rs)", widths[4]],
      ["Expiry", widths[5]],
    ];

    // Precompute x positions for borders and text
    const colXs = [contentX];
    for (let i = 0; i < COLS.length; i++) {
      colXs.push(colXs[i] + COLS[i][1]);
    }

    const drawHeader = (yy) => {
      // Header background
      doc.save();
      doc.rect(contentX, yy, contentW, HEADER_H).fill(GREEN);
      doc.restore();

      // Header text
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

      // Header borders (outer + verticals)
      doc.save();
      doc.lineWidth(0.7).strokeColor(HEADER_BORDER);
      // outer rectangle
      doc.rect(contentX, yy, contentW, HEADER_H).stroke();
      // vertical lines
      for (let i = 1; i < colXs.length - 0; i++) {
        doc.moveTo(colXs[i], yy).lineTo(colXs[i], yy + HEADER_H).stroke();
      }
      doc.restore();

      return yy + HEADER_H;
    };

    // Draw initial header
    y = drawHeader(doc.y);

    // Helper to draw a single row with borders
    const drawRow = (rowY, idx, valuesForCols, styles = {}) => {
      const { bandAlt = true } = styles;

      // background (zebra)
      doc.save();
      doc.rect(contentX, rowY, contentW, ROW_H)
        .fill(bandAlt && idx % 2 ? "#ffffff" : "#f9f9f9");
      doc.restore();

      // text
      let tx = contentX;
      doc.fontSize(DATA_FONT);
      valuesForCols.forEach((cell, i) => {
        const { text, color = "#222" } = typeof cell === "object" && cell !== null
          ? cell
          : { text: cell };
        doc.fillColor(color).text(String(text ?? ""), tx + 6, rowY + (ROW_H - DATA_FONT) / 2, {
          width: COLS[i][1] - 12,
          align: "left",
          lineBreak: false,
          ellipsis: true,
        });
        tx += COLS[i][1];
      });

      // borders (outer + verticals + bottom)
      doc.save();
      doc.lineWidth(0.5).strokeColor(BORDER);
      // outer rectangle around the row
      doc.rect(contentX, rowY, contentW, ROW_H).stroke();
      // vertical separators
      for (let i = 1; i < colXs.length - 0; i++) {
        doc.moveTo(colXs[i], rowY).lineTo(colXs[i], rowY + ROW_H).stroke();
      }
      doc.restore();
    };

    // --- Rows ---
    products.forEach((p, idx) => {
      const low = Number(p.qty_on_hand || 0) < LOW_STOCK_THRESHOLD;
      const soonExp = p.expire_date && new Date(p.expire_date) <= soon;
      const expired = p.expire_date && new Date(p.expire_date) < now;

      const expiryText = p.expire_date
        ? (expired ? "Expired" : new Date(p.expire_date).toLocaleDateString())
        : "-";

      const rowCells = [
        { text: p.pro_id },
        { text: p.pro_name },
        { text: p.qty_on_hand, color: low ? "#c1121f" : "#222" },
        { text: p.qty_reserved },
        { text: fmtMoney(p.std_cost) }, // 10,000.00 style (no LKR prefix)
        { text: expiryText, color: soonExp ? "#b26a00" : "#222" },
      ];

      drawRow(y, idx, rowCells);
      y += ROW_H;

      // Page break + redraw header
      if (y > doc.page.height - 72) {
        doc.addPage();
        // recompute positions on new page (contentX/W same, so colXs still valid)
        y = drawHeader(48);
      }
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error generating PDF" });
  }
}

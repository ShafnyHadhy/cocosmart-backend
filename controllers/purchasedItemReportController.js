// controllers/purchasedItemReportController.js
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

import PDFDocument from "pdfkit";
import PurchasedItem from "../models/PurchasedItemModel.js";

// Rules
const EXPIRY_SOON_DAYS = 30; // within 30 days = "expiry items"
const LOW_STOCK_CHECK = (it) => Number(it.quantity || 0) < Number(it.ROL || 0);

export async function getPurchasedItemsReportPDF(req, res) {
  try {
    const items = await PurchasedItem.find().lean();

    const now = new Date();
    const soon = new Date(
      now.getTime() + EXPIRY_SOON_DAYS * 24 * 60 * 60 * 1000
    );

    // --- Summary metrics ---
    const totalItems = items.length;
    const expiryItemCount = items.filter(
      (p) => p.expire_date && new Date(p.expire_date) <= soon
    ).length;
    const lowStockCount = items.filter(LOW_STOCK_CHECK).length;
    const totalInventoryValue = items.reduce(
      (sum, it) => sum + Number(it.unit_cost || 0) * Number(it.quantity || 0),
      0
    );

    // --- PDF setup ---
    const doc = new PDFDocument({ size: "A4", margin: 36 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=purchased-items-inventory.pdf"
    );
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    doc.pipe(res);
    // Colors & layout to match Finance PDF
    const GREEN = "#2A5540"; // header strip color
    const margin = 36;
    const pageW = doc.page.width;
    const contentX = margin;
    const contentW = pageW - margin * 2;

    // Optional date range (use ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD)
    const startDate = req.query?.startDate || "All";
    const endDate = req.query?.endDate || "All";

    // --- Header / Title (Finance PDF style) ---
    let y = 35;

    // (Optional) Logo at top-left (safe if file missing)
   try {
  const logoPath = path.join(__dirname, "../static/clogo.png");
  doc.image(logoPath, contentX - 21, y - 4, { width: 90, height: 90 });
} catch (e) {
  console.warn("Logo not found:", e.message);
}


    // Company name (bold 20, centered)
    doc
      .font("Helvetica-Bold")
      .fillColor("#000")
      .fontSize(20)
      .text("CocoSmart Pvt Ltd", contentX, y, {
        width: contentW,
        align: "center",
      });

    // Tagline (normal 14)
    doc.moveDown(0.3);
    doc
      .font("Helvetica")
      .fillColor("#000")
      .fontSize(14)
      .text("Smart Solutions for Coconut Plantations", contentX, undefined, {
        width: contentW,
        align: "center",
      });

    // Hotline / Email / Fax (normal 9)
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

    // Address (normal 9)
    doc.moveDown(0.5);
    doc
      .font("Helvetica")
      .fillColor("#000")
      .fontSize(9)
      .text("123/C, Main Street, Colombo 01, Sri Lanka", contentX, undefined, {
        width: contentW,
        align: "center",
      });

    // Report Title (bold 14)
    doc.moveDown(1.2);
    doc
      .font("Helvetica-Bold")
      .fillColor("#000")
      .fontSize(14)
      .text("Purchased Items Inventory Report", contentX, undefined, {
        width: contentW,
        align: "center",
      });

    // Period (left) and Generated on (right), normal 10 at the same Y
    doc.moveDown(0.9);
    const metaY = doc.y;
    doc
      .font("Helvetica")
      .fillColor("#000")
      .fontSize(10)
    //   .text(`Period: ${startDate} - ${endDate}`, contentX, metaY, {
    //     width: contentW,
    //     align: "left",
    //   })
      .text(`Generated on: ${new Date().toLocaleString()}`, contentX, metaY, {
        width: contentW,
        align: "right",
      });

    // Small gap before summary
    doc.moveDown(0.8);

    // --- Summary block (4 items inline) ---

    const boxH = 72;
    const boxY = doc.y;
    doc
      .rect(contentX, boxY, contentW, boxH)
      .fillAndStroke("#f7fff8", "#e6f2e9");

    // 4 equal columns inside the summary box
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
      totalInventoryValue.toFixed(2),
    ];

    for (let i = 0; i < cols; i++) {
      const x = contentX + i * colW;
      doc
        .fillColor("#666")
        .fontSize(10)
        .text(labels[i], x, boxY + 12, { width: colW, align: "center" });

      // value color accents
      let valColor = "#111";
      if (i === 1) valColor = expiryItemCount ? "#b26a00" : "#1f6f24"; // expiry
      if (i === 2) valColor = lowStockCount ? "#c1121f" : "#1f6f24"; // low stock

      doc
        .fillColor(valColor)
        .fontSize(14)
        .text(values[i], x, boxY + 32, { width: colW, align: "center" });
    }

    // move cursor below summary box
    doc.y = boxY + boxH + 14;
    doc.fillColor("#222");

    // --- Table layout (A4-fit, no overflow) ---
    const ROW_H = 24;
    const HEADER_H = 28;
    const HEADER_FONT = 10;
    const DATA_FONT = 10;

    // Column fractions: must sum to 1.0 (contentW)
    const FRACTIONS = [0.12, 0.26, 0.1, 0.08, 0.08, 0.14, 0.22];
    // Compute integer widths that perfectly fill contentW
    let widths = FRACTIONS.map((f) => Math.floor(contentW * f));
    const used = widths.reduce((a, b) => a + b, 0);
    widths[widths.length - 1] += Math.round(contentW - used); // fix rounding on last col

    const COLS = [
      ["Item ID", widths[0]],
      ["Item Name", widths[1]],
      ["Unit Cost", widths[2]],
      ["Qty", widths[3]],
      ["ROL", widths[4]],
      ["Expiry", widths[5]],
      ["Supplier ID", widths[6]],
    ];

    const drawHeader = (y) => {
      doc.rect(contentX, y, contentW, HEADER_H).fill(GREEN);

      let x = contentX;
      doc.fillColor("#fff").fontSize(HEADER_FONT);
      COLS.forEach(([label, w]) => {
        doc.text(label, x + 4, y + (HEADER_H - HEADER_FONT) / 2, {
          width: w - 8,
          align: "left",
          lineBreak: false, // keep header on one line
          ellipsis: true,
        });
        x += w;
      });
      return y + HEADER_H;
    };

    y = drawHeader(doc.y);

    // --- Rows (truncate long text; no wrap) ---
    items.forEach((p, idx) => {
      const isLow = LOW_STOCK_CHECK(p);
      const soonExp = p.expire_date && new Date(p.expire_date) <= soon;
      const expired = p.expire_date && new Date(p.expire_date) < now;

      // banded background
      doc
        .rect(contentX, y, contentW, ROW_H)
        .fill(idx % 2 ? "#ffffff" : "#f9f9f9");

      let x = contentX;
      const cell = (w, text, color = "#222") => {
        doc
          .fillColor(color)
          .fontSize(DATA_FONT)
          .text(String(text ?? ""), x + 4, y + (ROW_H - DATA_FONT) / 2, {
            width: w - 8,
            align: "left",
            lineBreak: false, // 🔒 prevents wrapping to next line
            ellipsis: true, // … if too long
          });
        x += w;
      };

      cell(COLS[0][1], p.item_id);
      cell(COLS[1][1], p.item_name);
      cell(COLS[2][1], Number(p.unit_cost || 0).toFixed(2));
      cell(COLS[3][1], p.quantity, isLow ? "#c1121f" : "#222"); // Qty red if < ROL
      cell(COLS[4][1], p.ROL);

      const expiryText = p.expire_date
        ? expired
          ? "Expired"
          : new Date(p.expire_date).toLocaleDateString()
        : "-";
      cell(COLS[5][1], expiryText, soonExp ? "#b26a00" : "#222");

      // Supplier column (tolerate either field)
      cell(COLS[6][1], p.supplier_id || p.supplier || "-");

      y += ROW_H;

      // Page break + redraw header
      if (y > doc.page.height - 72) {
        doc.addPage();
        y = drawHeader(48);
      }
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({
        success: false,
        message: "Error generating Purchased Items PDF",
      });
  }
}

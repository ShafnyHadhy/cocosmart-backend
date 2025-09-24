// const PDFDocument = require("pdfkit");
// const CocoProduct = require("../Model/CocoProductModel");

import PDFDocument from "pdfkit";
import CocoProduct from "../models/CocoProductModel.js";  // ✅ fixed path + ESM import

const LOW_STOCK_THRESHOLD = 10000; // qty_on_hand < 10000 → red
const EXPIRY_SOON_DAYS = 30; // within 30 days → orange

export async function getCocoInventoryReportPDF (req, res) {
  try {
    const products = await CocoProduct.find().lean();

    const now = new Date();
    const soon = new Date(
      now.getTime() + EXPIRY_SOON_DAYS * 24 * 60 * 60 * 1000
    );

    const totalItems = products.length;
    const lowStockCount = products.filter(
      (p) => p.qty_on_hand < LOW_STOCK_THRESHOLD
    ).length;
    const expiryItemCount = products.filter(
      (p) => p.expire_date && new Date(p.expire_date) <= soon
    ).length;

    // create PDF
    const doc = new PDFDocument({ size: "A4", margin: 36 });
    res.setHeader("Content-Type", "application/pdf");
    // before
    //res.setHeader("Content-Disposition", "inline; filename=cocosmart-inventory.pdf");
    // make browsers prefer download:
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=cocosmart-inventory.pdf"
    );
    // allow frontend to read this header across CORS:
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    doc.pipe(res);

    // Branding + title

    // Title
    doc
      .fillColor("#1a8f3e")
      .fontSize(22)
      .text("CocoSmart", { align: "center" });

    doc
      .fillColor("#222")
      .fontSize(16)
      .text("Coconut Products Inventory Report", { align: "center" });

    doc
      .moveDown(0.2)
      .fontSize(10)
      .fillColor("#666")
      .text(`Generated on ${new Date().toLocaleString()}`, { align: "center" });

    // Contact info line (all in one line, nicely spaced)
    doc
      .moveDown(0.3)
      .fontSize(10)
      .fillColor("#444")
      .text(
        "CocoSmart Pvt. Ltd. | 123 Green Street, City, Country | Email: info@cocosmart.com | Fax: +1-234-567-890",
        { align: "center" }
      );

    doc.moveDown(1.8);

    // Summary
    // const top = doc.y;
    // doc.rect(36, top, doc.page.width - 72, 58).fill("#f7fff8").stroke("#e6f2e9");
    // doc.fillColor("#666").fontSize(10);
    // Summary
    const top = doc.y;
    doc
      .rect(36, top, doc.page.width - 72, 58)
      .fillAndStroke("#f7fff8", "#e6f2e9");
    doc.fillColor("#666").fontSize(10);

    doc.text("Total Items", 48, top + 10);
    doc.text("Expiry Item Count", 220, top + 10);
    doc.text("Low Stock Count", 410, top + 10);
    doc.fontSize(14).fillColor("#111");
    doc.text(String(totalItems), 48, top + 24);
    doc
      .fillColor(expiryItemCount ? "#b26a00" : "#1f6f24")
      .text(String(expiryItemCount), 220, top + 24);
    doc
      .fillColor(lowStockCount ? "#c1121f" : "#1f6f24")
      .text(String(lowStockCount), 410, top + 24);
    doc.moveDown(2).fillColor("#222");

    // // Table headers
    // let y = doc.y + 6;
    // const xs = [36, 120, 260, 340, 420, 500, 580];
    // const headers = ["Product ID", "Product Name", "Qty On Hand", "QTY Reserved", "Avg Cost", "Expiry", "Note"];
    // doc.rect(36, y, doc.page.width - 72, 22).fill("#1a8f3e");
    // doc.fillColor("#fff").fontSize(11);
    // headers.forEach((h, i) => {
    //   doc.text(h, xs[i] + 4, y + 6, { width: (xs[i + 1] || (doc.page.width - 36)) - xs[i] - 8 });
    // });
    // y += 22;
    // ---- Table layout that fits the page ----
    const contentX = 36;
    const contentW = doc.page.width - 72; // printable width
    const ROW_H = 26; // data row height (was 22)
    const HEADER_H = 30; // header row height (was 22)
    const HEADER_FONT = 10; // slightly smaller so it fits on one line
    const DATA_FONT = 10;

    // label, width, alignment
    const COLS = [
      ["Product ID", 95, "left"],
      ["Product Name", 120, "left"],
      ["Qty On Hand", 80, "left"],
      ["QTY Reserved", 80, "left"],
      ["Avg Cost", 70, "left"],
      ["Expiry", contentW - 435, "left"],
    ];

    const drawHeader = (y) => {
      doc.rect(contentX, y, contentW, HEADER_H).fill("#1a8f3e");
      let x = contentX;
      doc.fillColor("#fff").fontSize(HEADER_FONT);
      COLS.forEach(([label, w]) => {
        doc.text(label, x, y + (HEADER_H - HEADER_FONT) / 2, {
          width: w,
          align: "left",
        });
        x += w;
      });
      return y + HEADER_H;
    };

    let y = drawHeader(doc.y + 6);

    // // Rows
    // products.forEach((p, idx) => {
    //   const low = p.qty_on_hand < LOW_STOCK_THRESHOLD;
    //   const soonExp = p.expire_date && new Date(p.expire_date) <= soon;
    //   const expired = p.expire_date && new Date(p.expire_date) < now;

    //   doc.rect(36, y, doc.page.width - 72, 22).fill(idx % 2 ? "#fff" : "#f9f9f9");

    //   doc.fontSize(10).fillColor("#222");
    //   doc.text(p.pro_id, xs[0] + 4, y + 6, { width: xs[1] - xs[0] - 8 });
    //   doc.text(p.pro_name, xs[1] + 4, y + 6, { width: xs[2] - xs[1] - 8 });

    //   // Qty On Hand (red if < 10000)
    //   doc.fillColor(low ? "#c1121f" : "#222")
    //      .text(String(p.qty_on_hand), xs[2] + 4, y + 6, { width: xs[3] - xs[2] - 8 });

    //   // QTY Reserved
    //   doc.fillColor("#222").text(String(p.qty_reserved), xs[3] + 4, y + 6, { width: xs[4] - xs[3] - 8 });

    //   // Avg Cost
    //   doc.text((p.std_cost ?? 0).toFixed(2), xs[4] + 4, y + 6, { width: xs[5] - xs[4] - 8 });

    //   // Expiry
    //   let expiryText = "-";
    //   if (p.expire_date) {
    //     expiryText = expired ? "Expired" : new Date(p.expire_date).toLocaleDateString();
    //   }
    //   doc.fillColor(soonExp ? "#b26a00" : "#222")
    //      .text(expiryText, xs[5] + 4, y + 6, { width: xs[6] - xs[5] - 8 });

    //   // Note
    //   doc.fillColor("#222").text(p.pro_description || "", xs[6] + 4, y + 6);

    //   y += 22;
    // });

    // ---- Rows (each cell drawn within its width) ----
    products.forEach((p, idx) => {
      const low = p.qty_on_hand < LOW_STOCK_THRESHOLD;
      const soonExp = p.expire_date && new Date(p.expire_date) <= soon;
      const expired = p.expire_date && new Date(p.expire_date) < now;

      // banded row background
      doc
        .rect(contentX, y, contentW, ROW_H)
        .fill(idx % 2 ? "#ffffff" : "#f9f9f9");

      // ✅ define x for this row
      let x = contentX;

      // draw a cell (vertically centered text)
      const cell = (w, text, align = "left", color = "#222") => {
        doc
          .fillColor(color)
          .fontSize(DATA_FONT)
          .text(String(text ?? ""), x + 4, y + (ROW_H - DATA_FONT) / 2, {
            width: w - 8,
            align,
            ellipsis: true,
          });
        x += w;
      };

      // cells
      cell(COLS[0][1], p.pro_id, "left");
      cell(COLS[1][1], p.pro_name, "left");
      cell(COLS[2][1], p.qty_on_hand, "left", low ? "#c1121f" : "#222");
      cell(COLS[3][1], p.qty_reserved, "left");
      cell(COLS[4][1], (p.std_cost ?? 0).toFixed(2), "left");
      const expiryText = p.expire_date
        ? expired
          ? "Expired"
          : new Date(p.expire_date).toLocaleDateString()
        : "-";
      cell(COLS[5][1], expiryText, "left", soonExp ? "#b26a00" : "#222");

      // after finishing a row
      y += ROW_H;

      // page break: redraw header on new page
      if (y > doc.page.height - 72) {
        doc.addPage();
        y = drawHeader(48);
      }
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Error generating PDF" });
  }
};

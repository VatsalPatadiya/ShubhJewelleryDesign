const { ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const { billPdfsDir, customerPendingBillsDir } = require('../utils/paths');
const { SUPPORT_CONTACT } = require('../utils/config');

// ── Font Loading ─────────────────────────────────────────────
const FONT_DIR = path.join(__dirname, '..', 'fonts');

function loadFont(filename) {
  const fontPath = path.join(FONT_DIR, filename);
  if (fs.existsSync(fontPath)) {
    return fs.readFileSync(fontPath);
  }
  return null;
}

const dmSansRegularBytes = loadFont('DMSans-Regular.ttf');
const dmSansBoldBytes = loadFont('DMSans-Bold.ttf');

// ── Currency ─────────────────────────────────────────────────
const PDF_CURRENCY = dmSansRegularBytes ? '₹' : 'Rs.';
function money(amount) {
  const n = Number(amount) || 0;
  const parts = n.toFixed(2).split('.');
  let intPart = parts[0];
  const decPart = parts[1];
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    intPart = grouped + ',' + last3;
  }
  return `${PDF_CURRENCY} ${intPart}.${decPart}`;
}

// ── 12-Hour Date-Time Formatter ──────────────────────────────
function formatDateTime12hr(dateTimeStr) {
  if (!dateTimeStr) return '';
  const cleanIso = dateTimeStr.replace(' ', 'T') + (dateTimeStr.includes('T') ? '' : 'Z');
  const d = new Date(cleanIso);
  if (Number.isNaN(d.getTime())) return dateTimeStr;

  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  let hr = d.getHours();
  const ampm = hr >= 12 ? 'PM' : 'AM';
  hr = hr % 12;
  hr = hr ? hr : 12;
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');

  return `${day} ${month} ${year}, ${hr}:${min}:${sec} ${ampm}`;
}

// ── Dynamic Branding Header Title ────────────────────────────
function getBrandTitle() {
  try {
    const { getDb } = require('../db/database');
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('brand_title');
    return row && row.value ? row.value.trim() : 'SHUBH JEWELLERS';
  } catch (err) {
    return 'SHUBH JEWELLERS';
  }
}

// ── Layout ───────────────────────────────────────────────────
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842; // Standard A4 height
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const RIGHT_EDGE = PAGE_WIDTH - MARGIN;

// ── Colors ───────────────────────────────────────────────────
const C = {
  dark: rgb(0.1, 0.1, 0.18),
  mid: rgb(0.42, 0.45, 0.5),
  light: rgb(0.65, 0.68, 0.72),
  gold: rgb(0.78, 0.59, 0.24),
  goldBg: rgb(0.97, 0.95, 0.90),
  rowAlt: rgb(0.98, 0.97, 0.96),
  line: rgb(0.88, 0.87, 0.84),
  white: rgb(1, 1, 1),
};

// ── Font Embedding ───────────────────────────────────────────
async function embedFonts(pdfDoc) {
  if (dmSansRegularBytes && dmSansBoldBytes) {
    pdfDoc.registerFontkit(fontkit);
    const font = await pdfDoc.embedFont(dmSansRegularBytes);
    const fontBold = await pdfDoc.embedFont(dmSansBoldBytes);
    return { font, fontBold };
  }
  const { StandardFonts } = require('pdf-lib');
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  return { font, fontBold };
}

// ── Helpers ──────────────────────────────────────────────────
function rightAlignText(page, str, opts) {
  const w = opts.font.widthOfTextAtSize(str, opts.size);
  const pad = opts.pad !== undefined ? opts.pad : 8;
  page.drawText(str, { ...opts, x: RIGHT_EDGE - w - pad });
}

function drawAccentTopBar(page, y) {
  page.drawRectangle({ x: 0, y, width: PAGE_WIDTH, height: 4, color: C.gold });
}

function drawDivider(page, y) {
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: RIGHT_EDGE, y },
    thickness: 0.5,
    color: C.line,
  });
}

function drawBrandHeader(page, fontBold, title, topY) {
  drawAccentTopBar(page, topY);
  let y = topY - 24;
  page.drawText(title, { x: MARGIN, y, font: fontBold, size: 18, color: C.gold });
  y -= 12;
  drawDivider(page, y);
  return y - 18;
}

function drawInfoLine(page, label, value, font, fontBold, y, opts = {}) {
  const labelSize = opts.size || 10;
  page.drawText(label, { x: MARGIN, y, font: fontBold, size: labelSize, color: C.mid });
  page.drawText(value, { x: MARGIN + 70, y, font, size: labelSize, color: C.dark });
  return y - (labelSize + 6);
}

// Table column positions
const COL = {
  product: MARGIN + 8,
  mode: 250,
  value: 330,
  price: 410,
};

function drawTableHeader(page, fontBold, y) {
  page.drawRectangle({
    x: MARGIN, y: y - 7, width: CONTENT_WIDTH, height: 20,
    color: C.goldBg,
  });

  const headers = [
    { text: 'PRODUCT', x: COL.product },
    { text: 'MODE', x: COL.mode },
    { text: 'VALUE', x: COL.value },
    { text: 'PRICE', x: COL.price },
  ];
  for (const h of headers) {
    page.drawText(h.text, { x: h.x, y, font: fontBold, size: 8, color: C.mid });
  }

  // Right aligned TOTAL header
  rightAlignText(page, 'TOTAL', { y, font: fontBold, size: 8, color: C.mid });

  drawDivider(page, y - 7);
  return y - 24;
}

function drawTableRows(page, font, fontBold, items, startY) {
  let y = startY;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const hasNote = !!(item.notes && item.notes.trim());
    const rowHeight = hasNote ? 32 : 18;
    const rectY = hasNote ? y - 17 : y - 5;
    if (i % 2 === 1) {
      page.drawRectangle({ x: MARGIN, y: rectY, width: CONTENT_WIDTH, height: rowHeight, color: C.rowAlt });
    }
    page.drawText(item.productName, { x: COL.product, y, font, size: 10, color: C.dark });
    if (hasNote) {
      page.drawText(`Note: ${item.notes.trim()}`, { x: COL.product + 8, y: y - 12, font, size: 8, color: C.mid });
    }
    page.drawText(item.mode === 'GRAM' ? 'Gram' : 'Qty', { x: COL.mode, y, font, size: 10, color: C.mid });
    page.drawText(String(item.value), { x: COL.value, y, font, size: 10, color: C.dark });
    page.drawText(money(item.price), { x: COL.price, y, font, size: 10, color: C.dark });
    rightAlignText(page, money(item.lineTotal ?? item.line_total), { y, font: fontBold, size: 10, color: C.dark });
    y -= rowHeight + 2;
  }
  return y;
}

function drawGrandTotalBox(page, font, fontBold, label, total, y) {
  const BOX_H = 36;
  const boxY = y - BOX_H;

  page.drawRectangle({ x: MARGIN, y: boxY, width: CONTENT_WIDTH, height: BOX_H, color: C.goldBg });
  page.drawRectangle({ x: MARGIN, y: boxY, width: 4, height: BOX_H, color: C.gold });
  page.drawLine({
    start: { x: MARGIN, y: boxY + BOX_H },
    end: { x: RIGHT_EDGE, y: boxY + BOX_H },
    thickness: 1, color: C.gold,
  });
  page.drawLine({
    start: { x: MARGIN, y: boxY },
    end: { x: RIGHT_EDGE, y: boxY },
    thickness: 1, color: C.gold,
  });

  const textY = boxY + (BOX_H / 2) - 5;
  page.drawText(label, { x: MARGIN + 16, y: textY, font, size: 11, color: C.mid });

  const totalStr = money(total);
  const totalW = fontBold.widthOfTextAtSize(totalStr, 15);
  page.drawText(totalStr, {
    x: RIGHT_EDGE - totalW - 8,
    y: textY - 1,
    font: fontBold,
    size: 15,
    color: C.gold,
  });

  return boxY - 20;
}

function drawFooter(page, font, y) {
  drawDivider(page, y);
  y -= 16;
  page.drawText(`For any queries contact: ${SUPPORT_CONTACT}`, {
    x: MARGIN, y, font, size: 9, color: C.light,
  });
  return y;
}

// ══════════════════════════════════════════════════════════════
// Single Bill PDF
// ══════════════════════════════════════════════════════════════
async function generateBillPdf(customer, bill, items) {
  const pdfDoc = await PDFDocument.create();
  const { font, fontBold } = await embedFonts(pdfDoc);

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 10;

  y = drawBrandHeader(page, fontBold, getBrandTitle(), y);
  y -= 4;

  // Title
  page.drawText('BILL DETAIL', { x: MARGIN, y, font: fontBold, size: 14, color: C.dark });
  y -= 22;

  // Customer info
  y = drawInfoLine(page, 'Customer:', customer.name, font, fontBold, y);
  y = drawInfoLine(page, 'WhatsApp:', customer.whatsappNumber || customer.whatsapp_number, font, fontBold, y);
  y = drawInfoLine(page, 'Bill Date:', formatDateTime12hr(bill.billDate || bill.bill_date), font, fontBold, y);
  y -= 16;

  // Items table
  y = drawTableHeader(page, fontBold, y);
  y = drawTableRows(page, font, fontBold, items, y);
  y -= 12;

  // Grand total
  y = drawGrandTotalBox(page, font, fontBold, 'Grand Total:', bill.grandTotal ?? bill.grand_total, y);
  y -= 8;

  if (bill.notes && bill.notes.trim()) {
    page.drawText('Notes:', { x: MARGIN, y, font: fontBold, size: 9, color: C.mid });
    y -= 12;
    const lines = bill.notes.trim().split('\n');
    for (const line of lines) {
      page.drawText(line, { x: MARGIN, y, font, size: 9, color: C.dark });
      y -= 12;
    }
    y -= 4;
  }

  drawFooter(page, font, y);

  const bytes = await pdfDoc.save();
  const outPath = path.join(billPdfsDir(), `bill_${bill.id}.pdf`);
  fs.writeFileSync(outPath, bytes);
  return outPath;
}

// ══════════════════════════════════════════════════════════════
// Pending Bills Statement
// ══════════════════════════════════════════════════════════════
async function buildPendingBillsPdf(customer, unpaidBills) {
  const pdfDoc = await PDFDocument.create();
  const { font, fontBold } = await embedFonts(pdfDoc);

  const previousBills = unpaidBills.slice(0, -1);
  const currentBill = unpaidBills[unpaidBills.length - 1];
  const currentItems = currentBill.items || [];
  const grandTotal = unpaidBills.reduce((sum, b) => sum + Number(b.grandTotal), 0);

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 10;

  // Brand Header
  y = drawBrandHeader(page, fontBold, getBrandTitle(), y);
  y -= 4;

  // Title
  page.drawText('BILL DETAIL', { x: MARGIN, y, font: fontBold, size: 14, color: C.dark });
  y -= 22;

  // Customer info
  y = drawInfoLine(page, 'Customer:', customer.name, font, fontBold, y);
  y = drawInfoLine(page, 'WhatsApp:', customer.whatsappNumber || customer.whatsapp_number, font, fontBold, y);
  y = drawInfoLine(page, 'Bill Date:', formatDateTime12hr(currentBill.billDate), font, fontBold, y);
  y -= 28; // Increased from 16 for better breathing room

  // Previous pending bills (if any)
  if (previousBills.length) {
    page.drawText('PREVIOUS PENDING BILLS', { x: MARGIN, y, font: fontBold, size: 10, color: C.mid });
    y -= 20; // Increased spacing after title

    // Headers
    page.drawText('Bill Date', { x: MARGIN, y, font: fontBold, size: 8, color: C.light });
    rightAlignText(page, 'Pending Amount', { y, font: fontBold, size: 8, color: C.light });
    y -= 22;

    for (let i = 0; i < previousBills.length; i++) {
      const bill = previousBills[i];
      if (i % 2 === 0) {
        page.drawRectangle({
          x: MARGIN, y: y - 5, width: CONTENT_WIDTH, height: 18,
          color: C.rowAlt,
        });
      }
      page.drawText(formatDateTime12hr(bill.billDate), { x: MARGIN + 8, y, font, size: 10, color: C.dark });
      rightAlignText(page, money(bill.grandTotal), { y, font: fontBold, size: 10, color: C.dark });
      y -= 20;
    }
    y -= 8;
    drawDivider(page, y);
    y -= 28; // Increased spacing after divider
  }

  // Current bill header
  page.drawText('CURRENT BILL', { x: MARGIN, y, font: fontBold, size: 11, color: C.dark });
  y -= 26; // Increased from 18 so table header background (drawn at y - 5) doesn't overlap text

  // Table header
  y = drawTableHeader(page, fontBold, y);

  // Table rows
  y = drawTableRows(page, font, fontBold, currentItems, y);
  y -= 12;

  // Grand total box
  const label = previousBills.length > 0 ? 'Grand Total (All Pending):' : 'Grand Total:';
  y = drawGrandTotalBox(page, font, fontBold, label, grandTotal, y);
  y -= 8;

  if (currentBill.notes && currentBill.notes.trim()) {
    page.drawText('Notes:', { x: MARGIN, y, font: fontBold, size: 9, color: C.mid });
    y -= 12;
    const lines = currentBill.notes.trim().split('\n');
    for (const line of lines) {
      page.drawText(line, { x: MARGIN, y, font, size: 9, color: C.dark });
      y -= 12;
    }
    y -= 4;
  }

  // Footer
  drawFooter(page, font, y);

  const bytes = await pdfDoc.save();
  const outPath = path.join(customerPendingBillsDir(customer.name), `PDF_${stampParts()}.pdf`);
  fs.writeFileSync(outPath, bytes);
  return outPath;
}

// Filesystem-safe timestamp
function stampParts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  return `${date}_${time}`;
}

function register() {
  ipcMain.handle('pdf:open', (_event, pdfPath) => {
    if (pdfPath && fs.existsSync(pdfPath)) {
      shell.openPath(pdfPath);
      return { success: true };
    }
    return { success: false, error: 'PDF file not found.' };
  });
}

module.exports = register;
module.exports.generateBillPdf = generateBillPdf;
module.exports.buildPendingBillsPdf = buildPendingBillsPdf;

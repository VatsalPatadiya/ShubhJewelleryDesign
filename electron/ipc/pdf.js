const { ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { billPdfsDir, customerPendingBillsDir } = require('../utils/paths');
const { SUPPORT_CONTACT } = require('../utils/config');

// pdf-lib's standard 14 fonts only support WinAnsiEncoding, which has no glyph
// for ₹ (U+20B9) — embedding a custom Unicode font just for one symbol isn't
// worth the bundle size, so PDFs render "Rs." while the on-screen UI keeps ₹.
const PDF_CURRENCY = 'Rs.';
function money(amount) {
  return `${PDF_CURRENCY} ${Number(amount).toFixed(2)}`;
}

const PAGE_WIDTH = 595; // A4 width in points
const MARGIN = 40;

function drawHeader(page, font, boldSize, lines, startY) {
  let y = startY;
  for (const line of lines) {
    page.drawText(line.text, { x: MARGIN, y, font, size: line.size || 12, color: rgb(0.14, 0.15, 0.17) });
    y -= line.size ? line.size + 8 : 20;
  }
  return y;
}

function drawItemsTable(page, font, fontBold, items, startY) {
  const colX = { product: MARGIN, mode: 260, value: 340, price: 410, total: 490 };
  let y = startY;

  page.drawText('Product', { x: colX.product, y, font: fontBold, size: 11 });
  page.drawText('Mode', { x: colX.mode, y, font: fontBold, size: 11 });
  page.drawText('Value', { x: colX.value, y, font: fontBold, size: 11 });
  page.drawText('Price', { x: colX.price, y, font: fontBold, size: 11 });
  page.drawText('Line Total', { x: colX.total, y, font: fontBold, size: 11 });
  y -= 6;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 18;

  for (const item of items) {
    page.drawText(item.productName, { x: colX.product, y, font, size: 10 });
    page.drawText(item.mode === 'GRAM' ? 'Gram' : 'Qty', { x: colX.mode, y, font, size: 10 });
    page.drawText(String(item.value), { x: colX.value, y, font, size: 10 });
    page.drawText(money(item.price), { x: colX.price, y, font, size: 10 });
    page.drawText(money(item.lineTotal), { x: colX.total, y, font, size: 10 });
    y -= 20;
  }

  return y;
}

async function drawFullBillDetail(pdfDoc, font, fontBold, customer, bill, items) {
  const page = pdfDoc.addPage([PAGE_WIDTH, 750]);
  let y = 700;

  y = drawHeader(page, fontBold, 16, [{ text: 'Bill Detail', size: 16 }], y);
  y = drawHeader(page, font, 12, [
    { text: `Customer: ${customer.name}` },
    { text: `WhatsApp: ${customer.whatsappNumber || customer.whatsapp_number}` },
    { text: `Bill Date: ${bill.billDate || bill.bill_date}` },
    { text: `Bill ID: ${bill.id}` },
  ], y);
  y -= 10;

  y = drawItemsTable(page, font, fontBold, items, y);

  y -= 10;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 24;
  page.drawText(`Grand Total: ${money(bill.grandTotal ?? bill.grand_total)}`, {
    x: MARGIN,
    y,
    font: fontBold,
    size: 13,
  });

  return page;
}

async function generateBillPdf(customer, bill, items) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  await drawFullBillDetail(pdfDoc, font, fontBold, customer, bill, items);

  const bytes = await pdfDoc.save();
  const outPath = path.join(billPdfsDir(), `bill_${bill.id}.pdf`);
  fs.writeFileSync(outPath, bytes);
  return outPath;
}

// Single-page pending-bills statement: header (same style as the per-bill
// PDF), then any older pending bills as a short history list, then the
// current bill's full line-item detail, then the grand total and footer.
// Drawing is recorded as ops with a running offset first, so the page height
// can be sized exactly to the content instead of guessed/fixed up front.
async function buildPendingBillsPdf(customer, unpaidBills) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const previousBills = unpaidBills.slice(0, -1);
  const currentBill = unpaidBills[unpaidBills.length - 1];
  const currentItems = currentBill.items || [];
  const grandTotal = unpaidBills.reduce((sum, b) => sum + Number(b.grandTotal), 0);

  const MARGIN_TOP = 40;
  const MARGIN_BOTTOM = 36;

  let offset = 0;
  const ops = [];
  function text(str, opts) {
    ops.push({ type: 'text', str, offset, ...opts });
  }
  function divider() {
    ops.push({ type: 'line', offset });
  }
  function advance(h) {
    offset += h;
  }

  text('Bill Detail', { x: MARGIN, font: fontBold, size: 16 });
  advance(24);
  text(`Customer: ${customer.name}`, { x: MARGIN, font, size: 12 });
  advance(20);
  text(`WhatsApp: ${customer.whatsappNumber || customer.whatsapp_number}`, { x: MARGIN, font, size: 12 });
  advance(20);
  text(`Bill Date: ${currentBill.billDate}`, { x: MARGIN, font, size: 12 });
  advance(20);
  text(`Bill ID: ${currentBill.id}`, { x: MARGIN, font, size: 12 });
  advance(20);
  advance(16);

  if (previousBills.length) {
    text('Previous Pending Bills', { x: MARGIN, font: fontBold, size: 12 });
    advance(20);
    for (const bill of previousBills) {
      text(`Bill Date: ${bill.billDate}`, { x: MARGIN, font, size: 10 });
      text(`Pending Amount: ${money(bill.grandTotal)}`, { x: 300, font, size: 10 });
      advance(20);
    }
    advance(10);
    divider();
    advance(16);
  }

  text('Current Bill', { x: MARGIN, font: fontBold, size: 12 });
  advance(20);

  const colX = { product: MARGIN, mode: 260, value: 340, price: 410, total: 490 };
  text('Product', { x: colX.product, font: fontBold, size: 11 });
  text('Mode', { x: colX.mode, font: fontBold, size: 11 });
  text('Value', { x: colX.value, font: fontBold, size: 11 });
  text('Price', { x: colX.price, font: fontBold, size: 11 });
  text('Line Total', { x: colX.total, font: fontBold, size: 11 });
  advance(6);
  divider();
  advance(18);

  for (const item of currentItems) {
    text(item.productName, { x: colX.product, font, size: 10 });
    text(item.mode === 'GRAM' ? 'Gram' : 'Qty', { x: colX.mode, font, size: 10 });
    text(String(item.value), { x: colX.value, font, size: 10 });
    text(money(item.price), { x: colX.price, font, size: 10 });
    text(money(item.lineTotal), { x: colX.total, font, size: 10 });
    advance(20);
  }

  advance(10);
  divider();
  advance(24);
  text(`Grand Total (All Pending Bills): ${money(grandTotal)}`, { x: MARGIN, font: fontBold, size: 14 });
  advance(34);
  text(`For any queries contact : ${SUPPORT_CONTACT}`, {
    x: MARGIN,
    font,
    size: 10,
    color: rgb(0.6, 0.6, 0.6),
  });
  advance(16);

  const pageHeight = MARGIN_TOP + offset + MARGIN_BOTTOM;
  const page = pdfDoc.addPage([PAGE_WIDTH, pageHeight]);

  for (const op of ops) {
    const y = pageHeight - MARGIN_TOP - op.offset;
    if (op.type === 'text') {
      page.drawText(op.str, {
        x: op.x,
        y,
        font: op.font,
        size: op.size,
        color: op.color || rgb(0.14, 0.15, 0.17),
      });
    } else if (op.type === 'line') {
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: PAGE_WIDTH - MARGIN, y },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });
    }
  }

  const bytes = await pdfDoc.save();
  const outPath = path.join(customerPendingBillsDir(customer.name), `PDF_${stampParts()}.pdf`);
  fs.writeFileSync(outPath, bytes);
  return outPath;
}

// Filesystem-safe "CurrentDate_CurrentTime" stamp, e.g. 2026-07-12_00-48-00.
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

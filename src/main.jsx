import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { initCryptoKey, encrypt, decrypt } from './crypto.js';
import { PDFDocument, rgb } from 'pdf-lib';
import './styles/tokens.css';
import './styles/global.css';

// ── Encrypted localStorage helpers ──────────────────────────

/**
 * Read an encrypted value from localStorage, decrypt it, and JSON.parse.
 * Returns fallback if the key is missing or decryption fails.
 */
async function getEncryptedItem(storageKey, fallback) {
  const raw = localStorage.getItem(storageKey);
  if (raw === null || raw === '') return fallback;

  try {
    const decrypted = await decrypt(raw);
    return JSON.parse(decrypted);
  } catch {
    // Possibly legacy unencrypted data — try plain parse
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
}

/**
 * JSON.stringify a value, encrypt it, and store in localStorage.
 */
async function setEncryptedItem(storageKey, value) {
  const json = JSON.stringify(value);
  const encrypted = await encrypt(json);
  localStorage.setItem(storageKey, encrypted);
}

/**
 * Read an encrypted string value (not JSON-wrapped).
 */
async function getEncryptedString(storageKey) {
  const raw = localStorage.getItem(storageKey);
  if (raw === null || raw === '') return null;

  try {
    return await decrypt(raw);
  } catch {
    // Possibly legacy unencrypted string — return as-is
    return raw;
  }
}

/**
 * Encrypt a plain string and store it.
 */
async function setEncryptedString(storageKey, value) {
  const encrypted = await encrypt(String(value));
  localStorage.setItem(storageKey, encrypted);
}

// ── Migrate legacy unencrypted data ─────────────────────────

async function migrateLegacyData() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    keys.push(localStorage.key(i));
  }

  for (const key of keys) {
    if (!key.startsWith('mock_db_') && !key.startsWith('mock_setting_')) continue;

    const raw = localStorage.getItem(key);
    if (raw === null || raw === '') continue;

    // Try to detect if data is already encrypted (Base64 that fails JSON.parse)
    let isPlainJson = false;
    try {
      JSON.parse(raw);
      isPlainJson = true;
    } catch {
      // Not valid JSON — either already encrypted or corrupted
      // Try to decrypt it to verify
      try {
        await decrypt(raw);
        // Successfully decrypted — already migrated
        continue;
      } catch {
        // Neither valid JSON nor valid encrypted data — skip
        continue;
      }
    }

    if (isPlainJson) {
      // Legacy unencrypted data — re-encrypt it
      const encrypted = await encrypt(raw);
      localStorage.setItem(key, encrypted);
    }
  }

  // Also migrate the sidebar-collapsed preference
  const collapseRaw = localStorage.getItem('sidebar-collapsed');
  if (collapseRaw === '0' || collapseRaw === '1') {
    const encrypted = await encrypt(collapseRaw);
    localStorage.setItem('sidebar-collapsed', encrypted);
  }
}

// ── Build mock API with encrypted storage ───────────────────

function buildMockApi() {
  const getMockData = (key) => getEncryptedItem(`mock_db_${key}`, []);
  const setMockData = (key, data) => setEncryptedItem(`mock_db_${key}`, data);

  window.api = {
    settings: {
      get: async (key) => {
        const val = await getEncryptedString(`mock_setting_${key}`);
        if (val !== null) return val;
        if (key === 'brand_title') return 'SHUBH JEWELLERS';
        return null;
      },
      set: async (key, val) => {
        await setEncryptedString(`mock_setting_${key}`, val);
        return { success: true };
      },
    },
    customers: {
      list: async () => {
        const customers = await getMockData('customers');
        const bills = await getMockData('bills');
        const decorated = customers.map((c) => {
          const unpaid = bills.filter(
            (b) => b.customerId === c.id && !b.isDeleted && b.status === 'UNPAID'
          );
          return {
            ...c,
            pendingBills: unpaid.length,
            pendingAmount: unpaid.reduce((sum, b) => sum + ((b.grandTotal || 0) - (b.paidAmount || 0)), 0),
          };
        });
        return decorated;
      },
      add: async (customer) => {
        const list = await getMockData('customers');
        const newCustomer = {
          id: Date.now(),
          name: customer.name,
          whatsappNumber: customer.whatsappNumber,
          created_at: new Date().toISOString(),
        };
        list.push(newCustomer);
        await setMockData('customers', list);
        return { success: true, id: newCustomer.id };
      },
      remove: async (id) => {
        const list = await getMockData('customers');
        const filtered = list.filter((c) => c.id !== id);
        await setMockData('customers', filtered);
        return { success: true };
      },
    },
    products: {
      listMaster: async () => getMockData('products'),
      addMaster: async (name) => {
        const list = await getMockData('products');
        if (list.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
          return { success: false, error: 'Product already exists.' };
        }
        const newProduct = { id: Date.now(), name };
        list.push(newProduct);
        await setMockData('products', list);
        return { success: true, product: newProduct };
      },
    },
    bills: {
      list: async (filter) => {
        let list = (await getMockData('bills')).filter((b) => !b.isDeleted);
        if (filter && filter.customerId) {
          list = list.filter((b) => b.customerId === Number(filter.customerId));
        }
        return list;
      },
      get: async (id) => {
        const list = await getMockData('bills');
        const bill = list.find((b) => b.id === Number(id));
        return bill || null;
      },
      save: async (billData) => {
        const list = await getMockData('bills');
        const customers = await getMockData('customers');
        const cust = customers.find((c) => c.id === Number(billData.customerId));
        const customerName = cust ? cust.name : 'Unknown';

        const grandTotal = (billData.items || []).reduce(
          (sum, item) => sum + Number(item.value || 0) * Number(item.price || 0),
          0
        );

        let savedBill;
        if (billData.id) {
          const idx = list.findIndex((b) => b.id === Number(billData.id));
          if (idx !== -1) {
            let newPaidAmount = list[idx].paidAmount || 0.0;
            if (list[idx].status === 'PAID') {
              newPaidAmount = grandTotal;
            } else if (newPaidAmount > grandTotal) {
              newPaidAmount = grandTotal;
            }
            const status = newPaidAmount === grandTotal ? 'PAID' : 'UNPAID';

            list[idx] = {
              ...list[idx],
              customerId: Number(billData.customerId),
              customerName: customerName,
              billDate: billData.billDate || new Date().toISOString(),
              grandTotal: grandTotal,
              paidAmount: newPaidAmount,
              status: status,
              notes: billData.notes,
              items: billData.items || [],
            };
            savedBill = list[idx];
          }
        } else {
          const paidAmount = billData.status === 'PAID' ? grandTotal : 0.0;
          savedBill = {
            id: Date.now(),
            customerId: Number(billData.customerId),
            customerName: customerName,
            billDate: billData.billDate || new Date().toISOString(),
            grandTotal: grandTotal,
            paidAmount: paidAmount,
            status: billData.status || 'UNPAID',
            notes: billData.notes,
            isDeleted: false,
            items: billData.items || [],
            settlements: paidAmount > 0 ? [{
              id: Date.now(),
              amount: paidAmount,
              paymentDate: new Date().toISOString()
            }] : [],
            created_at: new Date().toISOString(),
          };
          list.push(savedBill);
        }
        await setMockData('bills', list);
        return { success: true, grandTotal: savedBill.grandTotal };
      },
      delete: async (id) => {
        const list = await getMockData('bills');
        const idx = list.findIndex((b) => b.id === Number(id));
        if (idx !== -1) {
          list[idx].isDeleted = true;
          await setMockData('bills', list);
        }
        return { success: true };
      },
      updateStatus: async (id, status) => {
        const list = await getMockData('bills');
        const idx = list.findIndex((b) => b.id === Number(id));
        if (idx !== -1) {
          list[idx].status = status;
          if (status === 'PAID') {
            const remaining = list[idx].grandTotal - (list[idx].paidAmount || 0);
            list[idx].paidAmount = list[idx].grandTotal;
            list[idx].settlements = list[idx].settlements || [];
            if (remaining > 0) {
              list[idx].settlements.push({
                id: Date.now(),
                amount: remaining,
                paymentMethod: 'CASH',
                chequeNumber: null,
                notes: null,
                paymentDate: new Date().toISOString()
              });
            }
          } else {
            list[idx].paidAmount = 0.0;
            list[idx].settlements = [];
          }
          await setMockData('bills', list);
        }
        return { success: true };
      },
      updatePaidAmount: async (id, paidAmount, paymentMethod, chequeNumber, notes) => {
        const list = await getMockData('bills');
        const idx = list.findIndex((b) => b.id === Number(id));
        if (idx !== -1) {
          const grandTotal = list[idx].grandTotal;
          const currentPaid = list[idx].paidAmount || 0.0;
          const paymentAmount = Number(paidAmount || 0);
          if (paymentAmount < 0) return { success: false, error: 'Payment amount cannot be negative.' };
          const newPaidAmount = currentPaid + paymentAmount;
          if (newPaidAmount > grandTotal) return { success: false, error: 'Total paid amount cannot exceed grand total.' };
          const status = newPaidAmount === grandTotal ? 'PAID' : 'UNPAID';
          list[idx].paidAmount = newPaidAmount;
          list[idx].status = status;
          list[idx].settlements = list[idx].settlements || [];
          list[idx].settlements.push({
            id: Date.now(),
            amount: paymentAmount,
            paymentMethod: paymentMethod || 'CASH',
            chequeNumber: chequeNumber || null,
            notes: notes || null,
            paymentDate: new Date().toISOString()
          });
          await setMockData('bills', list);
          return { success: true, status };
        }
        return { success: false, error: 'Bill not found' };
      },
      updateSettlement: async (settlementId, amount, paymentMethod, chequeNumber, notes) => {
        const list = await getMockData('bills');
        let foundBillIdx = -1;
        let foundSettlementIdx = -1;
        for (let i = 0; i < list.length; i++) {
          const settlements = list[i].settlements || [];
          const sIdx = settlements.findIndex((s) => s.id === Number(settlementId));
          if (sIdx !== -1) {
            foundBillIdx = i;
            foundSettlementIdx = sIdx;
            break;
          }
        }
        if (foundBillIdx === -1) return { success: false, error: 'Settlement not found.' };
        const bill = list[foundBillIdx];
        const settlement = bill.settlements[foundSettlementIdx];
        const newAmount = Number(amount || 0);
        if (newAmount < 0) return { success: false, error: 'Amount cannot be negative.' };
        const otherPaymentsSum = (bill.paidAmount || 0) - settlement.amount;
        const newPaidAmount = otherPaymentsSum + newAmount;
        if (newPaidAmount > bill.grandTotal) return { success: false, error: 'Total paid amount cannot exceed grand total.' };
        const status = newPaidAmount === bill.grandTotal ? 'PAID' : 'UNPAID';
        
        bill.settlements[foundSettlementIdx].amount = newAmount;
        bill.settlements[foundSettlementIdx].paymentMethod = paymentMethod || 'CASH';
        bill.settlements[foundSettlementIdx].chequeNumber = chequeNumber || null;
        bill.settlements[foundSettlementIdx].notes = notes || null;
        bill.paidAmount = newPaidAmount;
        bill.status = status;
        await setMockData('bills', list);
        return { success: true };
      },
      deleteSettlement: async (settlementId) => {
        const list = await getMockData('bills');
        let foundBillIdx = -1;
        let foundSettlementIdx = -1;
        for (let i = 0; i < list.length; i++) {
          const settlements = list[i].settlements || [];
          const sIdx = settlements.findIndex((s) => s.id === Number(settlementId));
          if (sIdx !== -1) {
            foundBillIdx = i;
            foundSettlementIdx = sIdx;
            break;
          }
        }
        if (foundBillIdx === -1) return { success: false, error: 'Settlement not found.' };
        const bill = list[foundBillIdx];
        const settlement = bill.settlements[foundSettlementIdx];
        const newPaidAmount = Math.max(0, (bill.paidAmount || 0) - settlement.amount);
        
        bill.settlements.splice(foundSettlementIdx, 1);
        bill.paidAmount = newPaidAmount;
        bill.status = 'UNPAID';
        await setMockData('bills', list);
        return { success: true };
      },
    },
    pdf: {
      open: () => Promise.resolve({ success: true }),
    },
    backup: {
      run: () => Promise.resolve({ success: true, filePath: '' }),
      restore: () => Promise.resolve({ success: true }),
      showInFolder: () => {},
    },
    whatsapp: {
      sendPendingBills: async (customerId) => {
        const customers = await getMockData('customers');
        const customer = customers.find(c => c.id === Number(customerId));
        const bills = (await getMockData('bills')).filter(b => b.customerId === Number(customerId) && b.status === 'UNPAID' && !b.isDeleted);
        
        const customerName = customer ? customer.name : 'Customer';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `PendingBills_${customerName.replace(/\s+/g, '_')}_${timestamp}.pdf`;
        
        // Generate a real styled PDF document matching Electron styling!
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont('Helvetica');
        const fontBold = await pdfDoc.embedFont('Helvetica-Bold');
        
        const PAGE_WIDTH = 595;
        const PAGE_HEIGHT = 842;
        const MARGIN = 40;
        const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
        const RIGHT_EDGE = PAGE_WIDTH - MARGIN;
        
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

        const money = (amount) => {
          const num = Number(amount || 0);
          const parts = num.toFixed(2).split('.');
          const decPart = parts[1];
          let intPart = parts[0];
          const sign = intPart.startsWith('-') ? '-' : '';
          if (sign) intPart = intPart.substring(1);
          let lastThree = intPart.substring(intPart.length - 3);
          const otherParts = intPart.substring(0, intPart.length - 3);
          if (otherParts !== '') {
            lastThree = ',' + lastThree;
          }
          const formattedInt = otherParts.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
          return `${sign}Rs. ${formattedInt}.${decPart}`;
        };

        const rightAlignText = (page, str, opts) => {
          const w = opts.font.widthOfTextAtSize(str, opts.size);
          const pad = opts.pad !== undefined ? opts.pad : 8;
          page.drawText(str, { ...opts, x: RIGHT_EDGE - w - pad });
        };

        const drawAccentTopBar = (page, y) => {
          page.drawRectangle({ x: 0, y, width: PAGE_WIDTH, height: 4, color: C.gold });
        };

        const drawDivider = (page, y) => {
          page.drawLine({
            start: { x: MARGIN, y },
            end: { x: RIGHT_EDGE, y },
            thickness: 0.5,
            color: C.line,
          });
        };

        const drawBrandHeader = (page, title, topY) => {
          drawAccentTopBar(page, topY);
          let y = topY - 24;
          page.drawText(title, { x: MARGIN, y, font: fontBold, size: 18, color: C.gold });
          y -= 12;
          drawDivider(page, y);
          return y - 18;
        };

        const drawInfoLine = (page, label, val, y, opts = {}) => {
          const labelSize = opts.size || 10;
          page.drawText(label, { x: MARGIN, y, font: fontBold, size: labelSize, color: C.mid });
          page.drawText(val, { x: MARGIN + 70, y, font, size: labelSize, color: C.dark });
          return y - (labelSize + 6);
        };
        
        const COL = {
          product: MARGIN + 8,
          mode: 250,
          value: 330,
          price: 410,
        };

        const drawTableHeader = (page, y) => {
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
          rightAlignText(page, 'TOTAL', { y, font: fontBold, size: 8, color: C.mid });
          drawDivider(page, y - 7);
          return y - 24;
        };

        const drawTableRows = (page, items, startY) => {
          let y = startY;
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const hasNote = item.notes && item.notes.trim();
            const rowHeight = hasNote ? 28 : 18;
            const rectY = y - 5 - (hasNote ? 10 : 0);
            if (i % 2 === 1) {
              page.drawRectangle({ x: MARGIN, y: rectY, width: CONTENT_WIDTH, height: rowHeight, color: C.rowAlt });
            }
            page.drawText(item.productName || item.product_name, { x: COL.product, y, font, size: 10, color: C.dark });
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
        };

        const drawGrandTotalBox = (page, label, total, y) => {
          const BOX_H = 36;
          const boxY = y - BOX_H;
          page.drawRectangle({ x: MARGIN, y: boxY, width: CONTENT_WIDTH, height: BOX_H, color: C.goldBg });
          page.drawRectangle({ x: MARGIN, y: boxY, width: 4, height: BOX_H, color: C.gold });
          page.drawLine({ start: { x: MARGIN, y: boxY + BOX_H }, end: { x: RIGHT_EDGE, y: boxY + BOX_H }, thickness: 1, color: C.gold });
          page.drawLine({ start: { x: MARGIN, y: boxY }, end: { x: RIGHT_EDGE, y: boxY }, thickness: 1, color: C.gold });
          const textY = boxY + (BOX_H / 2) - 5;
          page.drawText(label, { x: MARGIN + 16, y: textY, font, size: 11, color: C.mid });
          const totalStr = money(total);
          const totalW = fontBold.widthOfTextAtSize(totalStr, 15);
          page.drawText(totalStr, { x: RIGHT_EDGE - totalW - 8, y: textY - 1, font: fontBold, size: 15, color: C.gold });
          return boxY - 20;
        };

        const drawFooter = (page, y) => {
          drawDivider(page, y);
          y -= 16;
          page.drawText(`For any queries contact: +91 96647 57450`, { x: MARGIN, y, font, size: 9, color: C.light });
          return y;
        };

        const formatDateTime12hr = (dateTimeStr) => {
          if (!dateTimeStr) return '';
          const d = new Date(dateTimeStr);
          if (isNaN(d.getTime())) return dateTimeStr;
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
        };

        const previousBills = bills.slice(0, -1);
        const currentBill = bills[bills.length - 1];
        const currentItems = currentBill ? (currentBill.items || []) : [];
        const grandTotal = bills.reduce((sum, b) => sum + (Number(b.grandTotal) - Number(b.paidAmount || 0)), 0);

        const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        let y = PAGE_HEIGHT - 10;

        // Brand Header
        y = drawBrandHeader(page, 'SHUBH JEWELLERS', y);
        y -= 4;

        // Title
        page.drawText('BILL DETAIL', { x: MARGIN, y, font: fontBold, size: 14, color: C.dark });
        y -= 22;

        // Customer info
        y = drawInfoLine(page, 'Customer:', customerName, y);
        y = drawInfoLine(page, 'WhatsApp:', customer ? customer.whatsappNumber : 'N/A', y);
        y = drawInfoLine(page, 'Bill Date:', currentBill ? formatDateTime12hr(currentBill.billDate) : 'N/A', y);
        y -= 28;

        // Previous pending bills (if any)
        if (previousBills.length) {
          page.drawText('PREVIOUS PENDING BILLS', { x: MARGIN, y, font: fontBold, size: 10, color: C.mid });
          y -= 20;

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
            const pendingVal = Number(bill.grandTotal) - Number(bill.paidAmount || 0);
            rightAlignText(page, money(pendingVal), { y, font: fontBold, size: 10, color: C.dark });
            y -= 20;
          }
          y -= 8;
          drawDivider(page, y);
          y -= 28;
        }

        if (currentBill) {
          // Current bill header
          page.drawText('CURRENT BILL', { x: MARGIN, y, font: fontBold, size: 11, color: C.dark });
          y -= 26;

          // Table header
          y = drawTableHeader(page, y);

          // Table rows
          y = drawTableRows(page, currentItems, y);
          y -= 12;
        }

        // Grand total box
        const label = previousBills.length > 0 ? 'Grand Total (All Pending):' : 'Grand Total:';
        y = drawGrandTotalBox(page, label, grandTotal, y);
        y -= 8;

        if (currentBill && currentBill.notes && currentBill.notes.trim()) {
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
        drawFooter(page, y);

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return {
          success: true,
          note: `WhatsApp Web Mock opened. The statement file (${filename}) has been downloaded to your Downloads folder.`,
          pdfPath: `Downloads/BillingSoftware/${customerName.replace(/\s+/g, '_')}/${filename}`,
        };
      },
    },
    expenses: {
      list: async (filter) => {
        const expenses = await getMockData('expenses');
        const employees = await getMockData('employees');
        let filtered = expenses.map((e) => {
          const emp = employees.find((x) => x.id === Number(e.employeeId));
          return { ...e, employeeName: emp ? emp.name : '' };
        });

        if (filter && filter.year) {
          if (filter.month) {
            const paddedMonth = String(filter.month).padStart(2, '0');
            const prefix = `${filter.year}-${paddedMonth}-`;
            filtered = filtered.filter((e) => e.date && e.date.startsWith(prefix));
          } else {
            const prefix = `${filter.year}-`;
            filtered = filtered.filter((e) => e.date && e.date.startsWith(prefix));
          }
        }

        filtered.sort((a, b) => {
          const dateDiff = new Date(b.date) - new Date(a.date);
          if (dateDiff !== 0) return dateDiff;
          return b.id - a.id;
        });

        return filtered;
      },
      add: async (expense) => {
        const list = await getMockData('expenses');
        const newExpense = {
          id: Date.now(),
          description: expense.description,
          amount: Number(expense.amount),
          type: expense.type,
          isSalary: expense.isSalary ? 1 : 0,
          employeeId: expense.isSalary ? Number(expense.employeeId) : null,
          date: expense.date,
          created_at: new Date().toISOString(),
        };
        list.push(newExpense);
        await setMockData('expenses', list);
        return { success: true };
      },
      delete: async (id) => {
        const list = await getMockData('expenses');
        const filtered = list.filter((e) => e.id !== id);
        await setMockData('expenses', filtered);
        return { success: true };
      },
      update: async (payload) => {
        const list = await getMockData('expenses');
        const idx = list.findIndex((e) => e.id === payload.id);
        if (idx === -1) return { success: false, error: 'Not found' };
        list[idx] = {
          ...list[idx],
          description: payload.description,
          amount: Number(payload.amount),
          type: payload.type,
          isSalary: payload.isSalary ? 1 : 0,
          employeeId: payload.isSalary ? Number(payload.employeeId) : null,
          date: payload.date,
        };
        await setMockData('expenses', list);
        return { success: true };
      },
    },
    employees: {
      list: async () => {
        const list = await getMockData('employees');
        list.sort((a, b) => a.name.localeCompare(b.name));
        return list;
      },
      add: async (name) => {
        const list = await getMockData('employees');
        if (list.some((emp) => emp.name.toLowerCase() === name.trim().toLowerCase())) {
          return { success: false, error: 'An employee with this name already exists.' };
        }
        const newEmployee = {
          id: Date.now(),
          name: name.trim(),
          created_at: new Date().toISOString(),
        };
        list.push(newEmployee);
        await setMockData('employees', list);
        return { success: true };
      },
    },
  };
}

// ── Bootstrap: init crypto → migrate → build API → render ───

async function bootstrap() {
  await initCryptoKey();

  if (typeof window !== 'undefined' && !window.api) {
    await migrateLegacyData();
    buildMockApi();
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ToastProvider>
        <App />
      </ToastProvider>
    </StrictMode>
  );
}

bootstrap();

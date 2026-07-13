const { ipcMain } = require('electron');
const { getDb } = require('../db/database');
const { isPositiveNumber } = require('../utils/validate');
const { generateBillPdf } = require('./pdf');

const LIST_QUERY_BASE = `
  SELECT b.id, b.customer_id AS customerId, c.name AS customerName, c.whatsapp_number AS whatsappNumber,
         b.bill_date AS billDate, b.status, b.grand_total AS grandTotal, b.pdf_path AS pdfPath, b.notes
  FROM bills b
  JOIN customers c ON c.id = b.customer_id
`;

function register() {
  ipcMain.handle('bills:save', async (_event, payload) => {
    const db = getDb();
    const { id: billIdToEdit, customerId, items } = payload || {};

    if (!customerId) {
      return { success: false, error: 'Please select a customer.' };
    }
    if (!Array.isArray(items) || items.length === 0) {
      return { success: false, error: 'Add at least one product row.' };
    }
    for (const item of items) {
      if (!item.productName || !item.productName.trim()) {
        return { success: false, error: 'Every row needs a product.' };
      }
      if (!['GRAM', 'QUANTITY'].includes(item.mode)) {
        return { success: false, error: 'Invalid mode on a product row.' };
      }
      if (!isPositiveNumber(item.value) || !isPositiveNumber(item.price)) {
        return { success: false, error: 'Value and price must be greater than 0 on every row.' };
      }
    }

    const customer = db.prepare('SELECT id, name, whatsapp_number AS whatsappNumber FROM customers WHERE id = ?').get(customerId);
    if (!customer) {
      return { success: false, error: 'Customer not found.' };
    }

    const grandTotal = items.reduce((sum, item) => sum + Number(item.value) * Number(item.price), 0);

    const insertBill = db.prepare(
      "INSERT INTO bills (customer_id, grand_total, status, notes) VALUES (?, ?, 'UNPAID', ?)"
    );
    const insertItem = db.prepare(
      'INSERT INTO bill_items (bill_id, product_name, mode, value, price, line_total, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const updatePdfPath = db.prepare('UPDATE bills SET pdf_path = ? WHERE id = ?');

    let billId = billIdToEdit;

    db.transaction(() => {
      if (billIdToEdit) {
        db.prepare('UPDATE bills SET customer_id = ?, grand_total = ?, notes = ? WHERE id = ?')
          .run(customerId, grandTotal, payload.notes || '', billIdToEdit);
        db.prepare('DELETE FROM bill_items WHERE bill_id = ?').run(billIdToEdit);
        for (const item of items) {
          const lineTotal = Number(item.value) * Number(item.price);
          insertItem.run(billIdToEdit, item.productName.trim(), item.mode, Number(item.value), Number(item.price), lineTotal, item.notes || '');
        }
      } else {
        const info = insertBill.run(customerId, grandTotal, payload.notes || '');
        billId = info.lastInsertRowid;
        for (const item of items) {
          const lineTotal = Number(item.value) * Number(item.price);
          insertItem.run(billId, item.productName.trim(), item.mode, Number(item.value), Number(item.price), lineTotal, item.notes || '');
        }
      }
    })();

    const bill = db.prepare(
      "SELECT id, bill_date AS billDate, grand_total AS grandTotal, notes FROM bills WHERE id = ?"
    ).get(billId);
    const savedItems = db.prepare(
      'SELECT product_name AS productName, mode, value, price, line_total AS lineTotal, notes FROM bill_items WHERE bill_id = ?'
    ).all(billId);

    let pdfPath = null;
    try {
      pdfPath = await generateBillPdf(customer, bill, savedItems);
      updatePdfPath.run(pdfPath, billId);
    } catch (err) {
      console.error('Failed to generate/update bill PDF', err);
    }

    return { success: true, id: billId, grandTotal, pdfPath };
  });

  ipcMain.handle('bills:list', (_event, filter) => {
    const db = getDb();
    const clauses = ['b.is_deleted = 0'];
    const params = {};

    if (filter && filter.customerId) {
      clauses.push('b.customer_id = @customerId');
      params.customerId = Number(filter.customerId);
    }
    if (filter && filter.status && filter.status !== 'ALL') {
      clauses.push('b.status = @status');
      params.status = filter.status;
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const query = `${LIST_QUERY_BASE} ${where} ORDER BY b.bill_date DESC`;
    return db.prepare(query).all(params);
  });

  ipcMain.handle('bills:updateStatus', (_event, { billId, status }) => {
    if (!['UNPAID', 'PAID'].includes(status)) {
      return { success: false, error: 'Invalid status.' };
    }
    const db = getDb();
    db.prepare('UPDATE bills SET status = ? WHERE id = ?').run(status, billId);
    return { success: true };
  });

  ipcMain.handle('bills:get', (_event, billId) => {
    const db = getDb();
    const bill = db.prepare('SELECT id, customer_id AS customerId, bill_date AS billDate, grand_total AS grandTotal, status, notes FROM bills WHERE id = ? AND is_deleted = 0').get(billId);
    if (!bill) return null;
    const items = db.prepare('SELECT id, product_name AS productName, mode, value, price, line_total AS lineTotal, notes FROM bill_items WHERE bill_id = ?').all(billId);
    return { ...bill, items };
  });

  ipcMain.handle('bills:delete', (_event, billId) => {
    const db = getDb();
    db.prepare('UPDATE bills SET is_deleted = 1 WHERE id = ?').run(billId);
    return { success: true };
  });
}

module.exports = register;

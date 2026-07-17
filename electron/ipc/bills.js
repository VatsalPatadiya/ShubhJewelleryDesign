const { ipcMain } = require('electron');
const { getDb } = require('../db/database');
const { isPositiveNumber } = require('../utils/validate');
const { generateBillPdf } = require('./pdf');

const LIST_QUERY_BASE = `
  SELECT b.id, b.customer_id AS customerId, c.name AS customerName, c.whatsapp_number AS whatsappNumber,
         b.bill_date AS billDate, b.status, b.grand_total AS grandTotal, b.paid_amount AS paidAmount, b.pdf_path AS pdfPath, b.notes
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
        const oldBill = db.prepare('SELECT status, paid_amount FROM bills WHERE id = ?').get(billIdToEdit);
        let newPaidAmount = oldBill ? oldBill.paid_amount : 0.0;
        if (oldBill && oldBill.status === 'PAID') {
          newPaidAmount = grandTotal;
        } else if (newPaidAmount > grandTotal) {
          newPaidAmount = grandTotal;
        }
        const status = newPaidAmount === grandTotal ? 'PAID' : 'UNPAID';

        db.prepare('UPDATE bills SET customer_id = ?, grand_total = ?, paid_amount = ?, status = ?, notes = ? WHERE id = ?')
          .run(customerId, grandTotal, newPaidAmount, status, payload.notes || '', billIdToEdit);
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
      "SELECT id, bill_date AS billDate, grand_total AS grandTotal, paid_amount AS paidAmount, status, notes FROM bills WHERE id = ?"
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
    const rows = db.prepare(query).all(params);

    const getSettlements = db.prepare('SELECT id, amount, payment_date AS paymentDate FROM bill_settlements WHERE bill_id = ? ORDER BY payment_date DESC');
    for (const row of rows) {
      row.settlements = getSettlements.all(row.id);
    }

    return rows;
  });

  ipcMain.handle('bills:updateStatus', async (_event, { billId, status }) => {
    if (!['UNPAID', 'PAID'].includes(status)) {
      return { success: false, error: 'Invalid status.' };
    }
    const db = getDb();
    db.transaction(() => {
      if (status === 'PAID') {
        const bill = db.prepare('SELECT grand_total, paid_amount FROM bills WHERE id = ?').get(billId);
        const remaining = bill.grand_total - (bill.paid_amount || 0);
        db.prepare('UPDATE bills SET status = ?, paid_amount = grand_total WHERE id = ?').run(status, billId);
        if (remaining > 0) {
          db.prepare('INSERT INTO bill_settlements (bill_id, amount, payment_date) VALUES (?, ?, datetime(\'now\', \'localtime\'))').run(billId, remaining);
        }
      } else {
        db.prepare('UPDATE bills SET status = ?, paid_amount = 0.0 WHERE id = ?').run(status, billId);
        db.prepare('DELETE FROM bill_settlements WHERE bill_id = ?').run(billId);
      }
    })();

    // Regenerate PDF
    try {
      const bill = db.prepare(
        "SELECT id, customer_id AS customerId, bill_date AS billDate, grand_total AS grandTotal, paid_amount AS paidAmount, status, notes FROM bills WHERE id = ?"
      ).get(billId);
      const customer = db.prepare('SELECT id, name, whatsapp_number AS whatsappNumber FROM customers WHERE id = ?').get(bill.customerId);
      const savedItems = db.prepare(
        'SELECT product_name AS productName, mode, value, price, line_total AS lineTotal, notes FROM bill_items WHERE bill_id = ?'
      ).all(billId);
      const pdfPath = await generateBillPdf(customer, bill, savedItems);
      db.prepare('UPDATE bills SET pdf_path = ? WHERE id = ?').run(pdfPath, billId);
    } catch (err) {
      console.error('Failed to regenerate bill PDF after status update', err);
    }

    return { success: true };
  });

  ipcMain.handle('bills:updatePaidAmount', async (_event, { billId, paidAmount, paymentMethod, chequeNumber, notes }) => {
    const db = getDb();
    const bill = db.prepare('SELECT grand_total, paid_amount, customer_id AS customerId FROM bills WHERE id = ?').get(billId);
    if (!bill) {
      return { success: false, error: 'Bill not found.' };
    }
    const paymentAmount = Number(paidAmount || 0);
    if (paymentAmount < 0) {
      return { success: false, error: 'Payment amount cannot be negative.' };
    }
    const newPaidAmount = Number(bill.paid_amount || 0) + paymentAmount;
    if (newPaidAmount > bill.grand_total) {
      return { success: false, error: 'Total paid amount cannot exceed grand total.' };
    }
    const status = newPaidAmount === bill.grand_total ? 'PAID' : 'UNPAID';
    
    const method = paymentMethod || 'CASH';
    const chq = chequeNumber || null;
    const nts = notes || null;

    db.transaction(() => {
      db.prepare('UPDATE bills SET paid_amount = ?, status = ? WHERE id = ?').run(newPaidAmount, status, billId);
      db.prepare('INSERT INTO bill_settlements (bill_id, amount, payment_method, cheque_number, notes, payment_date) VALUES (?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'))')
        .run(billId, paymentAmount, method, chq, nts);
    })();

    // Regenerate PDF
    try {
      const updatedBill = db.prepare(
        "SELECT id, customer_id AS customerId, bill_date AS billDate, grand_total AS grandTotal, paid_amount AS paidAmount, status, notes FROM bills WHERE id = ?"
      ).get(billId);
      updatedBill.settlements = db.prepare('SELECT amount, payment_method, cheque_number, notes, payment_date FROM bill_settlements WHERE bill_id = ?').all(billId);
      const customer = db.prepare('SELECT id, name, whatsapp_number AS whatsappNumber FROM customers WHERE id = ?').get(bill.customerId);
      const savedItems = db.prepare(
        'SELECT product_name AS productName, mode, value, price, line_total AS lineTotal, notes FROM bill_items WHERE bill_id = ?'
      ).all(billId);
      const pdfPath = await generateBillPdf(customer, updatedBill, savedItems);
      db.prepare('UPDATE bills SET pdf_path = ? WHERE id = ?').run(pdfPath, billId);
    } catch (err) {
      console.error('Failed to regenerate bill PDF after paid amount update', err);
    }

    return { success: true, status };
  });

  ipcMain.handle('bills:get', (_event, billId) => {
    const db = getDb();
    const bill = db.prepare('SELECT id, customer_id AS customerId, bill_date AS billDate, grand_total AS grandTotal, paid_amount AS paidAmount, status, notes FROM bills WHERE id = ? AND is_deleted = 0').get(billId);
    if (!bill) return null;
    const items = db.prepare('SELECT id, product_name AS productName, mode, value, price, line_total AS lineTotal, notes FROM bill_items WHERE bill_id = ?').all(billId);
    return { ...bill, items };
  });

  ipcMain.handle('bills:delete', (_event, billId) => {
    const db = getDb();
    db.prepare('UPDATE bills SET is_deleted = 1 WHERE id = ?').run(billId);
    return { success: true };
  });

  ipcMain.handle('bills:updateSettlement', async (_event, { settlementId, amount, paymentMethod, chequeNumber, notes }) => {
    const db = getDb();
    const settlement = db.prepare('SELECT bill_id, amount FROM bill_settlements WHERE id = ?').get(settlementId);
    if (!settlement) {
      return { success: false, error: 'Settlement not found.' };
    }
    const newAmount = Number(amount || 0);
    if (newAmount < 0) {
      return { success: false, error: 'Amount cannot be negative.' };
    }
    const billId = settlement.bill_id;
    const bill = db.prepare('SELECT grand_total, paid_amount, customer_id AS customerId FROM bills WHERE id = ?').get(billId);
    if (!bill) {
      return { success: false, error: 'Bill not found.' };
    }
    const otherPaymentsSum = Number(bill.paid_amount || 0) - Number(settlement.amount || 0);
    const newPaidAmount = otherPaymentsSum + newAmount;
    if (newPaidAmount > bill.grand_total) {
      return { success: false, error: 'Total paid amount cannot exceed grand total.' };
    }
    const status = newPaidAmount === bill.grand_total ? 'PAID' : 'UNPAID';
    
    const method = paymentMethod || 'CASH';
    const chq = chequeNumber || null;
    const nts = notes || null;

    db.transaction(() => {
      db.prepare('UPDATE bill_settlements SET amount = ?, payment_method = ?, cheque_number = ?, notes = ? WHERE id = ?')
        .run(newAmount, method, chq, nts, settlementId);
      db.prepare('UPDATE bills SET paid_amount = ?, status = ? WHERE id = ?').run(newPaidAmount, status, billId);
    })();

    // Regenerate PDF
    try {
      const updatedBill = db.prepare(
        "SELECT id, customer_id AS customerId, bill_date AS billDate, grand_total AS grandTotal, paid_amount AS paidAmount, status, notes FROM bills WHERE id = ?"
      ).get(billId);
      updatedBill.settlements = db.prepare('SELECT amount, payment_method, cheque_number, notes, payment_date FROM bill_settlements WHERE bill_id = ?').all(billId);
      const customer = db.prepare('SELECT id, name, whatsapp_number AS whatsappNumber FROM customers WHERE id = ?').get(bill.customerId);
      const savedItems = db.prepare(
        'SELECT product_name AS productName, mode, value, price, line_total AS lineTotal, notes FROM bill_items WHERE bill_id = ?'
      ).all(billId);
      const pdfPath = await generateBillPdf(customer, updatedBill, savedItems);
      db.prepare('UPDATE bills SET pdf_path = ? WHERE id = ?').run(pdfPath, billId);
    } catch (err) {
      console.error('Failed to regenerate bill PDF after settlement update', err);
    }

    return { success: true };
  });

  ipcMain.handle('bills:deleteSettlement', async (_event, { settlementId }) => {
    const db = getDb();
    const settlement = db.prepare('SELECT bill_id, amount FROM bill_settlements WHERE id = ?').get(settlementId);
    if (!settlement) {
      return { success: false, error: 'Settlement not found.' };
    }
    const billId = settlement.bill_id;
    const bill = db.prepare('SELECT grand_total, paid_amount, customer_id AS customerId FROM bills WHERE id = ?').get(billId);
    if (!bill) {
      return { success: false, error: 'Bill not found.' };
    }
    const newPaidAmount = Math.max(0, Number(bill.paid_amount || 0) - Number(settlement.amount || 0));
    const status = newPaidAmount === bill.grand_total ? 'PAID' : 'UNPAID';

    db.transaction(() => {
      db.prepare('DELETE FROM bill_settlements WHERE id = ?').run(settlementId);
      db.prepare('UPDATE bills SET paid_amount = ?, status = ? WHERE id = ?').run(newPaidAmount, status, billId);
    })();

    // Regenerate PDF
    try {
      const updatedBill = db.prepare(
        "SELECT id, customer_id AS customerId, bill_date AS billDate, grand_total AS grandTotal, paid_amount AS paidAmount, status, notes FROM bills WHERE id = ?"
      ).get(billId);
      updatedBill.settlements = db.prepare('SELECT amount, payment_method, cheque_number, notes, payment_date FROM bill_settlements WHERE bill_id = ?').all(billId);
      const customer = db.prepare('SELECT id, name, whatsapp_number AS whatsappNumber FROM customers WHERE id = ?').get(bill.customerId);
      const savedItems = db.prepare(
        'SELECT product_name AS productName, mode, value, price, line_total AS lineTotal, notes FROM bill_items WHERE bill_id = ?'
      ).all(billId);
      const pdfPath = await generateBillPdf(customer, updatedBill, savedItems);
      db.prepare('UPDATE bills SET pdf_path = ? WHERE id = ?').run(pdfPath, billId);
    } catch (err) {
      console.error('Failed to regenerate bill PDF after settlement delete', err);
    }

    return { success: true };
  });
}

module.exports = register;

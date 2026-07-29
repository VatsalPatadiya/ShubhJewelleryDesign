const { ipcMain } = require('electron');
const { getDb } = require('../db/database');
const { isPositiveNumber } = require('../utils/validate');
const { generateSupplierBillPdf } = require('./pdf');

const LIST_QUERY_BASE = `
  SELECT b.id, b.supplier_id AS supplierId, c.name AS supplierName, c.whatsapp_number AS whatsappNumber,
         b.bill_date AS billDate, b.status, b.grand_total AS grandTotal, b.paid_amount AS paidAmount, b.pdf_path AS pdfPath, b.notes
  FROM supplier_bills b
  JOIN suppliers c ON c.id = b.supplier_id
`;

function register() {
  ipcMain.handle('supplierBills:save', async (_event, payload) => {
    const db = getDb();
    const { id: billIdToEdit, supplierId, items } = payload || {};

    if (!supplierId) {
      return { success: false, error: 'Please select a supplier.' };
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

    const supplier = db.prepare('SELECT id, name, whatsapp_number AS whatsappNumber FROM suppliers WHERE id = ?').get(supplierId);
    if (!supplier) {
      return { success: false, error: 'Supplier not found.' };
    }

    const grandTotal = items.reduce((sum, item) => sum + Number(item.value) * Number(item.price), 0);

    const insertBill = db.prepare(
      "INSERT INTO supplier_bills (supplier_id, grand_total, status, notes) VALUES (?, ?, 'UNPAID', ?)"
    );
    const insertItem = db.prepare(
      'INSERT INTO supplier_bill_items (bill_id, product_name, mode, value, price, line_total, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const updatePdfPath = db.prepare('UPDATE supplier_bills SET pdf_path = ? WHERE id = ?');

    let billId = billIdToEdit;

    db.transaction(() => {
      if (billIdToEdit) {
        const oldBill = db.prepare('SELECT status, paid_amount FROM supplier_bills WHERE id = ?').get(billIdToEdit);
        let newPaidAmount = oldBill ? oldBill.paid_amount : 0.0;
        if (oldBill && oldBill.status === 'PAID') {
          newPaidAmount = grandTotal;
        } else if (newPaidAmount > grandTotal) {
          newPaidAmount = grandTotal;
        }
        const status = newPaidAmount === grandTotal ? 'PAID' : 'UNPAID';

        db.prepare('UPDATE supplier_bills SET supplier_id = ?, grand_total = ?, paid_amount = ?, status = ?, notes = ? WHERE id = ?')
          .run(supplierId, grandTotal, newPaidAmount, status, payload.notes || '', billIdToEdit);
        db.prepare('DELETE FROM supplier_bill_items WHERE bill_id = ?').run(billIdToEdit);
        for (const item of items) {
          const lineTotal = Number(item.value) * Number(item.price);
          insertItem.run(billIdToEdit, item.productName.trim(), item.mode, Number(item.value), Number(item.price), lineTotal, item.notes || '');
        }
      } else {
        const info = insertBill.run(supplierId, grandTotal, payload.notes || '');
        billId = info.lastInsertRowid;
        for (const item of items) {
          const lineTotal = Number(item.value) * Number(item.price);
          insertItem.run(billId, item.productName.trim(), item.mode, Number(item.value), Number(item.price), lineTotal, item.notes || '');
        }
      }
    })();

    const bill = db.prepare(
      "SELECT id, bill_date AS billDate, grand_total AS grandTotal, paid_amount AS paidAmount, status, notes FROM supplier_bills WHERE id = ?"
    ).get(billId);
    const savedItems = db.prepare(
      'SELECT product_name AS productName, mode, value, price, line_total AS lineTotal, notes FROM supplier_bill_items WHERE bill_id = ?'
    ).all(billId);

    let pdfPath = null;
    try {
      pdfPath = await generateSupplierBillPdf(supplier, bill, savedItems);
      updatePdfPath.run(pdfPath, billId);
    } catch (err) {
      console.error('Failed to generate/update bill PDF', err);
    }

    return { success: true, id: billId, grandTotal, pdfPath };
  });

  ipcMain.handle('supplierBills:list', (_event, filter) => {
    const db = getDb();
    const clauses = ['b.is_deleted = 0'];
    const params = {};

    if (filter && filter.supplierId) {
      clauses.push('b.supplier_id = @supplierId');
      params.supplierId = Number(filter.supplierId);
    }
    if (filter && filter.status && filter.status !== 'ALL') {
      clauses.push('b.status = @status');
      params.status = filter.status;
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const query = `${LIST_QUERY_BASE} ${where} ORDER BY b.bill_date DESC`;
    const rows = db.prepare(query).all(params);

    const getSettlements = db.prepare('SELECT id, amount, payment_method AS paymentMethod, cheque_number AS chequeNumber, notes, payment_date AS paymentDate FROM supplier_bill_settlements WHERE bill_id = ? ORDER BY payment_date DESC');
    for (const row of rows) {
      row.settlements = getSettlements.all(row.id);
    }

    return rows;
  });

  ipcMain.handle('supplierBills:updateStatus', async (_event, { billId, status }) => {
    if (!['UNPAID', 'PAID'].includes(status)) {
      return { success: false, error: 'Invalid status.' };
    }
    const db = getDb();
    db.transaction(() => {
      if (status === 'PAID') {
        const bill = db.prepare('SELECT grand_total, paid_amount FROM supplier_bills WHERE id = ?').get(billId);
        const remaining = bill.grand_total - (bill.paid_amount || 0);
        db.prepare('UPDATE supplier_bills SET status = ?, paid_amount = grand_total WHERE id = ?').run(status, billId);
        if (remaining > 0) {
          db.prepare('INSERT INTO supplier_bill_settlements (bill_id, amount, payment_date) VALUES (?, ?, datetime(\'now\', \'localtime\'))').run(billId, remaining);
        }
      } else {
        db.prepare('UPDATE supplier_bills SET status = ?, paid_amount = 0.0 WHERE id = ?').run(status, billId);
        db.prepare('DELETE FROM supplier_bill_settlements WHERE bill_id = ?').run(billId);
      }
    })();

    // Regenerate PDF
    try {
      const bill = db.prepare(
        "SELECT id, supplier_id AS supplierId, bill_date AS billDate, grand_total AS grandTotal, paid_amount AS paidAmount, status, notes FROM supplier_bills WHERE id = ?"
      ).get(billId);
      const supplier = db.prepare('SELECT id, name, whatsapp_number AS whatsappNumber FROM suppliers WHERE id = ?').get(bill.supplierId);
      const savedItems = db.prepare(
        'SELECT product_name AS productName, mode, value, price, line_total AS lineTotal, notes FROM supplier_bill_items WHERE bill_id = ?'
      ).all(billId);
      const pdfPath = await generateSupplierBillPdf(supplier, bill, savedItems);
      db.prepare('UPDATE supplier_bills SET pdf_path = ? WHERE id = ?').run(pdfPath, billId);
    } catch (err) {
      console.error('Failed to regenerate bill PDF after status update', err);
    }

    return { success: true };
  });

  ipcMain.handle('supplierBills:updatePaidAmount', async (_event, { billId, paidAmount, paymentMethod, chequeNumber, notes }) => {
    const db = getDb();
    const bill = db.prepare('SELECT grand_total, paid_amount, supplier_id AS supplierId FROM supplier_bills WHERE id = ?').get(billId);
    if (!bill) {
      return { success: false, error: 'Bill not found.' };
    }
    const paymentAmount = Number(paidAmount || 0);
    if (paymentAmount < 0) {
      return { success: false, error: 'Payment amount cannot be negative.' };
    }
    const newPaidAmount = Math.round((Number(bill.paid_amount || 0) + paymentAmount) * 100) / 100;
    const grandTotalRounded = Math.round(bill.grand_total * 100) / 100;
    if (newPaidAmount > grandTotalRounded) {
      return { success: false, error: 'Total paid amount cannot exceed grand total.' };
    }
    const status = newPaidAmount >= grandTotalRounded ? 'PAID' : 'UNPAID';
    
    const method = paymentMethod || 'CASH';
    const chq = chequeNumber || null;
    const nts = notes || null;

    db.transaction(() => {
      db.prepare('UPDATE supplier_bills SET paid_amount = ?, status = ? WHERE id = ?').run(newPaidAmount, status, billId);
      db.prepare('INSERT INTO supplier_bill_settlements (bill_id, amount, payment_method, cheque_number, notes, payment_date) VALUES (?, ?, ?, ?, ?, datetime(\'now\', \'localtime\'))')
        .run(billId, paymentAmount, method, chq, nts);
    })();

    // Regenerate PDF
    try {
      const updatedBill = db.prepare(
        "SELECT id, supplier_id AS supplierId, bill_date AS billDate, grand_total AS grandTotal, paid_amount AS paidAmount, status, notes FROM supplier_bills WHERE id = ?"
      ).get(billId);
      updatedBill.settlements = db.prepare('SELECT amount, payment_method, cheque_number, notes, payment_date FROM supplier_bill_settlements WHERE bill_id = ?').all(billId);
      const supplier = db.prepare('SELECT id, name, whatsapp_number AS whatsappNumber FROM suppliers WHERE id = ?').get(bill.supplierId);
      const savedItems = db.prepare(
        'SELECT product_name AS productName, mode, value, price, line_total AS lineTotal, notes FROM supplier_bill_items WHERE bill_id = ?'
      ).all(billId);
      const pdfPath = await generateSupplierBillPdf(supplier, updatedBill, savedItems);
      db.prepare('UPDATE supplier_bills SET pdf_path = ? WHERE id = ?').run(pdfPath, billId);
    } catch (err) {
      console.error('Failed to regenerate bill PDF after paid amount update', err);
    }

    return { success: true, status };
  });

  ipcMain.handle('supplierBills:get', (_event, billId) => {
    const db = getDb();
    const bill = db.prepare('SELECT id, supplier_id AS supplierId, bill_date AS billDate, grand_total AS grandTotal, paid_amount AS paidAmount, status, notes FROM supplier_bills WHERE id = ? AND is_deleted = 0').get(billId);
    if (!bill) return null;
    const items = db.prepare('SELECT id, product_name AS productName, mode, value, price, line_total AS lineTotal, notes FROM supplier_bill_items WHERE bill_id = ?').all(billId);
    return { ...bill, items };
  });

  ipcMain.handle('supplierBills:delete', (_event, billId) => {
    const db = getDb();
    db.prepare('UPDATE supplier_bills SET is_deleted = 1 WHERE id = ?').run(billId);
    return { success: true };
  });

  ipcMain.handle('supplierBills:updateSettlement', async (_event, { settlementId, amount, paymentMethod, chequeNumber, notes }) => {
    const db = getDb();
    const settlement = db.prepare('SELECT bill_id, amount FROM supplier_bill_settlements WHERE id = ?').get(settlementId);
    if (!settlement) {
      return { success: false, error: 'Settlement not found.' };
    }
    const newAmount = Number(amount || 0);
    if (newAmount < 0) {
      return { success: false, error: 'Amount cannot be negative.' };
    }
    const billId = settlement.bill_id;
    const bill = db.prepare('SELECT grand_total, paid_amount, supplier_id AS supplierId FROM supplier_bills WHERE id = ?').get(billId);
    if (!bill) {
      return { success: false, error: 'Bill not found.' };
    }
    const otherPaymentsSum = Number(bill.paid_amount || 0) - Number(settlement.amount || 0);
    const newPaidAmount = Math.round((otherPaymentsSum + newAmount) * 100) / 100;
    const grandTotalRounded = Math.round(bill.grand_total * 100) / 100;
    if (newPaidAmount > grandTotalRounded) {
      return { success: false, error: 'Total paid amount cannot exceed grand total.' };
    }
    const status = newPaidAmount >= grandTotalRounded ? 'PAID' : 'UNPAID';
    
    const method = paymentMethod || 'CASH';
    const chq = chequeNumber || null;
    const nts = notes || null;

    db.transaction(() => {
      db.prepare('UPDATE supplier_bill_settlements SET amount = ?, payment_method = ?, cheque_number = ?, notes = ? WHERE id = ?')
        .run(newAmount, method, chq, nts, settlementId);
      db.prepare('UPDATE supplier_bills SET paid_amount = ?, status = ? WHERE id = ?').run(newPaidAmount, status, billId);
    })();

    // Regenerate PDF
    try {
      const updatedBill = db.prepare(
        "SELECT id, supplier_id AS supplierId, bill_date AS billDate, grand_total AS grandTotal, paid_amount AS paidAmount, status, notes FROM supplier_bills WHERE id = ?"
      ).get(billId);
      updatedBill.settlements = db.prepare('SELECT amount, payment_method, cheque_number, notes, payment_date FROM supplier_bill_settlements WHERE bill_id = ?').all(billId);
      const supplier = db.prepare('SELECT id, name, whatsapp_number AS whatsappNumber FROM suppliers WHERE id = ?').get(bill.supplierId);
      const savedItems = db.prepare(
        'SELECT product_name AS productName, mode, value, price, line_total AS lineTotal, notes FROM supplier_bill_items WHERE bill_id = ?'
      ).all(billId);
      const pdfPath = await generateSupplierBillPdf(supplier, updatedBill, savedItems);
      db.prepare('UPDATE supplier_bills SET pdf_path = ? WHERE id = ?').run(pdfPath, billId);
    } catch (err) {
      console.error('Failed to regenerate bill PDF after settlement update', err);
    }

    return { success: true };
  });

  ipcMain.handle('supplierBills:deleteSettlement', async (_event, { settlementId }) => {
    const db = getDb();
    const settlement = db.prepare('SELECT bill_id, amount FROM supplier_bill_settlements WHERE id = ?').get(settlementId);
    if (!settlement) {
      return { success: false, error: 'Settlement not found.' };
    }
    const billId = settlement.bill_id;
    const bill = db.prepare('SELECT grand_total, paid_amount, supplier_id AS supplierId FROM supplier_bills WHERE id = ?').get(billId);
    if (!bill) {
      return { success: false, error: 'Bill not found.' };
    }
    const newPaidAmount = Math.max(0, Math.round((Number(bill.paid_amount || 0) - Number(settlement.amount || 0)) * 100) / 100);
    const grandTotalRounded = Math.round(bill.grand_total * 100) / 100;
    const status = newPaidAmount >= grandTotalRounded ? 'PAID' : 'UNPAID';

    db.transaction(() => {
      db.prepare('DELETE FROM supplier_bill_settlements WHERE id = ?').run(settlementId);
      db.prepare('UPDATE supplier_bills SET paid_amount = ?, status = ? WHERE id = ?').run(newPaidAmount, status, billId);
    })();

    // Regenerate PDF
    try {
      const updatedBill = db.prepare(
        "SELECT id, supplier_id AS supplierId, bill_date AS billDate, grand_total AS grandTotal, paid_amount AS paidAmount, status, notes FROM supplier_bills WHERE id = ?"
      ).get(billId);
      updatedBill.settlements = db.prepare('SELECT amount, payment_method, cheque_number, notes, payment_date FROM supplier_bill_settlements WHERE bill_id = ?').all(billId);
      const supplier = db.prepare('SELECT id, name, whatsapp_number AS whatsappNumber FROM suppliers WHERE id = ?').get(bill.supplierId);
      const savedItems = db.prepare(
        'SELECT product_name AS productName, mode, value, price, line_total AS lineTotal, notes FROM supplier_bill_items WHERE bill_id = ?'
      ).all(billId);
      const pdfPath = await generateSupplierBillPdf(supplier, updatedBill, savedItems);
      db.prepare('UPDATE supplier_bills SET pdf_path = ? WHERE id = ?').run(pdfPath, billId);
    } catch (err) {
      console.error('Failed to regenerate bill PDF after settlement delete', err);
    }

    return { success: true };
  });
}

module.exports = register;

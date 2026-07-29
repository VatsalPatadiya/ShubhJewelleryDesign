const { ipcMain } = require('electron');
const { getDb } = require('../db/database');
const {
  normalizeWhatsappNumber,
  isValidWhatsappNumber,
  isNonEmptyString,
} = require('../utils/validate');

const LIST_QUERY = `
  SELECT
    c.id,
    c.name,
    c.whatsapp_number AS whatsappNumber,
    c.created_at AS createdAt,
    COALESCE(SUM(CASE WHEN b.status = 'UNPAID' THEN 1 ELSE 0 END), 0) AS pendingBills,
    COALESCE(SUM(CASE WHEN b.status = 'UNPAID' THEN b.grand_total - b.paid_amount ELSE 0 END), 0) AS pendingAmount
  FROM suppliers c
  LEFT JOIN supplier_bills b ON b.supplier_id = c.id AND b.is_deleted = 0
  GROUP BY c.id
  ORDER BY c.name COLLATE NOCASE ASC
`;

function register() {
  ipcMain.handle('suppliers:list', () => {
    const db = getDb();
    return db.prepare(LIST_QUERY).all();
  });

  ipcMain.handle('suppliers:add', (_event, data) => {
    const name = (data && data.name || '').trim();
    const whatsappNumber = normalizeWhatsappNumber(data && data.whatsappNumber);

    if (!isNonEmptyString(name)) {
      return { success: false, error: 'Supplier name is required.' };
    }
    if (!isValidWhatsappNumber(whatsappNumber)) {
      return { success: false, error: 'WhatsApp number must be 10-15 digits.' };
    }

    const db = getDb();
    const info = db
      .prepare('INSERT INTO suppliers (name, whatsapp_number) VALUES (?, ?)')
      .run(name, whatsappNumber);
    return { success: true, id: info.lastInsertRowid };
  });

  ipcMain.handle('suppliers:remove', (_event, id) => {
    const db = getDb();
    const billCount = db
      .prepare('SELECT COUNT(*) AS count FROM supplier_bills WHERE supplier_id = ? AND is_deleted = 0')
      .get(id).count;

    if (billCount > 0) {
      return {
        success: false,
        error: `Cannot delete — this supplier has ${billCount} bill${billCount === 1 ? '' : 's'}.`,
      };
    }

    db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
    return { success: true };
  });
}

module.exports = register;
module.exports.LIST_QUERY = LIST_QUERY;

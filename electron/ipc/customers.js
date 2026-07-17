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
  FROM customers c
  LEFT JOIN bills b ON b.customer_id = c.id AND b.is_deleted = 0
  GROUP BY c.id
  ORDER BY c.name COLLATE NOCASE ASC
`;

function register() {
  ipcMain.handle('customers:list', () => {
    const db = getDb();
    return db.prepare(LIST_QUERY).all();
  });

  ipcMain.handle('customers:add', (_event, data) => {
    const name = (data && data.name || '').trim();
    const whatsappNumber = normalizeWhatsappNumber(data && data.whatsappNumber);

    if (!isNonEmptyString(name)) {
      return { success: false, error: 'Customer name is required.' };
    }
    if (!isValidWhatsappNumber(whatsappNumber)) {
      return { success: false, error: 'WhatsApp number must be 10-15 digits.' };
    }

    const db = getDb();
    const info = db
      .prepare('INSERT INTO customers (name, whatsapp_number) VALUES (?, ?)')
      .run(name, whatsappNumber);
    return { success: true, id: info.lastInsertRowid };
  });

  ipcMain.handle('customers:remove', (_event, id) => {
    const db = getDb();
    const billCount = db
      .prepare('SELECT COUNT(*) AS count FROM bills WHERE customer_id = ? AND is_deleted = 0')
      .get(id).count;

    if (billCount > 0) {
      return {
        success: false,
        error: `Cannot delete — this customer has ${billCount} bill${billCount === 1 ? '' : 's'}.`,
      };
    }

    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    return { success: true };
  });
}

module.exports = register;
module.exports.LIST_QUERY = LIST_QUERY;

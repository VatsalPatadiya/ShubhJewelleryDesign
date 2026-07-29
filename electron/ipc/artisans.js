const { ipcMain } = require('electron');
const { getDb } = require('../db/database');
const {
  normalizeWhatsappNumber,
  isValidWhatsappNumber,
  isNonEmptyString,
} = require('../utils/validate');

const LIST_QUERY = `
  SELECT
    k.id,
    k.name,
    k.whatsapp_number AS whatsappNumber,
    k.created_at AS createdAt,
    COALESCE(SUM(CASE WHEN b.status = 'UNPAID' THEN 1 ELSE 0 END), 0) AS pendingBills,
    COALESCE(SUM(CASE WHEN b.status = 'UNPAID' THEN b.grand_total - b.paid_amount ELSE 0 END), 0) AS pendingAmount
  FROM artisans k
  LEFT JOIN artisan_bills b ON b.artisan_id = k.id AND b.is_deleted = 0
  GROUP BY k.id
  ORDER BY k.name COLLATE NOCASE ASC
`;

function register() {
  ipcMain.handle('artisans:list', () => {
    const db = getDb();
    return db.prepare(LIST_QUERY).all();
  });

  ipcMain.handle('artisans:add', (_event, data) => {
    const name = (data && data.name || '').trim();
    const whatsappNumber = normalizeWhatsappNumber(data && data.whatsappNumber);

    if (!isNonEmptyString(name)) {
      return { success: false, error: 'Artisan name is required.' };
    }
    if (!isValidWhatsappNumber(whatsappNumber)) {
      return { success: false, error: 'WhatsApp number must be 10-15 digits.' };
    }

    const db = getDb();
    const info = db
      .prepare('INSERT INTO artisans (name, whatsapp_number) VALUES (?, ?)')
      .run(name, whatsappNumber);
    return { success: true, id: info.lastInsertRowid };
  });

  ipcMain.handle('artisans:remove', (_event, id) => {
    const db = getDb();
    const billCount = db
      .prepare('SELECT COUNT(*) AS count FROM artisan_bills WHERE artisan_id = ? AND is_deleted = 0')
      .get(id).count;

    if (billCount > 0) {
      return {
        success: false,
        error: `Cannot delete — this artisan has ${billCount} bill${billCount === 1 ? '' : 's'}.`,
      };
    }

    db.prepare('DELETE FROM artisans WHERE id = ?').run(id);
    return { success: true };
  });
}

module.exports = register;
module.exports.LIST_QUERY = LIST_QUERY;

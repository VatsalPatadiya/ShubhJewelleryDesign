const { ipcMain } = require('electron');
const { getDb } = require('../db/database');
const { isNonEmptyString } = require('../utils/validate');

function register() {
  ipcMain.handle('products:listMaster', () => {
    const db = getDb();
    return db.prepare('SELECT id, name FROM products_master ORDER BY name COLLATE NOCASE ASC').all();
  });

  ipcMain.handle('products:addMaster', (_event, name) => {
    const trimmed = (name || '').trim();
    if (!isNonEmptyString(trimmed)) {
      return { success: false, error: 'Product name is required.' };
    }

    const db = getDb();
    db.prepare('INSERT OR IGNORE INTO products_master (name) VALUES (?)').run(trimmed);
    const row = db.prepare('SELECT id, name FROM products_master WHERE name = ?').get(trimmed);
    return { success: true, product: row };
  });
}

module.exports = register;

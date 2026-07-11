const { ipcMain } = require('electron');
const { getDb } = require('../db/database');

function register() {
  ipcMain.handle('settings:get', (_event, key) => {
    const db = getDb();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : null;
  });

  ipcMain.handle('settings:set', (_event, { key, value }) => {
    const db = getDb();
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
    return { success: true };
  });
}

module.exports = register;

const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { getDb } = require('../db/database');
const { downloadsDir } = require('../utils/paths');
const { normalizeWhatsappNumber, isValidWhatsappNumber, isNonEmptyString } = require('../utils/validate');
const { LIST_QUERY } = require('./customers');

function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function register() {
  ipcMain.handle('customers:exportCsv', async () => {
    const db = getDb();
    const rows = db.prepare(LIST_QUERY).all();

    const csv = Papa.unparse({
      fields: ['Customer Name', 'WhatsApp Number', 'Pending Bills', 'Pending Amount'],
      data: rows.map((r) => [r.name, r.whatsappNumber, r.pendingBills, r.pendingAmount]),
    });

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Customers CSV',
      defaultPath: path.join(downloadsDir(), `customers-export-${todayStamp()}.csv`),
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    fs.writeFileSync(filePath, csv, 'utf8');
    return { success: true, filePath };
  });

  ipcMain.handle('customers:pickImportFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Import Customers CSV',
      properties: ['openFile'],
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (canceled || !filePaths.length) {
      return { success: false, canceled: true };
    }
    return { success: true, filePath: filePaths[0] };
  });

  ipcMain.handle('customers:importCsv', (_event, filePath) => {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'File not found.' };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });

    const db = getDb();
    const existing = db.prepare('SELECT whatsapp_number FROM customers').all();
    const seen = new Set(existing.map((c) => c.whatsapp_number));

    const insert = db.prepare('INSERT INTO customers (name, whatsapp_number) VALUES (?, ?)');

    let added = 0;
    let skipped = 0;

    const runImport = db.transaction((records) => {
      for (const record of records) {
        const name = (record['Customer Name'] || '').trim();
        const whatsappNumber = normalizeWhatsappNumber(record['WhatsApp Number']);

        if (!isNonEmptyString(name) || !isValidWhatsappNumber(whatsappNumber)) {
          skipped += 1;
          continue;
        }
        if (seen.has(whatsappNumber)) {
          skipped += 1;
          continue;
        }

        insert.run(name, whatsappNumber);
        seen.add(whatsappNumber);
        added += 1;
      }
    });

    runImport(parsed.data);

    return { success: true, added, skipped };
  });
}

module.exports = register;

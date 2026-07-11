const { ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const { getDb, closeDb, reopenDb } = require('../db/database');
const { dbPath, pdfsDir, downloadsDir } = require('../utils/paths');

function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function createZip(outPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);

    archive.file(dbPath(), { name: 'app.db' });
    if (fs.existsSync(pdfsDir())) {
      archive.directory(pdfsDir(), 'pdfs');
    }

    archive.finalize();
  });
}

function register() {
  ipcMain.handle('backup:run', async () => {
    const db = getDb();
    db.pragma('wal_checkpoint(TRUNCATE)'); // flush WAL so app.db on disk is self-contained

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Backup Now',
      defaultPath: path.join(downloadsDir(), `billing-backup-${todayStamp()}.zip`),
      filters: [{ name: 'Zip Archive', extensions: ['zip'] }],
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    try {
      await createZip(filePath);
      return { success: true, filePath };
    } catch (err) {
      console.error('Backup failed', err);
      return { success: false, error: 'Backup failed: ' + err.message };
    }
  });

  ipcMain.handle('backup:restore', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Restore from Backup',
      properties: ['openFile'],
      filters: [{ name: 'Zip Archive', extensions: ['zip'] }],
    });

    if (canceled || !filePaths.length) {
      return { success: false, canceled: true };
    }

    const zipPath = filePaths[0];
    let zip;
    try {
      zip = new AdmZip(zipPath);
    } catch (err) {
      return { success: false, error: 'Not a valid zip file.' };
    }

    const entries = zip.getEntries().map((e) => e.entryName);
    if (!entries.includes('app.db')) {
      return { success: false, error: 'This zip does not look like a valid billing backup (missing app.db).' };
    }

    const currentDb = dbPath();
    const currentPdfs = pdfsDir();
    const bakDb = `${currentDb}.bak`;
    const bakPdfs = `${currentPdfs}.bak`;

    closeDb();

    try {
      // Snapshot current state so we can roll back on any failure below.
      if (fs.existsSync(currentDb)) fs.copyFileSync(currentDb, bakDb);
      if (fs.existsSync(bakPdfs)) fs.rmSync(bakPdfs, { recursive: true, force: true });
      if (fs.existsSync(currentPdfs)) fs.cpSync(currentPdfs, bakPdfs, { recursive: true });

      zip.extractEntryTo('app.db', path.dirname(currentDb), false, true);

      if (fs.existsSync(currentPdfs)) fs.rmSync(currentPdfs, { recursive: true, force: true });
      fs.mkdirSync(currentPdfs, { recursive: true });
      const pdfEntries = entries.filter((e) => e.startsWith('pdfs/') && !e.endsWith('/'));
      for (const entry of pdfEntries) {
        zip.extractEntryTo(entry, path.dirname(currentPdfs), true, true);
      }

      reopenDb();

      // Extraction succeeded — drop the safety snapshots.
      if (fs.existsSync(bakDb)) fs.rmSync(bakDb, { force: true });
      if (fs.existsSync(bakPdfs)) fs.rmSync(bakPdfs, { recursive: true, force: true });

      return { success: true };
    } catch (err) {
      console.error('Restore failed, rolling back', err);
      try {
        if (fs.existsSync(bakDb)) fs.copyFileSync(bakDb, currentDb);
        if (fs.existsSync(bakPdfs)) {
          if (fs.existsSync(currentPdfs)) fs.rmSync(currentPdfs, { recursive: true, force: true });
          fs.cpSync(bakPdfs, currentPdfs, { recursive: true });
        }
      } catch (rollbackErr) {
        console.error('Rollback also failed', rollbackErr);
      }
      reopenDb();
      return { success: false, error: 'Restore failed and was rolled back: ' + err.message };
    }
  });

  ipcMain.handle('backup:showInFolder', (_event, filePath) => {
    shell.showItemInFolder(filePath);
  });
}

module.exports = register;

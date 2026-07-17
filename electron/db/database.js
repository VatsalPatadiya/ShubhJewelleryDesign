const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { dbPath } = require('../utils/paths');

let db = null;

function runMigrations(db) {
  const billsInfo = db.prepare("PRAGMA table_info(bills)").all();
  const billsColumns = billsInfo.map(c => c.name);
  if (!billsColumns.includes('is_deleted')) {
    db.prepare('ALTER TABLE bills ADD COLUMN is_deleted INTEGER DEFAULT 0').run();
  }
  if (!billsColumns.includes('notes')) {
    db.prepare('ALTER TABLE bills ADD COLUMN notes TEXT').run();
  }
  if (!billsColumns.includes('paid_amount')) {
    db.prepare('ALTER TABLE bills ADD COLUMN paid_amount REAL DEFAULT 0.0').run();
    db.prepare("UPDATE bills SET paid_amount = grand_total WHERE status = 'PAID'").run();
  }

  const settlementsTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bill_settlements'").get();
  if (!settlementsTableExists) {
    db.exec(`
      CREATE TABLE bill_settlements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        amount REAL NOT NULL,
        payment_date TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_bill_settlements_bill ON bill_settlements(bill_id);
    `);
    db.prepare(`
      INSERT INTO bill_settlements (bill_id, amount, payment_date)
      SELECT id, paid_amount, bill_date FROM bills WHERE paid_amount > 0
    `).run();
  }

  const itemsInfo = db.prepare("PRAGMA table_info(bill_items)").all();
  const itemsColumns = itemsInfo.map(c => c.name);
  if (!itemsColumns.includes('notes')) {
    db.prepare('ALTER TABLE bill_items ADD COLUMN notes TEXT').run();
  }
}

function open() {
  const file = dbPath();
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  runMigrations(db);
  return db;
}

function getDb() {
  if (!db) {
    open();
  }
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function reopenDb() {
  closeDb();
  return open();
}

module.exports = { getDb, closeDb, reopenDb };

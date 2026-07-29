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
        payment_method TEXT,
        cheque_number TEXT,
        notes TEXT,
        payment_date TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_bill_settlements_bill ON bill_settlements(bill_id);
    `);
    db.prepare(`
      INSERT INTO bill_settlements (bill_id, amount, payment_date)
      SELECT id, paid_amount, bill_date FROM bills WHERE paid_amount > 0
    `).run();
  }

  // Ensure bill_settlements has the columns payment_method, cheque_number, and notes
  const settlementsInfo = db.prepare("PRAGMA table_info(bill_settlements)").all();
  const settlementsColumns = settlementsInfo.map(c => c.name);
  if (!settlementsColumns.includes('payment_method')) {
    db.prepare('ALTER TABLE bill_settlements ADD COLUMN payment_method TEXT').run();
  }
  if (!settlementsColumns.includes('cheque_number')) {
    db.prepare('ALTER TABLE bill_settlements ADD COLUMN cheque_number TEXT').run();
  }
  if (!settlementsColumns.includes('notes')) {
    db.prepare('ALTER TABLE bill_settlements ADD COLUMN notes TEXT').run();
  }

  // Ensure artisan_bill_settlements has the columns payment_method, cheque_number, and notes
  const artisanSettlementsInfo = db.prepare("PRAGMA table_info(artisan_bill_settlements)").all();
  const artisanSettlementsColumns = artisanSettlementsInfo.map(c => c.name);
  if (!artisanSettlementsColumns.includes('payment_method')) {
    db.prepare('ALTER TABLE artisan_bill_settlements ADD COLUMN payment_method TEXT').run();
  }
  if (!artisanSettlementsColumns.includes('cheque_number')) {
    db.prepare('ALTER TABLE artisan_bill_settlements ADD COLUMN cheque_number TEXT').run();
  }
  if (!artisanSettlementsColumns.includes('notes')) {
    db.prepare('ALTER TABLE artisan_bill_settlements ADD COLUMN notes TEXT').run();
  }

  // Ensure supplier_bill_settlements has the columns payment_method, cheque_number, and notes
  const supplierSettlementsInfo = db.prepare("PRAGMA table_info(supplier_bill_settlements)").all();
  const supplierSettlementsColumns = supplierSettlementsInfo.map(c => c.name);
  if (!supplierSettlementsColumns.includes('payment_method')) {
    db.prepare('ALTER TABLE supplier_bill_settlements ADD COLUMN payment_method TEXT').run();
  }
  if (!supplierSettlementsColumns.includes('cheque_number')) {
    db.prepare('ALTER TABLE supplier_bill_settlements ADD COLUMN cheque_number TEXT').run();
  }
  if (!supplierSettlementsColumns.includes('notes')) {
    db.prepare('ALTER TABLE supplier_bill_settlements ADD COLUMN notes TEXT').run();
  }

  const itemsInfo = db.prepare("PRAGMA table_info(bill_items)").all();
  const itemsColumns = itemsInfo.map(c => c.name);
  if (!itemsColumns.includes('notes')) {
    db.prepare('ALTER TABLE bill_items ADD COLUMN notes TEXT').run();
  }

  // Rename karigar tables to artisan (robust approach)
  const karigarsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='karigars'").get();
  if (karigarsExists) {
    // If schema.sql created artisans already, drop it (it should be empty) so we can rename safely
    const artisansExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='artisans'").get();
    if (artisansExists) db.exec('DROP TABLE IF EXISTS artisans');
    db.prepare('ALTER TABLE karigars RENAME TO artisans').run();
    
    const kbExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='karigar_bills'").get();
    if (kbExists) {
      if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='artisan_bills'").get()) {
        db.exec('DROP TABLE IF EXISTS artisan_bills');
      }
      db.prepare('ALTER TABLE karigar_bills RENAME TO artisan_bills').run();
      db.prepare('ALTER TABLE artisan_bills RENAME COLUMN karigar_id TO artisan_id').run();
    }
    
    const kbiExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='karigar_bill_items'").get();
    if (kbiExists) {
      if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='artisan_bill_items'").get()) {
        db.exec('DROP TABLE IF EXISTS artisan_bill_items');
      }
      db.prepare('ALTER TABLE karigar_bill_items RENAME TO artisan_bill_items').run();
    }
    
    const kbsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='karigar_bill_settlements'").get();
    if (kbsExists) {
      if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='artisan_bill_settlements'").get()) {
        db.exec('DROP TABLE IF EXISTS artisan_bill_settlements');
      }
      db.prepare('ALTER TABLE karigar_bill_settlements RENAME TO artisan_bill_settlements').run();
    }
  }
}

function open() {
  const file = dbPath();
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  // Turn off foreign keys temporarily so dropping tables doesn't cause cascading deletes if we recreate them
  db.pragma('foreign_keys = OFF');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  runMigrations(db);
  db.pragma('foreign_keys = ON');
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

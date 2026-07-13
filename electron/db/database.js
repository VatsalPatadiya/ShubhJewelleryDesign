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

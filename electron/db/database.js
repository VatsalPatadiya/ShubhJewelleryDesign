const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { dbPath } = require('../utils/paths');

let db = null;

function open() {
  const file = dbPath();
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
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

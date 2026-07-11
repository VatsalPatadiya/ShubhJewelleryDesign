const { app } = require('electron');
const path = require('path');
const fs = require('fs');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

function userDataDir() {
  return app.getPath('userData');
}

function dbPath() {
  return path.join(userDataDir(), 'app.db');
}

function pdfsDir() {
  return ensureDir(path.join(userDataDir(), 'pdfs'));
}

function billPdfsDir() {
  return ensureDir(path.join(pdfsDir(), 'bills'));
}

function downloadsDir() {
  return app.getPath('downloads');
}

function customerPendingBillsDir(customerName) {
  const safeName = String(customerName).replace(/[^\w\-]+/g, '_');
  return ensureDir(path.join(downloadsDir(), 'BillingSoftware', safeName));
}

module.exports = {
  ensureDir,
  userDataDir,
  dbPath,
  pdfsDir,
  billPdfsDir,
  downloadsDir,
  customerPendingBillsDir,
};

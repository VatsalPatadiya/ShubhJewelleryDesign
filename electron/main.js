const { app, BrowserWindow } = require('electron');
const path = require('path');

const { getDb } = require('./db/database');
const registerCustomerHandlers = require('./ipc/customers');
const registerProductHandlers = require('./ipc/products');
const registerBillHandlers = require('./ipc/bills');
const registerPdfHandlers = require('./ipc/pdf');
const registerCsvHandlers = require('./ipc/csv');
const registerBackupHandlers = require('./ipc/backup');
const registerWhatsappHandlers = require('./ipc/whatsapp');
const registerSettingsHandlers = require('./ipc/settings');

const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#F4F2EE',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  getDb(); // initialize DB + run schema migrations before any IPC call can land

  registerCustomerHandlers();
  registerProductHandlers();
  registerBillHandlers();
  registerPdfHandlers();
  registerCsvHandlers();
  registerBackupHandlers();
  registerWhatsappHandlers();
  registerSettingsHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

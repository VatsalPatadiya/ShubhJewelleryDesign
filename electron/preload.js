const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  customers: {
    list: () => ipcRenderer.invoke('customers:list'),
    add: (data) => ipcRenderer.invoke('customers:add', data),
    remove: (id) => ipcRenderer.invoke('customers:remove', id),
    exportCsv: () => ipcRenderer.invoke('customers:exportCsv'),
    pickImportFile: () => ipcRenderer.invoke('customers:pickImportFile'),
    importCsv: (filePath) => ipcRenderer.invoke('customers:importCsv', filePath),
  },
  products: {
    listMaster: () => ipcRenderer.invoke('products:listMaster'),
    addMaster: (name) => ipcRenderer.invoke('products:addMaster', name),
  },
  bills: {
    save: (billPayload) => ipcRenderer.invoke('bills:save', billPayload),
    list: (filter) => ipcRenderer.invoke('bills:list', filter),
    updateStatus: (billId, status) => ipcRenderer.invoke('bills:updateStatus', { billId, status }),
  },
  pdf: {
    open: (pdfPath) => ipcRenderer.invoke('pdf:open', pdfPath),
  },
  whatsapp: {
    sendPendingBills: (customerId) => ipcRenderer.invoke('whatsapp:sendPendingBills', customerId),
  },
  backup: {
    run: () => ipcRenderer.invoke('backup:run'),
    restore: () => ipcRenderer.invoke('backup:restore'),
    showInFolder: (filePath) => ipcRenderer.invoke('backup:showInFolder', filePath),
  },
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', { key, value }),
  },
});

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
    updatePaidAmount: (billId, paidAmount, paymentMethod, chequeNumber, notes) => 
      ipcRenderer.invoke('bills:updatePaidAmount', { billId, paidAmount, paymentMethod, chequeNumber, notes }),
    delete: (billId) => ipcRenderer.invoke('bills:delete', billId),
    get: (billId) => ipcRenderer.invoke('bills:get', billId),
    updateSettlement: (settlementId, amount, paymentMethod, chequeNumber, notes) => 
      ipcRenderer.invoke('bills:updateSettlement', { settlementId, amount, paymentMethod, chequeNumber, notes }),
    deleteSettlement: (settlementId) => ipcRenderer.invoke('bills:deleteSettlement', { settlementId }),
  },
  artisans: {
    list: () => ipcRenderer.invoke('artisans:list'),
    add: (data) => ipcRenderer.invoke('artisans:add', data),
    remove: (id) => ipcRenderer.invoke('artisans:remove', id),
  },
  artisanBills: {
    save: (billPayload) => ipcRenderer.invoke('artisanBills:save', billPayload),
    list: (filter) => ipcRenderer.invoke('artisanBills:list', filter),
    updateStatus: (billId, status) => ipcRenderer.invoke('artisanBills:updateStatus', { billId, status }),
    updatePaidAmount: (billId, paidAmount, paymentMethod, chequeNumber, notes) => 
      ipcRenderer.invoke('artisanBills:updatePaidAmount', { billId, paidAmount, paymentMethod, chequeNumber, notes }),
    delete: (billId) => ipcRenderer.invoke('artisanBills:delete', billId),
    get: (billId) => ipcRenderer.invoke('artisanBills:get', billId),
    updateSettlement: (settlementId, amount, paymentMethod, chequeNumber, notes) => 
      ipcRenderer.invoke('artisanBills:updateSettlement', { settlementId, amount, paymentMethod, chequeNumber, notes }),
    deleteSettlement: (settlementId) => ipcRenderer.invoke('artisanBills:deleteSettlement', { settlementId }),
  },
  suppliers: {
    list: () => ipcRenderer.invoke('suppliers:list'),
    add: (data) => ipcRenderer.invoke('suppliers:add', data),
    remove: (id) => ipcRenderer.invoke('suppliers:remove', id),
  },
  supplierBills: {
    save: (billPayload) => ipcRenderer.invoke('supplierBills:save', billPayload),
    list: (filter) => ipcRenderer.invoke('supplierBills:list', filter),
    updateStatus: (billId, status) => ipcRenderer.invoke('supplierBills:updateStatus', { billId, status }),
    updatePaidAmount: (billId, paidAmount, paymentMethod, chequeNumber, notes) => 
      ipcRenderer.invoke('supplierBills:updatePaidAmount', { billId, paidAmount, paymentMethod, chequeNumber, notes }),
    delete: (billId) => ipcRenderer.invoke('supplierBills:delete', billId),
    get: (billId) => ipcRenderer.invoke('supplierBills:get', billId),
    updateSettlement: (settlementId, amount, paymentMethod, chequeNumber, notes) => 
      ipcRenderer.invoke('supplierBills:updateSettlement', { settlementId, amount, paymentMethod, chequeNumber, notes }),
    deleteSettlement: (settlementId) => ipcRenderer.invoke('supplierBills:deleteSettlement', { settlementId }),
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
  expenses: {
    list: (filter) => ipcRenderer.invoke('expenses:list', filter),
    add: (data) => ipcRenderer.invoke('expenses:add', data),
    update: (data) => ipcRenderer.invoke('expenses:update', data),
    delete: (id) => ipcRenderer.invoke('expenses:delete', id),
  },
  employees: {
    list: () => ipcRenderer.invoke('employees:list'),
    add: (name) => ipcRenderer.invoke('employees:add', name),
  },
});

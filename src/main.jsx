import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { initCryptoKey, encrypt, decrypt } from './crypto.js';
import './styles/tokens.css';
import './styles/global.css';

// ── Encrypted localStorage helpers ──────────────────────────

/**
 * Read an encrypted value from localStorage, decrypt it, and JSON.parse.
 * Returns fallback if the key is missing or decryption fails.
 */
async function getEncryptedItem(storageKey, fallback) {
  const raw = localStorage.getItem(storageKey);
  if (raw === null || raw === '') return fallback;

  try {
    const decrypted = await decrypt(raw);
    return JSON.parse(decrypted);
  } catch {
    // Possibly legacy unencrypted data — try plain parse
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
}

/**
 * JSON.stringify a value, encrypt it, and store in localStorage.
 */
async function setEncryptedItem(storageKey, value) {
  const json = JSON.stringify(value);
  const encrypted = await encrypt(json);
  localStorage.setItem(storageKey, encrypted);
}

/**
 * Read an encrypted string value (not JSON-wrapped).
 */
async function getEncryptedString(storageKey) {
  const raw = localStorage.getItem(storageKey);
  if (raw === null || raw === '') return null;

  try {
    return await decrypt(raw);
  } catch {
    // Possibly legacy unencrypted string — return as-is
    return raw;
  }
}

/**
 * Encrypt a plain string and store it.
 */
async function setEncryptedString(storageKey, value) {
  const encrypted = await encrypt(String(value));
  localStorage.setItem(storageKey, encrypted);
}

// ── Migrate legacy unencrypted data ─────────────────────────

async function migrateLegacyData() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    keys.push(localStorage.key(i));
  }

  for (const key of keys) {
    if (!key.startsWith('mock_db_') && !key.startsWith('mock_setting_')) continue;

    const raw = localStorage.getItem(key);
    if (raw === null || raw === '') continue;

    // Try to detect if data is already encrypted (Base64 that fails JSON.parse)
    let isPlainJson = false;
    try {
      JSON.parse(raw);
      isPlainJson = true;
    } catch {
      // Not valid JSON — either already encrypted or corrupted
      // Try to decrypt it to verify
      try {
        await decrypt(raw);
        // Successfully decrypted — already migrated
        continue;
      } catch {
        // Neither valid JSON nor valid encrypted data — skip
        continue;
      }
    }

    if (isPlainJson) {
      // Legacy unencrypted data — re-encrypt it
      const encrypted = await encrypt(raw);
      localStorage.setItem(key, encrypted);
    }
  }

  // Also migrate the sidebar-collapsed preference
  const collapseRaw = localStorage.getItem('sidebar-collapsed');
  if (collapseRaw === '0' || collapseRaw === '1') {
    const encrypted = await encrypt(collapseRaw);
    localStorage.setItem('sidebar-collapsed', encrypted);
  }
}

// ── Build mock API with encrypted storage ───────────────────

function buildMockApi() {
  const getMockData = (key) => getEncryptedItem(`mock_db_${key}`, []);
  const setMockData = (key, data) => setEncryptedItem(`mock_db_${key}`, data);

  window.api = {
    settings: {
      get: async (key) => {
        const val = await getEncryptedString(`mock_setting_${key}`);
        if (val !== null) return val;
        if (key === 'brand_title') return 'SHUBH JEWELLERS';
        return null;
      },
      set: async (key, val) => {
        await setEncryptedString(`mock_setting_${key}`, val);
        return { success: true };
      },
    },
    customers: {
      list: async () => {
        const customers = await getMockData('customers');
        const bills = await getMockData('bills');
        const decorated = customers.map((c) => {
          const unpaid = bills.filter(
            (b) => b.customerId === c.id && !b.isDeleted && b.status === 'UNPAID'
          );
          return {
            ...c,
            pendingBills: unpaid.length,
            pendingAmount: unpaid.reduce((sum, b) => sum + (b.grandTotal || 0), 0),
          };
        });
        return decorated;
      },
      add: async (customer) => {
        const list = await getMockData('customers');
        const newCustomer = {
          id: Date.now(),
          name: customer.name,
          whatsappNumber: customer.whatsappNumber,
          created_at: new Date().toISOString(),
        };
        list.push(newCustomer);
        await setMockData('customers', list);
        return { success: true, id: newCustomer.id };
      },
      remove: async (id) => {
        const list = await getMockData('customers');
        const filtered = list.filter((c) => c.id !== id);
        await setMockData('customers', filtered);
        return { success: true };
      },
    },
    products: {
      listMaster: async () => getMockData('products'),
      addMaster: async (name) => {
        const list = await getMockData('products');
        if (list.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
          return { success: false, error: 'Product already exists.' };
        }
        const newProduct = { id: Date.now(), name };
        list.push(newProduct);
        await setMockData('products', list);
        return { success: true, product: newProduct };
      },
    },
    bills: {
      list: async (filter) => {
        let list = (await getMockData('bills')).filter((b) => !b.isDeleted);
        if (filter && filter.customerId) {
          list = list.filter((b) => b.customerId === Number(filter.customerId));
        }
        return list;
      },
      get: async (id) => {
        const list = await getMockData('bills');
        const bill = list.find((b) => b.id === Number(id));
        return bill || null;
      },
      save: async (billData) => {
        const list = await getMockData('bills');
        const customers = await getMockData('customers');
        const cust = customers.find((c) => c.id === Number(billData.customerId));
        const customerName = cust ? cust.name : 'Unknown';

        const grandTotal = (billData.items || []).reduce(
          (sum, item) => sum + Number(item.value || 0) * Number(item.price || 0),
          0
        );

        let savedBill;
        if (billData.id) {
          const idx = list.findIndex((b) => b.id === Number(billData.id));
          if (idx !== -1) {
            list[idx] = {
              ...list[idx],
              customerId: Number(billData.customerId),
              customerName: customerName,
              billDate: billData.billDate || new Date().toISOString(),
              grandTotal: grandTotal,
              status: billData.status || 'UNPAID',
              notes: billData.notes,
              items: billData.items || [],
            };
            savedBill = list[idx];
          }
        } else {
          savedBill = {
            id: Date.now(),
            customerId: Number(billData.customerId),
            customerName: customerName,
            billDate: billData.billDate || new Date().toISOString(),
            grandTotal: grandTotal,
            status: billData.status || 'UNPAID',
            notes: billData.notes,
            isDeleted: false,
            items: billData.items || [],
            created_at: new Date().toISOString(),
          };
          list.push(savedBill);
        }
        await setMockData('bills', list);
        return { success: true, grandTotal: savedBill.grandTotal };
      },
      delete: async (id) => {
        const list = await getMockData('bills');
        const idx = list.findIndex((b) => b.id === Number(id));
        if (idx !== -1) {
          list[idx].isDeleted = true;
          await setMockData('bills', list);
        }
        return { success: true };
      },
      updateStatus: async (id, status) => {
        const list = await getMockData('bills');
        const idx = list.findIndex((b) => b.id === Number(id));
        if (idx !== -1) {
          list[idx].status = status;
          await setMockData('bills', list);
        }
        return { success: true };
      },
    },
    pdf: {
      open: () => Promise.resolve({ success: true }),
    },
    backup: {
      run: () => Promise.resolve({ success: true, filePath: '' }),
      restore: () => Promise.resolve({ success: true }),
      showInFolder: () => {},
    },
    whatsapp: {
      sendPendingBills: () =>
        Promise.resolve({
          success: true,
          note: 'Mock WhatsApp opened.',
          pdfPath: '/mock/path/bill.pdf',
        }),
    },
    expenses: {
      list: async (filter) => {
        const expenses = await getMockData('expenses');
        const employees = await getMockData('employees');
        let filtered = expenses.map((e) => {
          const emp = employees.find((x) => x.id === Number(e.employeeId));
          return { ...e, employeeName: emp ? emp.name : '' };
        });

        if (filter && filter.year) {
          if (filter.month) {
            const paddedMonth = String(filter.month).padStart(2, '0');
            const prefix = `${filter.year}-${paddedMonth}-`;
            filtered = filtered.filter((e) => e.date && e.date.startsWith(prefix));
          } else {
            const prefix = `${filter.year}-`;
            filtered = filtered.filter((e) => e.date && e.date.startsWith(prefix));
          }
        }

        filtered.sort((a, b) => {
          const dateDiff = new Date(b.date) - new Date(a.date);
          if (dateDiff !== 0) return dateDiff;
          return b.id - a.id;
        });

        return filtered;
      },
      add: async (expense) => {
        const list = await getMockData('expenses');
        const newExpense = {
          id: Date.now(),
          description: expense.description,
          amount: Number(expense.amount),
          type: expense.type,
          isSalary: expense.isSalary ? 1 : 0,
          employeeId: expense.isSalary ? Number(expense.employeeId) : null,
          date: expense.date,
          created_at: new Date().toISOString(),
        };
        list.push(newExpense);
        await setMockData('expenses', list);
        return { success: true };
      },
      delete: async (id) => {
        const list = await getMockData('expenses');
        const filtered = list.filter((e) => e.id !== id);
        await setMockData('expenses', filtered);
        return { success: true };
      },
      update: async (payload) => {
        const list = await getMockData('expenses');
        const idx = list.findIndex((e) => e.id === payload.id);
        if (idx === -1) return { success: false, error: 'Not found' };
        list[idx] = {
          ...list[idx],
          description: payload.description,
          amount: Number(payload.amount),
          type: payload.type,
          isSalary: payload.isSalary ? 1 : 0,
          employeeId: payload.isSalary ? Number(payload.employeeId) : null,
          date: payload.date,
        };
        await setMockData('expenses', list);
        return { success: true };
      },
    },
    employees: {
      list: async () => {
        const list = await getMockData('employees');
        list.sort((a, b) => a.name.localeCompare(b.name));
        return list;
      },
      add: async (name) => {
        const list = await getMockData('employees');
        if (list.some((emp) => emp.name.toLowerCase() === name.trim().toLowerCase())) {
          return { success: false, error: 'An employee with this name already exists.' };
        }
        const newEmployee = {
          id: Date.now(),
          name: name.trim(),
          created_at: new Date().toISOString(),
        };
        list.push(newEmployee);
        await setMockData('employees', list);
        return { success: true };
      },
    },
  };
}

// ── Bootstrap: init crypto → migrate → build API → render ───

async function bootstrap() {
  await initCryptoKey();

  if (typeof window !== 'undefined' && !window.api) {
    await migrateLegacyData();
    buildMockApi();
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ToastProvider>
        <App />
      </ToastProvider>
    </StrictMode>
  );
}

bootstrap();

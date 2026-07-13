import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import './styles/tokens.css';
import './styles/global.css';

if (typeof window !== 'undefined' && !window.api) {
  // Helper to read and write mock database tables in browser local storage
  const getMockData = (key) => {
    try {
      return JSON.parse(localStorage.getItem(`mock_db_${key}`) || '[]');
    } catch {
      return [];
    }
  };
  const setMockData = (key, data) => {
    localStorage.setItem(`mock_db_${key}`, JSON.stringify(data));
  };

  window.api = {
    settings: {
      get: (key) => {
        const val = localStorage.getItem(`mock_setting_${key}`);
        if (val !== null) return Promise.resolve(val);
        if (key === 'brand_title') return Promise.resolve('SHUBH JEWELLERS');
        return Promise.resolve(null);
      },
      set: (key, val) => {
        localStorage.setItem(`mock_setting_${key}`, String(val));
        return Promise.resolve({ success: true });
      },
    },
    customers: {
      list: () => {
        const customers = getMockData('customers');
        const bills = getMockData('bills');
        // Aggregate pending bills and amounts
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
        return Promise.resolve(decorated);
      },
      add: (customer) => {
        const list = getMockData('customers');
        const newCustomer = {
          id: Date.now(),
          name: customer.name,
          whatsappNumber: customer.whatsappNumber,
          created_at: new Date().toISOString(),
        };
        list.push(newCustomer);
        setMockData('customers', list);
        return Promise.resolve({ success: true, id: newCustomer.id });
      },
      remove: (id) => {
        const list = getMockData('customers');
        const filtered = list.filter((c) => c.id !== id);
        setMockData('customers', filtered);
        return Promise.resolve({ success: true });
      },
    },
    products: {
      listMaster: () => Promise.resolve(getMockData('products')),
      addMaster: (name) => {
        const list = getMockData('products');
        if (list.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
          return Promise.resolve({ success: false, error: 'Product already exists.' });
        }
        const newProduct = { id: Date.now(), name };
        list.push(newProduct);
        setMockData('products', list);
        return Promise.resolve({ success: true, product: newProduct });
      },
    },
    bills: {
      list: (filter) => {
        let list = getMockData('bills').filter((b) => !b.isDeleted);
        if (filter && filter.customerId) {
          list = list.filter((b) => b.customerId === Number(filter.customerId));
        }
        return Promise.resolve(list);
      },
      get: (id) => {
        const list = getMockData('bills');
        const bill = list.find((b) => b.id === Number(id));
        return Promise.resolve(bill || null);
      },
      save: (billData) => {
        const list = getMockData('bills');
        const customers = getMockData('customers');
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
        setMockData('bills', list);
        return Promise.resolve({ success: true, grandTotal: savedBill.grandTotal });
      },
      delete: (id) => {
        const list = getMockData('bills');
        const idx = list.findIndex((b) => b.id === Number(id));
        if (idx !== -1) {
          list[idx].isDeleted = true;
          setMockData('bills', list);
        }
        return Promise.resolve({ success: true });
      },
      updateStatus: (id, status) => {
        const list = getMockData('bills');
        const idx = list.findIndex((b) => b.id === Number(id));
        if (idx !== -1) {
          list[idx].status = status;
          setMockData('bills', list);
        }
        return Promise.resolve({ success: true });
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
      list: (filter) => {
        const expenses = getMockData('expenses');
        const employees = getMockData('employees');
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

        return Promise.resolve(filtered);
      },
      add: (expense) => {
        const list = getMockData('expenses');
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
        setMockData('expenses', list);
        return Promise.resolve({ success: true });
      },
      delete: (id) => {
        const list = getMockData('expenses');
        const filtered = list.filter((e) => e.id !== id);
        setMockData('expenses', filtered);
        return Promise.resolve({ success: true });
      },
      update: (payload) => {
        const list = getMockData('expenses');
        const idx = list.findIndex((e) => e.id === payload.id);
        if (idx === -1) return Promise.resolve({ success: false, error: 'Not found' });
        list[idx] = {
          ...list[idx],
          description: payload.description,
          amount: Number(payload.amount),
          type: payload.type,
          isSalary: payload.isSalary ? 1 : 0,
          employeeId: payload.isSalary ? Number(payload.employeeId) : null,
          date: payload.date,
        };
        setMockData('expenses', list);
        return Promise.resolve({ success: true });
      },
    },
    employees: {
      list: () => {
        const list = getMockData('employees');
        list.sort((a, b) => a.name.localeCompare(b.name));
        return Promise.resolve(list);
      },
      add: (name) => {
        const list = getMockData('employees');
        if (list.some((emp) => emp.name.toLowerCase() === name.trim().toLowerCase())) {
          return Promise.resolve({ success: false, error: 'An employee with this name already exists.' });
        }
        const newEmployee = {
          id: Date.now(),
          name: name.trim(),
          created_at: new Date().toISOString(),
        };
        list.push(newEmployee);
        setMockData('employees', list);
        return Promise.resolve({ success: true });
      },
    },
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);

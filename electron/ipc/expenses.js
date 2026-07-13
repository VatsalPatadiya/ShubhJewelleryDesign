const { ipcMain } = require('electron');
const { getDb } = require('../db/database');
const { isPositiveNumber } = require('../utils/validate');

function register() {
  // Expenses IPC Handlers
  ipcMain.handle('expenses:list', (_event, filter) => {
    const db = getDb();
    let query = `
      SELECT e.id, e.description, e.amount, e.type, e.is_salary AS isSalary, e.employee_id AS employeeId, emp.name AS employeeName, e.date
      FROM expenses e
      LEFT JOIN employees emp ON emp.id = e.employee_id
    `;
    const clauses = [];
    const params = [];

    if (filter && filter.year) {
      if (filter.month) {
        const paddedMonth = String(filter.month).padStart(2, '0');
        clauses.push("e.date LIKE ?");
        params.push(`${filter.year}-${paddedMonth}-%`);
      } else {
        clauses.push("e.date LIKE ?");
        params.push(`${filter.year}-%`);
      }
    }

    if (clauses.length > 0) {
      query += ` WHERE ${clauses.join(' AND ')}`;
    }

    query += ` ORDER BY e.date DESC, e.id DESC`;
    return db.prepare(query).all(...params);
  });

  ipcMain.handle('expenses:add', async (_event, payload) => {
    const db = getDb();
    const { description, amount, type, isSalary, employeeId, date } = payload || {};

    if (!description || !description.trim()) {
      return { success: false, error: 'Description is required.' };
    }
    if (!isPositiveNumber(amount)) {
      return { success: false, error: 'Amount must be greater than 0.' };
    }
    if (!['CREDIT', 'DEBIT'].includes(type)) {
      return { success: false, error: 'Type must be CREDIT or DEBIT.' };
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { success: false, error: 'Valid date (YYYY-MM-DD) is required.' };
    }

    if (isSalary) {
      if (!employeeId) {
        return { success: false, error: 'Employee is required for salary expenses.' };
      }
      const emp = db.prepare('SELECT id FROM employees WHERE id = ?').get(employeeId);
      if (!emp) {
        return { success: false, error: 'Selected employee does not exist.' };
      }
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO expenses (description, amount, type, is_salary, employee_id, date)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        description.trim(),
        Number(amount),
        type,
        isSalary ? 1 : 0,
        isSalary ? Number(employeeId) : null,
        date
      );
      return { success: true };
    } catch (err) {
      console.error('Failed to add expense:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('expenses:delete', (_event, id) => {
    const db = getDb();
    try {
      db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
      return { success: true };
    } catch (err) {
      console.error('Failed to delete expense:', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('expenses:update', (_event, payload) => {
    const db = getDb();
    const { id, description, amount, type, isSalary, employeeId, date } = payload || {};

    if (!id) return { success: false, error: 'Expense ID is required.' };
    if (!description || !description.trim()) return { success: false, error: 'Description is required.' };
    if (!isPositiveNumber(amount)) return { success: false, error: 'Amount must be greater than 0.' };
    if (!['CREDIT', 'DEBIT'].includes(type)) return { success: false, error: 'Type must be CREDIT or DEBIT.' };
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false, error: 'Valid date (YYYY-MM-DD) is required.' };

    if (isSalary && !employeeId) {
      return { success: false, error: 'Employee is required for salary expenses.' };
    }

    try {
      db.prepare(`
        UPDATE expenses SET description = ?, amount = ?, type = ?, is_salary = ?, employee_id = ?, date = ?
        WHERE id = ?
      `).run(
        description.trim(),
        Number(amount),
        type,
        isSalary ? 1 : 0,
        isSalary ? Number(employeeId) : null,
        date,
        id
      );
      return { success: true };
    } catch (err) {
      console.error('Failed to update expense:', err);
      return { success: false, error: err.message };
    }
  });

  // Employees IPC Handlers
  ipcMain.handle('employees:list', (_event) => {
    const db = getDb();
    return db.prepare('SELECT id, name, created_at FROM employees ORDER BY name ASC').all();
  });

  ipcMain.handle('employees:add', async (_event, name) => {
    const db = getDb();
    if (!name || !name.trim()) {
      return { success: false, error: 'Employee name is required.' };
    }

    try {
      const check = db.prepare('SELECT id FROM employees WHERE LOWER(name) = LOWER(?)').get(name.trim());
      if (check) {
        return { success: false, error: 'An employee with this name already exists.' };
      }

      db.prepare('INSERT INTO employees (name) VALUES (?)').run(name.trim());
      return { success: true };
    } catch (err) {
      console.error('Failed to add employee:', err);
      return { success: false, error: err.message };
    }
  });
}

module.exports = register;

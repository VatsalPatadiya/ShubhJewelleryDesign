import { useEffect, useState } from 'react';
import Modal from '../components/Modal.jsx';
import { formatCurrency, formatDate } from '../config.js';
import { useToast } from '../context/ToastContext.jsx';
import { ChevronIcon, EditIcon, TrashIcon } from '../components/icons/NavIcons.jsx';
import CustomSelect from '../components/CustomSelect.jsx';

const MONTHS_LIST = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function ExpensesTab() {
  const [employees, setEmployees] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const { showToast } = useToast();

  // Add Expense form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState('DEBIT');
  const [isSalary, setIsSalary] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');

  // Fetch unique years from expense logs to populate filter dropdown (minimum current year)
  const [availableYears, setAvailableYears] = useState([new Date().getFullYear()]);

  async function loadData() {
    try {
      const [empList, expList] = await Promise.all([
        window.api.employees.list(),
        window.api.expenses.list({ year: filterYear, month: filterMonth === 'ALL' ? null : filterMonth })
      ]);
      setEmployees(empList);
      setExpenses(expList);

      // Re-fetch all expenses to determine unique years for filter
      const allExpenses = await window.api.expenses.list();
      const years = new Set([new Date().getFullYear()]);
      allExpenses.forEach(e => {
        if (e.date) {
          const yr = parseInt(e.date.split('-')[0], 10);
          if (!isNaN(yr)) years.add(yr);
        }
      });
      setAvailableYears(Array.from(years).sort((a, b) => b - a));
    } catch (err) {
      console.error('Failed to load expense data:', err);
    }
  }

  useEffect(() => {
    loadData();
  }, [filterYear, filterMonth]);

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  async function handleAddEmployee() {
    if (!newEmployeeName.trim()) {
      showToast('Employee name is required.', 'error');
      return;
    }
    const res = await window.api.employees.add(newEmployeeName.trim());
    if (res.success) {
      showToast('Employee added successfully.', 'success');
      setNewEmployeeName('');
      setShowAddEmployee(false);
      loadData();
    } else {
      showToast(res.error || 'Failed to add employee.', 'error');
    }
  }

  async function handleAddExpense() {
    if (!description.trim()) {
      showToast('Description is required.', 'error');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      showToast('Please enter a valid amount.', 'error');
      return;
    }
    if (isSalary && !employeeId) {
      showToast('Please select an employee.', 'error');
      return;
    }

    const payload = {
      description: description.trim(),
      amount: Number(amount),
      type,
      isSalary,
      employeeId: isSalary ? Number(employeeId) : null,
      date
    };

    let res;
    if (editingExpense) {
      res = await window.api.expenses.update({ ...payload, id: editingExpense.id });
    } else {
      res = await window.api.expenses.add(payload);
    }
    if (res.success) {
      showToast(editingExpense ? 'Expense updated successfully.' : 'Expense added successfully.', 'success');
      resetExpenseForm();
      loadData();
    } else {
      showToast(res.error || 'Failed to save expense.', 'error');
    }
  }

  function resetExpenseForm() {
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setType('DEBIT');
    setIsSalary(false);
    setEmployeeId('');
    setShowAddExpense(false);
    setEditingExpense(null);
  }

  function handleEditExpense(item) {
    setEditingExpense(item);
    setDescription(item.description);
    setAmount(String(item.amount));
    setDate(item.date);
    setType(item.type);
    setIsSalary(item.isSalary === 1);
    setEmployeeId(item.employeeId ? String(item.employeeId) : '');
    setShowAddExpense(true);
  }

  async function handleDeleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
      const res = await window.api.expenses.delete(id);
      if (res.success) {
        showToast('Expense deleted.', 'success');
        loadData();
      } else {
        showToast(res.error || 'Failed to delete expense.', 'error');
      }
    }
  }

  // Render collapsible dates listing under a given month or filter month
  function renderDatesList(monthIndex, year) {
    // Filter expenses matching this month
    const targetMonthPadded = String(monthIndex + 1).padStart(2, '0');
    const prefix = `${year}-${targetMonthPadded}-`;
    const monthExpenses = expenses.filter(e => e.date && e.date.startsWith(prefix));

    if (monthExpenses.length === 0) {
      return <p className="helper-text" style={{ padding: '8px 12px' }}>No entries found for this month.</p>;
    }

    // Group expenses by date
    const groupedByDate = {};
    monthExpenses.forEach(e => {
      if (!groupedByDate[e.date]) groupedByDate[e.date] = [];
      groupedByDate[e.date].push(e);
    });

    const dates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

    return dates.map(dateStr => {
      const items = groupedByDate[dateStr];
      const dateKey = `date-${dateStr}`;
      const isDateOpen = expandedGroups.has(dateKey);

      const dateCredit = items.filter(e => e.type === 'CREDIT').reduce((sum, e) => sum + e.amount, 0);
      const dateDebit = items.filter(e => e.type === 'DEBIT').reduce((sum, e) => sum + e.amount, 0);

      return (
        <div key={dateStr} className="collapse-group" style={{ marginTop: '8px' }}>
          <div className="collapse-header" onClick={() => toggleGroup(dateKey)} style={{ padding: '8px 12px', fontSize: 13, background: 'var(--surface-sunken)' }}>
            <div className="collapse-header-title">
              <span className={`collapse-icon ${isDateOpen ? 'open' : ''}`}>
                <ChevronIcon size={14} direction="left" />
              </span>
              <span>{formatDate(dateStr)}</span>
            </div>
            <div className="collapse-header-info">
              {(dateCredit > 0 || dateDebit > 0) && (
                <span style={{ fontWeight: '700', color: (dateCredit - dateDebit) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {formatCurrency(Math.abs(dateCredit - dateDebit))}
                </span>
              )}
              <span className="caption">({items.length} items)</span>
            </div>
          </div>

          {isDateOpen && (
            <div className="collapse-content">
              <table className="data-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th className="tabular-nums">Amount</th>
                    <th style={{ width: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div>{item.description}</div>
                        {item.employeeName && (
                          <div className="caption" style={{ color: 'var(--text-secondary)' }}>
                            Employee: <strong>{item.employeeName}</strong>
                          </div>
                        )}
                      </td>
                      <td>
                        {item.isSalary === 1 ? (
                          <span className="expense-badge salary">Salary</span>
                        ) : (
                          <span className="caption">Expense</span>
                        )}
                      </td>
                      <td>
                        <span className={`expense-badge ${item.type === 'CREDIT' ? 'credit' : 'debit'}`}>
                          {item.type === 'CREDIT' ? 'Credited' : 'Debited'}
                        </span>
                      </td>
                      <td className="tabular-nums font-semibold" style={{ color: item.type === 'CREDIT' ? 'var(--success)' : 'var(--text-primary)' }}>
                        {item.type === 'CREDIT' ? '+' : '-'} {formatCurrency(item.amount)}
                      </td>
                      <td className="td-right">
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            className="icon-btn"
                            title="Edit"
                            onClick={() => handleEditExpense(item)}
                            style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s ease' }}
                          >
                            <EditIcon size={14} />
                          </button>
                          <button
                            className="icon-btn"
                            title="Delete"
                            onClick={() => handleDeleteExpense(item.id)}
                            style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--danger-soft)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--danger)', transition: 'all 0.15s ease' }}
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    });
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Manage Expenses</h1>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={() => setShowAddEmployee(true)}>Add Employee</button>
          <button className="btn btn-primary" onClick={() => setShowAddExpense(true)}>Add Expense</button>
        </div>
      </div>

      <div className="surface section-block expenses-filters" style={{ padding: '16px' }}>
        <div className="field-inline" style={{ flex: 1 }}>
          <label htmlFor="filter-year">Year</label>
          <CustomSelect
            id="filter-year"
            value={filterYear}
            onChange={(val) => {
              setFilterYear(Number(val));
              setExpandedGroups(new Set());
            }}
            options={availableYears}
          />
        </div>

        <div className="field-inline" style={{ flex: 1 }}>
          <label htmlFor="filter-month">Month</label>
          <CustomSelect
            id="filter-month"
            value={filterMonth}
            onChange={(val) => {
              setFilterMonth(val);
              setExpandedGroups(new Set());
            }}
            options={[
              { value: 'ALL', label: 'All Months' },
              ...MONTHS_LIST.map((m, idx) => ({ value: idx + 1, label: m }))
            ]}
          />
        </div>
      </div>

      {/* Collapsible content section */}
      <div style={{ marginTop: 24 }}>
        {filterMonth === 'ALL' ? (
          // If All Months is selected, show 12 month collapsible blocks
          MONTHS_LIST.map((m, idx) => {
            const monthNum = idx + 1;
            const targetMonthPadded = String(monthNum).padStart(2, '0');
            const prefix = `${filterYear}-${targetMonthPadded}-`;
            const monthExpenses = expenses.filter(e => e.date && e.date.startsWith(prefix));

            // Calculate totals
            const monthCredit = monthExpenses.filter(e => e.type === 'CREDIT').reduce((sum, e) => sum + e.amount, 0);
            const monthDebit = monthExpenses.filter(e => e.type === 'DEBIT').reduce((sum, e) => sum + e.amount, 0);

            const monthKey = `month-${filterYear}-${monthNum}`;
            const isMonthOpen = expandedGroups.has(monthKey);

            return (
              <div key={m} className="collapse-group">
                <div className="collapse-header" onClick={() => toggleGroup(monthKey)}>
                  <div className="collapse-header-title">
                    <span className={`collapse-icon ${isMonthOpen ? 'open' : ''}`}>
                      <ChevronIcon size={16} direction="left" />
                    </span>
                    <span>{m} {filterYear}</span>
                  </div>
                  <div className="collapse-header-info">
                    {(monthCredit > 0 || monthDebit > 0) && (
                      <span style={{ fontWeight: '700', color: (monthCredit - monthDebit) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {(monthCredit - monthDebit) >= 0 ? '+ ' : '- '}{formatCurrency(Math.abs(monthCredit - monthDebit))}
                      </span>
                    )}
                    <span className="caption">({monthExpenses.length} entries)</span>
                  </div>
                </div>

                {isMonthOpen && (
                  <div className="collapse-content nested">
                    {renderDatesList(idx, filterYear)}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          // If a specific month is selected, list only the dates directly
          (() => {
            const targetMonthPadded = String(filterMonth).padStart(2, '0');
            const prefix = `${filterYear}-${targetMonthPadded}-`;
            const monthExpenses = expenses.filter(e => e.date && e.date.startsWith(prefix));
            const monthCredit = monthExpenses.filter(e => e.type === 'CREDIT').reduce((sum, e) => sum + e.amount, 0);
            const monthDebit = monthExpenses.filter(e => e.type === 'DEBIT').reduce((sum, e) => sum + e.amount, 0);
            const monthNet = monthCredit - monthDebit;

            return (
              <div className="surface section-block" style={{ padding: '16px var(--space-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="backup-card-title" style={{ margin: 0 }}>
                    {MONTHS_LIST[Number(filterMonth) - 1]} {filterYear} Entries
                  </h3>
                  {(monthCredit > 0 || monthDebit > 0) && (
                    <span style={{ fontWeight: '700', fontSize: '16px', color: monthNet >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {formatCurrency(Math.abs(monthNet))}
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 16 }}>
                  {renderDatesList(Number(filterMonth) - 1, filterYear)}
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* Add Employee Dialog Modal */}
      {showAddEmployee && (
        <Modal
          title="Add Employee"
          onClose={() => setShowAddEmployee(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowAddEmployee(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddEmployee}>Save Employee</button>
            </>
          }
        >
          <div className="field">
            <label htmlFor="employee-name-input">Employee Name</label>
            <input
              id="employee-name-input"
              type="text"
              placeholder="e.g. John Doe"
              value={newEmployeeName}
              onChange={(e) => setNewEmployeeName(e.target.value)}
              style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
            />
          </div>
        </Modal>
      )}

      {/* Add Expense Dialog Modal */}
      {showAddExpense && (
        <Modal
          title={editingExpense ? "Edit Expense" : "Add Expense"}
          onClose={resetExpenseForm}
          footer={
            <>
              <button className="btn btn-ghost" onClick={resetExpenseForm}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddExpense}>{editingExpense ? 'Update Expense' : 'Save Expense'}</button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="field">
              <label htmlFor="expense-desc-input">Description</label>
              <input
                id="expense-desc-input"
                type="text"
                placeholder="e.g. Shop Rent, Office Stationery"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="expense-amount-input">Amount</label>
                <input
                  id="expense-amount-input"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                />
              </div>

              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="expense-date-input">Date</label>
                <input
                  id="expense-date-input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
                />
              </div>
            </div>

            <div className="field">
              <label>Transaction Type</label>
              <div className="radio-group" style={{ height: 'auto', marginTop: '4px' }}>
                <label>
                  <input
                    type="radio"
                    name="expense-type"
                    checked={type === 'DEBIT'}
                    onChange={() => setType('DEBIT')}
                  />
                  Debited (Expense)
                </label>
                <label>
                  <input
                    type="radio"
                    name="expense-type"
                    checked={type === 'CREDIT'}
                    onChange={() => setType('CREDIT')}
                  />
                  Credited (Income/Return)
                </label>
              </div>
            </div>

            <div className="field">
              <label className="custom-checkbox-label">
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={isSalary}
                  onChange={(e) => setIsSalary(e.target.checked)}
                />
                Is it salary?
              </label>
            </div>

            {isSalary && (
              <div className="field">
                <label htmlFor="expense-employee-select">Select Employee (Compulsory)</label>
                {employees.length === 0 ? (
                  <p className="helper-text text-danger" style={{ color: 'var(--danger)' }}>
                    No employees added yet. Add an employee first.
                  </p>
                ) : (
                  <CustomSelect
                    id="expense-employee-select"
                    value={employeeId}
                    onChange={(val) => setEmployeeId(val)}
                    options={[
                      { value: '', label: '-- Choose Employee --' },
                      ...employees.map(emp => ({ value: emp.id, label: emp.name }))
                    ]}
                  />
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

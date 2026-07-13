import { useEffect, useMemo, useState } from 'react';
import Select from 'react-select';
import ProductRow from '../components/ProductRow.jsx';
import { formatCurrency } from '../config.js';
import { useToast } from '../context/ToastContext.jsx';

let nextRowId = 1;
function emptyRow() {
  return { id: nextRowId++, productName: '', mode: 'GRAM', value: '', price: '', notes: '' };
}

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 42,
    borderRadius: 8,
    borderColor: state.isFocused ? 'var(--accent)' : 'var(--border)',
    boxShadow: state.isFocused ? '0 0 0 3px var(--accent-ring)' : 'none',
    fontSize: 14,
    fontFamily: 'var(--font-sans)',
    backgroundColor: 'var(--surface)',
    '&:hover': {
      borderColor: state.isFocused ? 'var(--accent)' : 'var(--border-strong)',
    },
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'var(--accent)'
      : state.isFocused
      ? 'var(--accent-soft)'
      : 'transparent',
    color: state.isSelected ? 'var(--text-on-accent)' : 'var(--text-primary)',
    fontWeight: state.isSelected ? 600 : 400,
    fontSize: 14,
    fontFamily: 'var(--font-sans)',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: 'var(--accent-soft)',
    },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--border)',
    marginTop: 6,
  }),
  menuList: (base) => ({
    ...base,
    padding: 0,
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--text-tertiary)',
    fontSize: 14,
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--text-primary)',
    fontSize: 14,
  }),
  input: (base) => ({
    ...base,
    color: 'var(--text-primary)',
    fontSize: 14,
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? 'var(--accent)' : 'var(--text-tertiary)',
    '&:hover': {
      color: 'var(--accent)',
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'var(--text-tertiary)',
    '&:hover': {
      color: 'var(--danger)',
    },
  }),
};

export default function ProductsBillingTab({ editingBillId, onSaved, onCancelEdit }) {
  const [customers, setCustomers] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [customerId, setCustomerId] = useState(null);
  const [rows, setRows] = useState([emptyRow()]);
  const [billNotes, setBillNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  async function loadData() {
    const [customerRows, products] = await Promise.all([
      window.api.customers.list(),
      window.api.products.listMaster(),
    ]);
    setCustomers(customerRows);
    setProductOptions(products.map((p) => p.name));
  }

  useEffect(() => {
    loadData();
    if (editingBillId) {
      window.api.bills.get(editingBillId).then((bill) => {
        if (bill) {
          setCustomerId(bill.customerId);
          setBillNotes(bill.notes || '');
          setRows(bill.items.map((item) => ({
            id: nextRowId++,
            productName: item.productName,
            mode: item.mode,
            value: String(item.value),
            price: String(item.price),
            notes: item.notes || '',
          })));
        }
      });
    } else {
      resetForm();
    }
  }, [editingBillId]);

  const customerOptions = useMemo(
    () => customers.map((c) => ({ value: c.id, label: c.name })),
    [customers]
  );

  const grandTotal = rows.reduce((sum, r) => sum + (Number(r.value) || 0) * (Number(r.price) || 0), 0);

  function updateRow(rowId, patch) {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch } : r)));
  }

  function removeRow(rowId) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== rowId) : prev));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  async function handleCreateProduct(name) {
    const result = await window.api.products.addMaster(name);
    if (result.success) {
      setProductOptions((prev) => (prev.includes(result.product.name) ? prev : [...prev, result.product.name].sort()));
    }
  }

  function resetForm() {
    setCustomerId(null);
    setRows([emptyRow()]);
    setBillNotes('');
  }

  async function handleSaveBill() {
    if (!customerId) {
      showToast('Please select a customer.', 'error');
      return;
    }
    const invalidRow = rows.find(
      (r) => !r.productName.trim() || !(Number(r.value) > 0) || !(Number(r.price) > 0)
    );
    if (invalidRow) {
      showToast('Every row needs a product, and value/price greater than 0.', 'error');
      return;
    }

    setSaving(true);
    const result = await window.api.bills.save({
      id: editingBillId,
      customerId,
      notes: billNotes.trim(),
      items: rows.map((r) => ({
        productName: r.productName.trim(),
        mode: r.mode,
        value: Number(r.value),
        price: Number(r.price),
        notes: (r.notes || '').trim(),
      })),
    });
    setSaving(false);

    if (!result.success) {
      showToast(result.error || 'Could not save bill.', 'error');
      return;
    }

    showToast(editingBillId ? 'Bill updated successfully.' : `Bill saved — grand total ${formatCurrency(result.grandTotal)}.`, 'success');
    resetForm();
    loadData();
    onSaved?.();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{editingBillId ? 'Edit Bill' : 'Billing'}</h1>
      </div>

      <div className="section-block billing-customer-select">
        <div className="field">
          <label>Customer</label>
          <Select
            styles={selectStyles}
            options={customerOptions}
            value={customerOptions.find((o) => o.value === customerId) || null}
            onChange={(opt) => setCustomerId(opt ? opt.value : null)}
            placeholder="Search customer…"
            isClearable
          />
        </div>
      </div>

      <div className="surface billing-products-surface">
        {rows.map((row) => (
          <ProductRow
            key={row.id}
            row={row}
            productOptions={productOptions}
            onChange={updateRow}
            onRemove={removeRow}
            onCreateProduct={handleCreateProduct}
            canRemove={rows.length > 1}
          />
        ))}
      </div>

      <button className="btn btn-ghost billing-add-row-btn" onClick={addRow}>
        + Add Product
      </button>

      <div className="grand-total-bar">
        <span className="label">Grand Total</span>
        <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
      </div>

      <div className="field" style={{ marginTop: '1.5rem', marginBottom: '1.5rem', maxWidth: '420px' }}>
        <label htmlFor="bill-notes">Bill Notes</label>
        <textarea
          id="bill-notes"
          rows={3}
          placeholder="Optional notes for this bill…"
          value={billNotes}
          onChange={(e) => setBillNotes(e.target.value)}
          style={{ width: '100%', resize: 'vertical', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="btn btn-primary" onClick={handleSaveBill} disabled={saving}>
          {saving ? 'Saving…' : (editingBillId ? 'Update Bill' : 'Save Bill')}
        </button>
        {editingBillId && (
          <button className="btn btn-ghost" onClick={onCancelEdit} disabled={saving}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

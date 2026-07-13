import { useEffect, useState } from 'react';
import BillsTable from '../components/BillsTable.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import CustomSelect from '../components/CustomSelect.jsx';

export default function BillsTab({ initialCustomerId, onFilterConsumed, onEditBill }) {
  const [customers, setCustomers] = useState([]);
  const [bills, setBills] = useState([]);
  const [customerId, setCustomerId] = useState(initialCustomerId || '');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [billToDelete, setBillToDelete] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    window.api.customers.list().then(setCustomers);
  }, []);

  useEffect(() => {
    if (initialCustomerId) {
      setCustomerId(initialCustomerId);
      onFilterConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCustomerId]);

  async function refresh() {
    setLoading(true);
    const rows = await window.api.bills.list({
      customerId: customerId || null,
      status,
    });
    setBills(rows);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, status]);

  async function handleToggleStatus(bill) {
    const nextStatus = bill.status === 'PAID' ? 'UNPAID' : 'PAID';
    await window.api.bills.updateStatus(bill.id, nextStatus);
    setBills((prev) => prev.map((b) => (b.id === bill.id ? { ...b, status: nextStatus } : b)));
  }

  async function handleViewPdf(pdfPath) {
    const result = await window.api.pdf.open(pdfPath);
    if (!result.success) {
      showToast(result.error || 'Could not open PDF.', 'error');
    }
  }

  async function handleDeleteConfirmed() {
    if (!billToDelete) return;
    const result = await window.api.bills.delete(billToDelete);
    setBillToDelete(null);
    if (result && result.success) {
      showToast('Bill deleted successfully.', 'success');
      refresh();
    } else {
      showToast('Failed to delete bill.', 'error');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Bills</h1>
      </div>

      <div className="filter-bar">
        <CustomSelect
          value={customerId}
          onChange={setCustomerId}
          options={[
            { value: '', label: 'All Customers' },
            ...customers.map((c) => ({ value: c.id, label: c.name }))
          ]}
        />
        <CustomSelect
          value={status}
          onChange={setStatus}
          options={[
            { value: 'ALL', label: 'All' },
            { value: 'UNPAID', label: 'Unpaid' },
            { value: 'PAID', label: 'Paid' }
          ]}
        />
      </div>

      {!loading && bills.length === 0 && (
        <div className="empty-state">
          <p>No bills yet.</p>
        </div>
      )}

      <BillsTable
        bills={bills}
        onToggleStatus={handleToggleStatus}
        onViewPdf={handleViewPdf}
        onEdit={onEditBill}
        onDelete={(id) => setBillToDelete(id)}
      />

      {billToDelete && (
        <Modal
          title="Delete Bill?"
          onClose={() => setBillToDelete(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setBillToDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteConfirmed}>Delete</button>
            </>
          }
        >
          <p>
            Are you sure you want to delete this bill? This will soft delete the bill, so it will no longer count towards pending totals or show up in active lists. This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

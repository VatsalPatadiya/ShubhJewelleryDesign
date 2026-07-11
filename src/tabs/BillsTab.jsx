import { useEffect, useState } from 'react';
import BillsTable from '../components/BillsTable.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function BillsTab({ initialCustomerId, onFilterConsumed }) {
  const [customers, setCustomers] = useState([]);
  const [bills, setBills] = useState([]);
  const [customerId, setCustomerId] = useState(initialCustomerId || '');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Bills</h1>
      </div>

      <div className="filter-bar">
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">All Customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ALL">All</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PAID">Paid</option>
        </select>
      </div>

      {!loading && bills.length === 0 && (
        <div className="empty-state">
          <p>No bills yet.</p>
        </div>
      )}

      <BillsTable bills={bills} onToggleStatus={handleToggleStatus} onViewPdf={handleViewPdf} />
    </div>
  );
}

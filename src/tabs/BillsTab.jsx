import { useEffect, useState } from 'react';
import BillsTable from '../components/BillsTable.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import CustomSelect from '../components/CustomSelect.jsx';
import { formatCurrency } from '../config.js';

export default function BillsTab({ initialCustomerId, onFilterConsumed, onEditBill }) {
  const [customers, setCustomers] = useState([]);
  const [bills, setBills] = useState([]);
  const [customerId, setCustomerId] = useState(initialCustomerId || '');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [billToDelete, setBillToDelete] = useState(null);
  const [billToSettle, setBillToSettle] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleError, setSettleError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [chequeNumber, setChequeNumber] = useState('');
  const [settlementNotes, setSettlementNotes] = useState('');

  const [settlementToEdit, setSettlementToEdit] = useState(null);
  const [editSettlementAmount, setEditSettlementAmount] = useState('');
  const [editSettlementError, setEditSettlementError] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('CASH');
  const [editChequeNumber, setEditChequeNumber] = useState('');
  const [editSettlementNotes, setEditSettlementNotes] = useState('');

  const [settlementToDelete, setSettlementToDelete] = useState(null);
  const [billForSettlementAction, setBillForSettlementAction] = useState(null);
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

  useEffect(() => {
    if (billToSettle) {
      setSettleAmount('');
      setSettleError('');
      setPaymentMethod('CASH');
      setChequeNumber('');
      setSettlementNotes('');
    }
  }, [billToSettle]);

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

  async function handleSettleSubmit(e) {
    if (e) e.preventDefault();
    if (!billToSettle) return;
    const amountNum = settleAmount === '' ? 0 : Number(settleAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      setSettleError('Please enter a valid positive number.');
      return;
    }
    const remaining = billToSettle.grandTotal - (billToSettle.paidAmount || 0);
    if (amountNum > remaining) {
      setSettleError(`Payment amount cannot exceed Remaining Balance of ${formatCurrency(remaining)}.`);
      return;
    }
    
    const result = await window.api.bills.updatePaidAmount(
      billToSettle.id, 
      amountNum, 
      paymentMethod, 
      paymentMethod === 'CHEQUE' ? chequeNumber : null, 
      paymentMethod === 'OTHER' ? settlementNotes : null
    );
    if (result && result.success) {
      showToast('Bill settlement updated successfully.', 'success');
      setBillToSettle(null);
      refresh();
    } else {
      showToast(result.error || 'Failed to update settlement.', 'error');
    }
  }

  async function handleEditSettlementSubmit(e) {
    if (e) e.preventDefault();
    if (!settlementToEdit || !billForSettlementAction) return;
    const amountNum = editSettlementAmount === '' ? 0 : Number(editSettlementAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      setEditSettlementError('Please enter a valid positive number.');
      return;
    }
    const otherPaymentsSum = (billForSettlementAction.paidAmount || 0) - settlementToEdit.amount;
    const remaining = billForSettlementAction.grandTotal - otherPaymentsSum;
    if (amountNum > remaining) {
      setEditSettlementError(`Payment amount cannot exceed Remaining Balance of ${formatCurrency(remaining)}.`);
      return;
    }

    const result = await window.api.bills.updateSettlement(
      settlementToEdit.id, 
      amountNum, 
      editPaymentMethod, 
      editPaymentMethod === 'CHEQUE' ? editChequeNumber : null, 
      editPaymentMethod === 'OTHER' ? editSettlementNotes : null
    );
    if (result && result.success) {
      showToast('Payment updated successfully.', 'success');
      setSettlementToEdit(null);
      setBillForSettlementAction(null);
      refresh();
    } else {
      showToast(result.error || 'Failed to update payment.', 'error');
    }
  }

  async function handleDeleteSettlementConfirmed() {
    if (!settlementToDelete) return;
    const result = await window.api.bills.deleteSettlement(settlementToDelete.id);
    if (result && result.success) {
      showToast('Payment deleted successfully.', 'success');
      setSettlementToDelete(null);
      setBillForSettlementAction(null);
      refresh();
    } else {
      showToast(result.error || 'Failed to delete payment.', 'error');
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
        onSettle={setBillToSettle}
        onEditSettlement={(s, b) => {
          setSettlementToEdit(s);
          setBillForSettlementAction(b);
          setEditSettlementAmount(String(s.amount));
          setEditSettlementError('');
          setEditPaymentMethod(s.paymentMethod || s.payment_method || 'CASH');
          setEditChequeNumber(s.chequeNumber || s.cheque_number || '');
          setEditSettlementNotes(s.notes || '');
        }}
        onDeleteSettlement={(s, b) => {
          setSettlementToDelete(s);
          setBillForSettlementAction(b);
        }}
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

      {billToSettle && (
        <Modal
          title={`Settle Bill - ${billToSettle.customerName}`}
          onClose={() => setBillToSettle(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setBillToSettle(null)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                onClick={handleSettleSubmit}
                disabled={!!settleError}
              >
                Save Settlement
              </button>
            </>
          }
        >
          <form onSubmit={handleSettleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="text-secondary" style={{ fontSize: '12px' }}>Bill Date</span>
                <div style={{ fontWeight: '500', marginTop: '4px' }}>
                  {new Date(billToSettle.billDate).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="text-secondary" style={{ fontSize: '12px' }}>Grand Total</span>
                <div style={{ fontWeight: '500', marginTop: '4px', color: 'var(--primary)' }}>
                  {formatCurrency(billToSettle.grandTotal)}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span className="text-secondary" style={{ fontSize: '12px' }}>Already Paid</span>
                <div style={{ fontWeight: '500', marginTop: '4px' }}>
                  {formatCurrency(billToSettle.paidAmount || 0)}
                </div>
              </div>
              <div>
                <span className="text-secondary" style={{ fontSize: '12px' }}>Remaining Balance</span>
                <div style={{ fontWeight: '500', marginTop: '4px', color: 'var(--danger)' }}>
                  {formatCurrency(Math.max(0, billToSettle.grandTotal - (billToSettle.paidAmount || 0)))}
                </div>
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="settle-amount-input" style={{ fontWeight: '500' }}>Payment Amount</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  id="settle-amount-input"
                  type="number"
                  step="any"
                  className="form-control"
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  value={settleAmount}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (/^0[0-9]/.test(val)) {
                      val = val.substring(1);
                    }
                    setSettleAmount(val);
                    const num = Number(val);
                    const remaining = billToSettle.grandTotal - (billToSettle.paidAmount || 0);
                    if (val === '') {
                      setSettleError('');
                    } else if (isNaN(num) || num < 0) {
                      setSettleError('Payment amount cannot be negative.');
                    } else if (num > remaining) {
                      setSettleError(`Payment amount cannot exceed Remaining Balance of ${formatCurrency(remaining)}`);
                    } else {
                      setSettleError('');
                    }
                  }}
                  autoFocus
                />
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  style={{ fontSize: '12px', padding: '0 12px' }}
                  onClick={() => {
                    const remaining = billToSettle.grandTotal - (billToSettle.paidAmount || 0);
                    setSettleAmount(String(remaining));
                    setSettleError('');
                  }}
                >
                  Fully Paid
                </button>
              </div>
              {settleError && (
                <span className="text-danger" style={{ fontSize: '12px', color: 'var(--danger)' }}>
                  {settleError}
                </span>
              )}
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="settle-method-select" style={{ fontWeight: '500' }}>Payment Method</label>
              <CustomSelect
                id="settle-method-select"
                value={paymentMethod}
                onChange={setPaymentMethod}
                options={[
                  { value: 'CASH', label: 'Via Cash' },
                  { value: 'CHEQUE', label: 'Via Cheque' },
                  { value: 'OTHER', label: 'Other' }
                ]}
              />
            </div>

            {paymentMethod === 'CHEQUE' && (
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="cheque-number-input" style={{ fontWeight: '500' }}>Cheque Number</label>
                <input
                  id="cheque-number-input"
                  type="text"
                  className="form-control"
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  placeholder="Enter Cheque Number"
                  required
                />
              </div>
            )}

            {paymentMethod === 'OTHER' && (
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="settle-notes-input" style={{ fontWeight: '500' }}>Notes</label>
                <input
                  id="settle-notes-input"
                  type="text"
                  className="form-control"
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  placeholder="Enter notes (e.g. UPI, bank transfer)"
                  required
                />
              </div>
            )}
          </form>
        </Modal>
      )}
      {settlementToEdit && billForSettlementAction && (
        <Modal
          title="Edit Settlement"
          onClose={() => { setSettlementToEdit(null); setBillForSettlementAction(null); }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setSettlementToEdit(null); setBillForSettlementAction(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditSettlementSubmit}>Save Changes</button>
            </>
          }
        >
          <form onSubmit={handleEditSettlementSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', padding: '12px', background: 'var(--surface-sunken)', borderRadius: '8px' }}>
              <div>
                <span className="text-secondary" style={{ fontSize: '12px' }}>Grand Total</span>
                <div style={{ fontWeight: '500', marginTop: '4px' }}>
                  {formatCurrency(billForSettlementAction.grandTotal)}
                </div>
              </div>
              <div>
                <span className="text-secondary" style={{ fontSize: '12px' }}>Other Payments</span>
                <div style={{ fontWeight: '500', marginTop: '4px' }}>
                  {formatCurrency(billForSettlementAction.paidAmount - settlementToEdit.amount)}
                </div>
              </div>
              <div>
                <span className="text-secondary" style={{ fontSize: '12px' }}>Max Allowed</span>
                <div style={{ fontWeight: '500', marginTop: '4px', color: 'var(--primary)' }}>
                  {formatCurrency(billForSettlementAction.grandTotal - (billForSettlementAction.paidAmount - settlementToEdit.amount))}
                </div>
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="edit-settle-amount-input" style={{ fontWeight: '500' }}>Payment Amount</label>
              <input
                id="edit-settle-amount-input"
                type="number"
                step="any"
                className="form-control"
                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                value={editSettlementAmount}
                onChange={(e) => {
                  let val = e.target.value;
                  if (/^0[0-9]/.test(val)) {
                    val = val.substring(1);
                  }
                  setEditSettlementAmount(val);
                  const num = Number(val);
                  const otherPaymentsSum = billForSettlementAction.paidAmount - settlementToEdit.amount;
                  const remaining = billForSettlementAction.grandTotal - otherPaymentsSum;
                  if (val === '') {
                    setEditSettlementError('');
                  } else if (isNaN(num) || num < 0) {
                    setEditSettlementError('Payment amount cannot be negative.');
                  } else if (num > remaining) {
                    setEditSettlementError(`Payment amount cannot exceed Remaining Balance of ${formatCurrency(remaining)}`);
                  } else {
                    setEditSettlementError('');
                  }
                }}
                autoFocus
              />
              {editSettlementError && (
                <span className="text-danger" style={{ fontSize: '12px', color: 'var(--danger)' }}>
                  {editSettlementError}
                </span>
              )}
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="edit-settle-method-select" style={{ fontWeight: '500' }}>Payment Method</label>
              <CustomSelect
                id="edit-settle-method-select"
                value={editPaymentMethod}
                onChange={setEditPaymentMethod}
                options={[
                  { value: 'CASH', label: 'Via Cash' },
                  { value: 'CHEQUE', label: 'Via Cheque' },
                  { value: 'OTHER', label: 'Other' }
                ]}
              />
            </div>

            {editPaymentMethod === 'CHEQUE' && (
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="edit-cheque-number-input" style={{ fontWeight: '500' }}>Cheque Number</label>
                <input
                  id="edit-cheque-number-input"
                  type="text"
                  className="form-control"
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  value={editChequeNumber}
                  onChange={(e) => setEditChequeNumber(e.target.value)}
                  placeholder="Enter Cheque Number"
                  required
                />
              </div>
            )}

            {editPaymentMethod === 'OTHER' && (
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="edit-settle-notes-input" style={{ fontWeight: '500' }}>Notes</label>
                <input
                  id="edit-settle-notes-input"
                  type="text"
                  className="form-control"
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}
                  value={editSettlementNotes}
                  onChange={(e) => setEditSettlementNotes(e.target.value)}
                  placeholder="Enter notes (e.g. UPI, bank transfer)"
                  required
                />
              </div>
            )}
          </form>
        </Modal>
      )}

      {settlementToDelete && billForSettlementAction && (
        <Modal
          title="Delete Settlement?"
          onClose={() => { setSettlementToDelete(null); setBillForSettlementAction(null); }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => { setSettlementToDelete(null); setBillForSettlementAction(null); }}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteSettlementConfirmed}>Delete</button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
            Are you sure you want to delete this payment of <strong style={{ color: 'var(--primary)' }}>{formatCurrency(settlementToDelete.amount)}</strong>? 
            This will subtract the amount from the bill's total paid balance.
          </p>
        </Modal>
      )}
    </div>
  );
}

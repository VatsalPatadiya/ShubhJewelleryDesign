import { formatCurrency, formatDate } from '../config.js';
import { EditIcon, TrashIcon } from './icons/NavIcons.jsx';

export default function BillsTable({ bills, onToggleStatus, onViewPdf, onEdit, onDelete }) {
  if (bills.length === 0) {
    return null;
  }

  return (
    <div className="surface">
      <table className="data-table">
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Bill Date</th>
            <th>Status</th>
            <th>Grand Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {bills.map((b) => (
            <tr key={b.id}>
              <td>{b.customerName}</td>
              <td>{formatDate(b.billDate)}</td>
              <td>
                <label className="status-toggle" title="Click to toggle payment status">
                  <input
                    type="checkbox"
                    className="status-toggle-input"
                    checked={b.status === 'PAID'}
                    onChange={() => onToggleStatus(b)}
                  />
                  <span className="status-toggle-track">
                    <span className="status-toggle-thumb" />
                  </span>
                  <span className={`status-toggle-label ${b.status === 'PAID' ? 'paid' : 'unpaid'}`}>
                    {b.status === 'PAID' ? 'Paid' : 'Unpaid'}
                  </span>
                </label>
              </td>
              <td className="tabular-nums">{formatCurrency(b.grandTotal)}</td>
              <td className="td-right">
                <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                  {b.pdfPath && (
                    <button className="btn-text" onClick={() => onViewPdf(b.pdfPath)}>
                      View PDF
                    </button>
                  )}
                  <button className="btn-icon" onClick={() => onEdit(b.id)} title="Edit Bill">
                    <EditIcon size={16} />
                  </button>
                  <button className="btn-icon btn-icon-danger" onClick={() => onDelete(b.id)} title="Delete Bill">
                    <TrashIcon size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

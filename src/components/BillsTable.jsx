import { formatCurrency, formatDate } from '../config.js';

export default function BillsTable({ bills, onToggleStatus, onViewPdf }) {
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
                {b.pdfPath && (
                  <button className="btn-text" onClick={() => onViewPdf(b.pdfPath)}>
                    View PDF
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

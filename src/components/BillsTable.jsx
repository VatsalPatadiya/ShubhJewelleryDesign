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
                <button
                  className={`status-pill ${b.status === 'PAID' ? 'paid' : 'unpaid'}`}
                  onClick={() => onToggleStatus(b)}
                  title="Click to toggle status"
                >
                  <span className="status-dot" />
                  {b.status === 'PAID' ? 'Paid' : 'Not Paid'}
                </button>
              </td>
              <td className="tabular-nums">{formatCurrency(b.grandTotal)}</td>
              <td style={{ textAlign: 'right' }}>
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

import { formatCurrency } from '../config.js';
import WhatsAppIcon from './WhatsAppIcon.jsx';

export default function CustomerTable({ customers, onRowClick, onSendWhatsapp, onDelete }) {
  if (customers.length === 0) {
    return null;
  }

  return (
    <div className="surface">
      <table className="data-table">
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>WhatsApp Number</th>
            <th>Pending Bills</th>
            <th>Pending Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="clickable" onClick={() => onRowClick(c.id)}>
              <td>{c.name}</td>
              <td className="tabular-nums">{c.whatsappNumber}</td>
              <td>
                <span className="td-inline-gap">
                  <span className="tabular-nums">{c.pendingBills}</span>
                  <button
                    className={`whatsapp-btn ${c.pendingBills === 0 ? 'disabled' : ''}`}
                    disabled={c.pendingBills === 0}
                    title={c.pendingBills === 0 ? 'No pending bills' : 'Send pending bills via WhatsApp'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (c.pendingBills > 0) onSendWhatsapp(c);
                    }}
                  >
                    <WhatsAppIcon />
                  </button>
                </span>
              </td>
              <td className="tabular-nums">{formatCurrency(c.pendingAmount)}</td>
              <td className="td-right">
                <button
                  className="btn-text"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(c);
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

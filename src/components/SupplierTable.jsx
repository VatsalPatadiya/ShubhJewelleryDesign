import { formatCurrency } from '../config.js';
import WhatsAppIcon from './WhatsAppIcon.jsx';

export default function SupplierTable({ suppliers, onRowClick, onSendWhatsapp, onDelete }) {
  if (suppliers.length === 0) {
    return null;
  }

  return (
    <div className="surface">
      <table className="data-table">
        <thead>
          <tr>
            <th>Supplier Name</th>
            <th>WhatsApp Number</th>
            <th>Pending SupplierBills</th>
            <th>Pending Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((c) => (
            <tr key={c.id} className="clickable" onClick={() => onRowClick(c.id)}>
              <td>{c.name}</td>
              <td className="tabular-nums">{c.whatsappNumber}</td>
              <td>
                <span className="td-inline-gap">
                  <span className="tabular-nums">{c.pendingSupplierBills}</span>
                  <button
                    className={`whatsapp-btn ${c.pendingSupplierBills === 0 ? 'disabled' : ''}`}
                    disabled={c.pendingSupplierBills === 0}
                    title={c.pendingSupplierBills === 0 ? 'No pending supplierBills' : 'Send pending supplierBills via WhatsApp'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (c.pendingSupplierBills > 0) onSendWhatsapp(c);
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

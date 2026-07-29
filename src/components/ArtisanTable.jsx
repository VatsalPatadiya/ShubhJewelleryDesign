import { formatCurrency } from '../config.js';
import WhatsAppIcon from './WhatsAppIcon.jsx';

export default function ArtisanTable({ artisans, onRowClick, onSendWhatsapp, onDelete }) {
  if (artisans.length === 0) {
    return null;
  }

  return (
    <div className="surface">
      <table className="data-table">
        <thead>
          <tr>
            <th>Artisan Name</th>
            <th>WhatsApp Number</th>
            <th>Pending ArtisanBills</th>
            <th>Pending Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {artisans.map((c) => (
            <tr key={c.id} className="clickable" onClick={() => onRowClick(c.id)}>
              <td>{c.name}</td>
              <td className="tabular-nums">{c.whatsappNumber}</td>
              <td>
                <span className="td-inline-gap">
                  <span className="tabular-nums">{c.pendingArtisanBills}</span>
                  <button
                    className={`whatsapp-btn ${c.pendingArtisanBills === 0 ? 'disabled' : ''}`}
                    disabled={c.pendingArtisanBills === 0}
                    title={c.pendingArtisanBills === 0 ? 'No pending artisanBills' : 'Send pending artisanBills via WhatsApp'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (c.pendingArtisanBills > 0) onSendWhatsapp(c);
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

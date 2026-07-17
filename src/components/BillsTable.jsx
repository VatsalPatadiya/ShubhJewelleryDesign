import { useState, Fragment } from 'react';
import { formatCurrency, formatDate, formatDateTime } from '../config.js';
import { EditIcon, TrashIcon, PaymentIcon } from './icons/NavIcons.jsx';

export default function BillsTable({ bills, onToggleStatus, onViewPdf, onEdit, onDelete, onSettle, onEditSettlement, onDeleteSettlement }) {
  const [expandedBillIds, setExpandedBillIds] = useState(new Set());

  if (bills.length === 0) {
    return null;
  }

  const toggleRow = (billId) => {
    setExpandedBillIds((prev) => {
      const next = new Set(prev);
      if (next.has(billId)) {
        next.delete(billId);
      } else {
        next.add(billId);
      }
      return next;
    });
  };

  return (
    <div className="surface">
      <table className="data-table">
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Bill Date</th>
            <th>Status</th>
            <th>Paid Amount</th>
            <th>Grand Total</th>
            <th>Balance</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {bills.map((b) => (
            <Fragment key={b.id}>
              <tr>
                <td>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    {b.settlements && b.settlements.length > 0 ? (
                      <button
                        className="btn-icon"
                        style={{
                          width: '20px',
                          height: '20px',
                          padding: 0,
                          color: 'var(--text-secondary)',
                        }}
                        onClick={() => toggleRow(b.id)}
                        title="View Settlement History"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            transition: 'transform 0.2s ease',
                            transform: expandedBillIds.has(b.id) ? 'rotate(90deg)' : 'rotate(0deg)',
                          }}
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    ) : (
                      <div style={{ width: '20px' }} />
                    )}
                    <span>{b.customerName}</span>
                  </div>
                </td>
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
                <td className="tabular-nums">{formatCurrency(b.paidAmount || 0)}</td>
                <td className="tabular-nums">{formatCurrency(b.grandTotal)}</td>
                <td className="tabular-nums">{formatCurrency(Math.max(0, b.grandTotal - (b.paidAmount || 0)))}</td>
                <td className="td-right">
                  <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                    {b.pdfPath && (
                      <button className="btn-text" onClick={() => onViewPdf(b.pdfPath)}>
                        View PDF
                      </button>
                    )}
                    <button
                      className="btn-icon"
                      style={{
                        color: b.status === 'PAID' ? 'var(--text-muted, #999)' : 'var(--primary)',
                        cursor: b.status === 'PAID' ? 'not-allowed' : 'pointer',
                        opacity: b.status === 'PAID' ? 0.45 : 1,
                      }}
                      onClick={() => onSettle(b)}
                      title={b.status === 'PAID' ? 'Fully Paid' : 'Settle Bill'}
                      disabled={b.status === 'PAID'}
                    >
                      <PaymentIcon size={16} />
                    </button>
                    <button className="btn-icon" onClick={() => onEdit(b.id)} title="Edit Bill">
                      <EditIcon size={16} />
                    </button>
                    <button className="btn-icon btn-icon-danger" onClick={() => onDelete(b.id)} title="Delete Bill">
                      <TrashIcon size={16} />
                    </button>
                  </div>
                </td>
              </tr>
              {expandedBillIds.has(b.id) && b.settlements && b.settlements.length > 0 && (
                <tr style={{ background: 'var(--surface-sunken)' }}>
                  <td colSpan={7} style={{ padding: '16px 24px' }}>
                    <div style={{
                      background: 'var(--surface-card, #fff)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '20px',
                      boxShadow: 'var(--shadow-sm, 0 2px 4px rgba(0,0,0,0.05))',
                      display: 'flex',
                      gap: '40px',
                      flexWrap: 'wrap'
                    }}>
                      
                      {/* Left: Progress Summary Card */}
                      <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Settlement Progress
                          </h4>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
                              {b.paidAmount <= 0 ? 0 : (b.paidAmount >= b.grandTotal ? 100 : Math.min(99, Math.max(1, Math.floor((b.paidAmount / b.grandTotal) * 100))))}%
                            </span>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Paid</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{
                          height: '8px',
                          background: 'var(--border, #eee)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          width: '100%'
                        }}>
                          <div style={{
                            width: `${(b.paidAmount / b.grandTotal) * 100}%`,
                            height: '100%',
                            background: 'var(--accent-gradient, linear-gradient(135deg, #c8963e, #e5b858))',
                            borderRadius: '4px',
                            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                          }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', marginTop: '4px' }}>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px' }}>Paid Amount</span>
                            <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{formatCurrency(b.paidAmount)}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px' }}>Remaining</span>
                            <span style={{ fontWeight: '600', color: 'var(--danger)' }}>{formatCurrency(Math.max(0, b.grandTotal - b.paidAmount))}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Payment Timeline */}
                      <div style={{ flex: '2 1 350px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ margin: '0', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Payment History
                        </h4>
                        
                        <div style={{
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                          paddingLeft: '20px'
                        }}>
                          {/* Timeline vertical connector line */}
                          <div style={{
                            position: 'absolute',
                            left: '5px',
                            top: '8px',
                            bottom: '8px',
                            width: '2px',
                            background: 'var(--border, #eee)'
                          }} />

                          {[...b.settlements]
                            .sort((a, b) => {
                              const dateA = new Date((a.paymentDate || a.payment_date || '').replace(' ', 'T'));
                              const dateB = new Date((b.paymentDate || b.payment_date || '').replace(' ', 'T'));
                              return dateB - dateA;
                            })
                            .map((s, idx, arr) => (
                              <div key={s.id} style={{
                                position: 'relative',
                                display: 'flex',
                                justifyConnection: 'space-between',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '13px'
                              }}>
                                {/* Dot indicator */}
                                <div style={{
                                  position: 'absolute',
                                  left: '-19px',
                                  top: '4px',
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  background: idx === 0 ? 'var(--primary, #c8963e)' : 'var(--text-secondary, #999)',
                                  border: '2px solid var(--surface-card, #fff)',
                                  boxShadow: idx === 0 ? '0 0 0 3px rgba(200, 150, 62, 0.15)' : 'none'
                                }} />
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                                    Payment #{arr.length - idx}
                                  </span>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span>{formatDateTime(s.paymentDate || s.payment_date)}</span>
                                    <span style={{
                                      background: 'var(--surface-sunken)',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      fontSize: '9px',
                                      fontWeight: '600',
                                      letterSpacing: '0.03em',
                                      textTransform: 'uppercase',
                                      color: 'var(--text-secondary)',
                                      border: '1px solid var(--border)'
                                    }}>
                                      {s.paymentMethod || s.payment_method || 'CASH'}
                                    </span>
                                    {((s.paymentMethod || s.payment_method) === 'CHEQUE' && (s.chequeNumber || s.cheque_number)) && (
                                      <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: '500' }}>
                                        Cheque No: {s.chequeNumber || s.cheque_number}
                                      </span>
                                    )}
                                    {((s.paymentMethod || s.payment_method) === 'OTHER' && s.notes) && (
                                      <span style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontStyle: 'italic' }}>
                                        ({s.notes})
                                      </span>
                                    )}
                                  </span>
                                </div>
                                
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '16px' }}>
                                  <span style={{ fontWeight: '600', fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-primary)' }}>
                                    {formatCurrency(s.amount)}
                                  </span>
                                  <div style={{ display: 'inline-flex', gap: '6px' }}>
                                    <button 
                                      className="btn-icon" 
                                      style={{ padding: '2px', color: 'var(--text-secondary)' }}
                                      onClick={() => onEditSettlement(s, b)}
                                      title="Edit Payment"
                                    >
                                      <EditIcon size={12} />
                                    </button>
                                    <button 
                                      className="btn-icon btn-icon-danger" 
                                      style={{ padding: '2px' }}
                                      onClick={() => onDeleteSettlement(s, b)}
                                      title="Delete Payment"
                                    >
                                      <TrashIcon size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      </div>

                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

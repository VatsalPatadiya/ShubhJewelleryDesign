export const CURRENCY_SYMBOL = '₹';

export function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return `${CURRENCY_SYMBOL}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString.replace(' ', 'T') + (isoString.includes('T') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString.replace(' ', 'T') + (isoString.includes('T') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

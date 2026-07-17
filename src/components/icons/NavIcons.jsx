function Base({ children, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function CustomersIcon(props) {
  return (
    <Base {...props}>
      <path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19" />
      <circle cx="9" cy="8" r="3.25" />
      <path d="M15.5 6.2a3 3 0 0 1 0 5.8" />
      <path d="M18.5 19v-1.5a3.3 3.3 0 0 0-2-3" />
    </Base>
  );
}

export function BillingIcon(props) {
  return (
    <Base {...props}>
      <rect x="3.5" y="4" width="12" height="16" rx="1.5" />
      <path d="M7 8.5h5M7 12h5M7 15.5h3" />
      <path d="M18 8.5h2.5v9A1.5 1.5 0 0 1 19 19h-1" />
    </Base>
  );
}

export function BillsIcon(props) {
  return (
    <Base {...props}>
      <path d="M6 3.5h9l3.5 3.5V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M15 3.5V7h3.5" />
      <path d="M8 12h8M8 15.5h8M8 8.5h4" />
    </Base>
  );
}

export function BackupIcon(props) {
  return (
    <Base {...props}>
      <path d="M7.5 9.5a4.5 4.5 0 0 1 8.7-1.6A3.75 3.75 0 0 1 17.5 15.5H7.25A3.75 3.75 0 0 1 6 8.15" />
      <path d="M12 11v6M9.5 14.5 12 17l2.5-2.5" />
    </Base>
  );
}

export function ChevronIcon({ direction = 'left', size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transition: 'transform 0.2s var(--ease)',
        transform: direction === 'right' ? 'rotate(180deg)' : 'none',
      }}
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function RingIcon(props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="15" r="5" strokeWidth="1.8" />
      <path d="M10 10.5l2-2 2 2" strokeWidth="1.8" />
      <path d="M12 2l-3.5 4 3.5 3 3.5-3-3.5-4z" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 2v7M8.5 6h7" strokeWidth="1" strokeDasharray="1 1" />
    </Base>
  );
}

export function SettingsIcon(props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Base>
  );
}

export function EditIcon(props) {
  return (
    <Base {...props}>
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Base>
  );
}

export function TrashIcon(props) {
  return (
    <Base {...props}>
      <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="14" y1="11" x2="14" y2="17" strokeWidth="1.8" strokeLinecap="round" />
    </Base>
  );
}

export function ExpensesIcon(props) {
  return (
    <Base {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="6" y1="15" x2="10" y2="15" />
    </Base>
  );
}

export function PaymentIcon(props) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 7h8" />
      <path d="M8 10h8" />
      <path d="M8 7c4 0 5 3.5 0 3.5" />
      <path d="M10 10.5 L15 16" />
    </Base>
  );
}


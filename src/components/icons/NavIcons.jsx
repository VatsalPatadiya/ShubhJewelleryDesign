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

export function GemIcon(props) {
  return (
    <Base {...props}>
      <path d="M6 3.5h12l3 5.5-9 11.5-9-11.5 3-5.5Z" />
      <path d="M3 9h18M9 3.5 7 9l5 11.5M15 3.5 17 9l-5 11.5" />
    </Base>
  );
}

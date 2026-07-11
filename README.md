# ShubhJewelleryDesign — Customer Billing App

Offline Electron + React desktop app for managing customers, creating bills, tracking
paid/unpaid status, and sharing pending bills over WhatsApp. Built from
`customer-billing-app-spec.md`.

## Run in development

```bash
npm install
npm run dev
```

This starts the Vite dev server and launches the Electron window pointed at it.
Data lives in SQLite at Electron's `userData` path (e.g.
`~/Library/Application Support/Customer Billing/app.db` on macOS), and generated
PDFs live alongside it under `pdfs/`.

## Package a Windows `.exe`

This project was built on macOS. `better-sqlite3` is a native module and
`electron-builder`'s Windows/NSIS target needs to rebuild it for the Windows
target — that isn't reliable when cross-compiling from macOS without a Windows
machine or CI. To produce the installer:

```bash
npm run build   # vite build + electron-builder --win
```

Run this on a Windows machine, or set up a `windows-latest` GitHub Actions
runner if you'd like a repeatable CI build — ask if you want that workflow
added.

## Notes / deviations from the spec

- Currency is ₹ (`src/config.js`) on-screen. Inside generated PDFs, amounts are
  prefixed `Rs.` instead of `₹` — pdf-lib's standard 14 fonts only support
  WinAnsi encoding, which has no ₹ glyph, and embedding a custom Unicode font
  for one symbol wasn't worth the bundle size.
- Deleting a customer with existing bills is blocked (per the spec's own
  recommendation).
- Gram and Quantity values both accept decimals.
- `electron-builder` config lives directly in `package.json`'s `build` field
  rather than a separate `electron-builder.yml`.

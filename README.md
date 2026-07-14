# ShubhJewelleryDesign – Customer Billing Application

**ShubhJewelleryDesign** is a cross‑platform desktop application built with **Electron** and **React** that helps jewellery retailers manage customers, create and track bills, and share pending invoices via WhatsApp. The app stores data locally in an embedded SQLite database and protects all user data in `localStorage` with AES‑256‑GCM encryption.

---

## 📦 Features

- **Customer Management** – Add, edit, and view customers with full contact details.
- **Bill Creation** – Generate professional invoices with itemised product listings, taxes, discounts and custom notes.
- **Payment Tracking** – Mark bills as paid or unpaid; filter and sort by payment status.
- **WhatsApp Integration** – Export a bill as a PDF and share it directly through WhatsApp.
- **Secure Data Storage** – All data saved in SQLite and any preferences stored in `localStorage` are **encrypted** using AES‑GCM, preventing casual inspection via DevTools.
- **Backup & Restore** – Export the entire SQLite database (encrypted) and import it later without data loss.
- **Settings & Customisation** – Toggle UI theme, configure default currency (₹), and set preferences such as auto‑collapse of the sidebar.
- **Responsive UI** – Built with modern React components; works seamlessly on Windows, macOS and Linux.
- **Offline‑First** – No external server required; all operations run locally on the user's machine.

---

## 🖼️ Screenshots (placeholder)
> Add screenshots of the main dashboard, bill creation screen, and settings panel here.

---

## 🏗️ Architecture Overview

- **Electron** provides the native desktop container and file‑system access.
- **React** renders the UI, orchestrated via a mock API (`window.api`) that abstracts SQLite and encrypted `localStorage` operations.
- **SQLite** (`app.db` under Electron's `userData` directory) stores persistent records for customers, bills, products, and expenses.
- **Crypto Module (`src/crypto.js`)** – Handles encryption/decryption of all `localStorage` entries using the Web Crypto API (AES‑256‑GCM).
- **Backup/Restore** – Simple file‑based export/import that works with the encrypted data store.

---

## 🔐 Security & Privacy

- All user‑specific settings and temporary data saved in `localStorage` are encrypted at rest.
- The encryption key is derived from a hard‑coded passphrase using PBKDF2 (100 000 iterations, SHA‑256). While this is not production‑grade key management, it prevents casual snooping through browser DevTools.
- The SQLite file remains on the user's machine; no network communication occurs unless the user explicitly shares a PDF via WhatsApp.

---

## 🚀 Getting Started (quick)

```bash
# Install dependencies
npm install

# Launch the development version (Electron + Vite dev server)
npm run dev
```

> The above command starts the Vite dev server and opens an Electron window pointing to it. For production builds, run `npm run build` followed by the appropriate Electron packaging command.

---

## 📦 Packaging for Distribution

The project includes an `electron-builder` configuration in `package.json`. Use the following command on the target OS to generate installers (e.g., Windows `.exe`, macOS `.dmg`):

```bash
npm run build   # builds Vite assets and runs electron-builder
```

---

## 📄 License

This project is licensed under the MIT License.

---

*Feel free to contribute, open issues, or suggest enhancements!*

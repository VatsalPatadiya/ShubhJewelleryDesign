import { useState } from 'react';
import Modal from './Modal.jsx';

export default function SupplierForm({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError('');
    if (!name.trim()) {
      setError('Supplier name is required.');
      return;
    }
    const digits = whatsappNumber.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      setError('WhatsApp number must be 10-15 digits.');
      return;
    }

    setSaving(true);
    const result = await window.api.suppliers.add({ name: name.trim(), whatsappNumber: digits });
    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    onSaved();
  }

  return (
    <Modal
      title="Add Supplier"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="supplier-name">Supplier Name</label>
        <input
          id="supplier-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
      <div className="field">
        <label htmlFor="supplier-whatsapp">WhatsApp Number</label>
        <input
          id="supplier-whatsapp"
          type="tel"
          placeholder="91XXXXXXXXXX"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
        />
      </div>
      {error && <div className="field-error">{error}</div>}
    </Modal>
  );
}

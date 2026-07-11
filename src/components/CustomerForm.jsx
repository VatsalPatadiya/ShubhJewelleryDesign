import { useState } from 'react';
import Modal from './Modal.jsx';

export default function CustomerForm({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setError('');
    if (!name.trim()) {
      setError('Customer name is required.');
      return;
    }
    const digits = whatsappNumber.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      setError('WhatsApp number must be 10-15 digits.');
      return;
    }

    setSaving(true);
    const result = await window.api.customers.add({ name: name.trim(), whatsappNumber: digits });
    setSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    onSaved();
  }

  return (
    <Modal
      title="Add Customer"
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
        <label htmlFor="customer-name">Customer Name</label>
        <input
          id="customer-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
      <div className="field">
        <label htmlFor="customer-whatsapp">WhatsApp Number</label>
        <input
          id="customer-whatsapp"
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

import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import CustomSelect from '../components/CustomSelect.jsx';

export default function SettingsTab({ onBrandTitleChange, onSettingsChanged }) {
  const [brandTitle, setBrandTitle] = useState('SHUBH JEWELLERY');
  const [tempBrandTitle, setTempBrandTitle] = useState('SHUBH JEWELLERY');
  const [hasPin, setHasPin] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [lockTimeout, setLockTimeout] = useState(0);
  const [showPendingProducts, setShowPendingProducts] = useState(false);
  const [pdfSettings, setPdfSettings] = useState({
    pdf_show_whatsapp: true,
    pdf_show_product_notes: true,
    pdf_show_main_notes: true,
    pdf_show_payment_history: true,
    pdf_show_date: true,
    pdf_show_time: true,
    pdf_previous_show_date: true,
    pdf_previous_show_time: true,
    pdf_previous_show_products: false
  });
  const { showToast } = useToast();

  useEffect(() => {
    window.api.settings.get('brand_title').then((val) => {
      if (val !== null && val !== undefined) {
        setBrandTitle(val);
        setTempBrandTitle(val);
      }
    });
    window.api.settings.get('app_pin').then((val) => {
      setHasPin(!!(val && val.trim()));
    });
    window.api.settings.get('app_lock_timeout').then((val) => {
      if (val !== null && val !== undefined) {
        setLockTimeout(Number(val));
      }
    });
    const settingsKeys = [
      'pdf_show_whatsapp', 'pdf_show_product_notes', 'pdf_show_main_notes', 
      'pdf_show_payment_history', 'pdf_show_date', 'pdf_show_time',
      'pdf_previous_show_date', 'pdf_previous_show_time', 'pdf_previous_show_products'
    ];
    Promise.all(settingsKeys.map(k => window.api.settings.get(k))).then(values => {
      setPdfSettings(prev => {
        const next = { ...prev };
        settingsKeys.forEach((k, i) => {
          if (values[i] !== null && values[i] !== undefined) {
            next[k] = values[i] === 'true';
          }
        });
        return next;
      });
    });
  }, []);

  // Filter input to allow only digits and maximum of 4 characters
  const handlePinChange = (val, setter) => {
    const cleaned = val.replace(/\D/g, '');
    setter(cleaned.slice(0, 4));
  };

  async function handleSaveBrandTitle() {
    if (!tempBrandTitle.trim()) {
      showToast('Brand title cannot be empty.', 'error');
      return;
    }
    setBrandTitle(tempBrandTitle.trim());
    await window.api.settings.set('brand_title', tempBrandTitle.trim());
    if (onBrandTitleChange) {
      onBrandTitleChange(tempBrandTitle.trim());
    }
    showToast('Brand header title saved successfully.', 'success');
  }

  async function handleSaveLockTimeout(val) {
    setLockTimeout(val);
    await window.api.settings.set('app_lock_timeout', String(val));
    if (onSettingsChanged) {
      onSettingsChanged();
    }
    showToast('Auto lock timeout updated successfully.', 'success');
  }



  async function handleTogglePdfSetting(key, checked) {
    setPdfSettings(prev => ({ ...prev, [key]: checked }));
    await window.api.settings.set(key, String(checked));
    if (onSettingsChanged) {
      onSettingsChanged();
    }
    showToast('PDF setting updated.', 'success');
  }

  async function handleSetPin() {
    if (newPin.length !== 4) {
      showToast('PIN must be exactly 4 digits.', 'error');
      return;
    }
    await window.api.settings.set('app_pin', newPin);
    setHasPin(true);
    setCurrentPin('');
    setNewPin('');
    if (onSettingsChanged) {
      onSettingsChanged();
    }
    showToast('PIN has been successfully set!', 'success');
  }

  async function handleUpdatePin() {
    const realPin = await window.api.settings.get('app_pin');
    if (currentPin !== realPin) {
      showToast('Incorrect current PIN.', 'error');
      return;
    }

    if (newPin.trim()) {
      if (newPin.length !== 4) {
        showToast('New PIN must be exactly 4 digits.', 'error');
        return;
      }
      await window.api.settings.set('app_pin', newPin);
      setHasPin(true);
      setCurrentPin('');
      setNewPin('');
      showToast('PIN has been successfully changed!', 'success');
    } else {
      await window.api.settings.set('app_pin', '');
      setHasPin(false);
      setCurrentPin('');
      setNewPin('');
      showToast('PIN has been disabled.', 'success');
    }

    if (onSettingsChanged) {
      onSettingsChanged();
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      {/* Branding Settings Card */}
      <div className="surface section-block backup-card">
        <h2 className="backup-card-title">Branding Settings</h2>
        <p className="helper-text backup-card-desc">
          Customize the brand header title displayed at the top of generated PDF bills.
        </p>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'end', maxWidth: 450, marginTop: 16 }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="brand-title">PDF Header Title</label>
            <input
              id="brand-title"
              type="text"
              value={tempBrandTitle}
              onChange={(e) => setTempBrandTitle(e.target.value)}
              placeholder="SHUBH JEWELLERS"
              style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
            />
          </div>
          <button className="btn btn-primary" onClick={handleSaveBrandTitle} style={{ height: 42 }}>
            Save Title
          </button>
        </div>
      </div>

      {/* PDF Settings Card */}
      <div className="surface section-block backup-card" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div>
          <h2 className="backup-card-title">Current Bill PDF Settings</h2>
          <p className="helper-text backup-card-desc">
            Choose which fields to display in the main detailed bill.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 450, marginTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                className="custom-checkbox"
                checked={pdfSettings.pdf_show_date}
                onChange={(e) => handleTogglePdfSetting('pdf_show_date', e.target.checked)}
              />
              <span style={{ fontWeight: 500 }}>Show Bill Date</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                className="custom-checkbox"
                checked={pdfSettings.pdf_show_time}
                onChange={(e) => handleTogglePdfSetting('pdf_show_time', e.target.checked)}
              />
              <span style={{ fontWeight: 500 }}>Show Bill Time</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                className="custom-checkbox"
                checked={pdfSettings.pdf_show_whatsapp}
                onChange={(e) => handleTogglePdfSetting('pdf_show_whatsapp', e.target.checked)}
              />
              <span style={{ fontWeight: 500 }}>Show Customer WhatsApp Number</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                className="custom-checkbox"
                checked={pdfSettings.pdf_show_product_notes}
                onChange={(e) => handleTogglePdfSetting('pdf_show_product_notes', e.target.checked)}
              />
              <span style={{ fontWeight: 500 }}>Show Product-wise Notes</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                className="custom-checkbox"
                checked={pdfSettings.pdf_show_main_notes}
                onChange={(e) => handleTogglePdfSetting('pdf_show_main_notes', e.target.checked)}
              />
              <span style={{ fontWeight: 500 }}>Show Main Bill Notes</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                className="custom-checkbox"
                checked={pdfSettings.pdf_show_payment_history}
                onChange={(e) => handleTogglePdfSetting('pdf_show_payment_history', e.target.checked)}
              />
              <span style={{ fontWeight: 500 }}>Show Payment History</span>
            </label>
          </div>
        </div>

        <div>
          <h2 className="backup-card-title">Previous Pending Bills Settings</h2>
          <p className="helper-text backup-card-desc">
            Choose which fields to display for the previous bills summary section.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 450, marginTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                className="custom-checkbox"
                checked={pdfSettings.pdf_previous_show_time}
                onChange={(e) => handleTogglePdfSetting('pdf_previous_show_time', e.target.checked)}
              />
              <span style={{ fontWeight: 500 }}>Show Time</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                className="custom-checkbox"
                checked={pdfSettings.pdf_previous_show_products}
                onChange={(e) => handleTogglePdfSetting('pdf_previous_show_products', e.target.checked)}
              />
              <span style={{ fontWeight: 500 }}>Show Products</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                className="custom-checkbox"
                checked={pdfSettings.pdf_previous_show_quantity}
                onChange={(e) => handleTogglePdfSetting('pdf_previous_show_quantity', e.target.checked)}
              />
              <span style={{ fontWeight: 500 }}>Show Quantity / Gram</span>
            </label>
          </div>
        </div>
      </div>

      {/* Security PIN Settings Card */}
      <div className="surface section-block backup-card">
        <h2 className="backup-card-title">Security PIN Settings</h2>
        <p className="helper-text backup-card-desc">
          {hasPin
            ? 'A PIN is currently required to access the application. You can change or remove it below.'
            : 'Set a PIN to lock the application. When active, you will be prompted for this PIN every time the app opens.'}
        </p>

        {hasPin ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 450, marginTop: 16 }}>
            <div className="field">
              <label htmlFor="current-pin">Current PIN</label>
              <input
                id="current-pin"
                type="password"
                placeholder="Enter current PIN"
                value={currentPin}
                onChange={(e) => handlePinChange(e.target.value, setCurrentPin)}
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
              />
            </div>
            <div className="field">
              <label htmlFor="new-pin">New PIN (Leave empty to remove PIN)</label>
              <input
                id="new-pin"
                type="password"
                placeholder="Enter new PIN"
                value={newPin}
                onChange={(e) => handlePinChange(e.target.value, setNewPin)}
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
              />
            </div>
            <button className="btn btn-primary" onClick={handleUpdatePin} style={{ alignSelf: 'flex-start', height: 42 }}>
              Update PIN Settings
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'end', maxWidth: 450, marginTop: 16 }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label htmlFor="set-new-pin">Set PIN</label>
              <input
                id="set-new-pin"
                type="password"
                placeholder="Enter new PIN"
                value={newPin}
                onChange={(e) => handlePinChange(e.target.value, setNewPin)}
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                style={{ width: '100%', height: 42, padding: '0 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' }}
              />
            </div>
            <button className="btn btn-primary" onClick={handleSetPin} style={{ height: 42 }}>
              Enable PIN
            </button>
          </div>
        )}
      </div>

      {/* Auto Lock Timeout Card */}
      <div className="surface section-block backup-card" style={{ overflow: 'visible' }}>
        <h2 className="backup-card-title">Auto Lock Timeout</h2>
        <p className="helper-text backup-card-desc">
          Automatically lock the app and request the PIN after the specified duration of inactivity.
        </p>
        <div className="field" style={{ maxWidth: 450, marginTop: 16 }}>
          <label htmlFor="lock-timeout">Lock Timeout</label>
          <CustomSelect
            id="lock-timeout"
            value={lockTimeout}
            onChange={(val) => handleSaveLockTimeout(Number(val))}
            options={[
              { value: 0, label: 'Never' },
              { value: 60000, label: '1 Minute' },
              { value: 300000, label: '5 Minutes' },
              { value: 600000, label: '10 Minutes' },
              { value: 1800000, label: '30 Minutes' },
              { value: 3600000, label: '1 Hour' },
              { value: 86400000, label: '1 Day' }
            ]}
          />
        </div>
      </div>
    </div>
  );
}

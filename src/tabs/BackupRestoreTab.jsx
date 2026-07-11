import { useEffect, useState } from 'react';
import Modal from '../components/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function BackupRestoreTab() {
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [brandTitle, setBrandTitle] = useState('SHUBH JEWELLERY');
  const { showToast } = useToast();

  useEffect(() => {
    window.api.settings.get('brand_title').then((val) => {
      if (val !== null && val !== undefined) {
        setBrandTitle(val);
      }
    });
  }, []);

  async function handleBackup() {
    setBackingUp(true);
    const result = await window.api.backup.run();
    setBackingUp(false);

    if (result.canceled) return;
    if (!result.success) {
      showToast(result.error || 'Backup failed.', 'error');
      return;
    }
    showToast(`Backup saved to ${result.filePath}`, 'success');
    window.api.backup.showInFolder(result.filePath);
  }

  async function handleRestoreConfirmed() {
    setConfirmRestore(false);
    setRestoring(true);
    const result = await window.api.backup.restore();
    setRestoring(false);

    if (result.canceled) return;
    if (!result.success) {
      showToast(result.error || 'Restore failed.', 'error');
      return;
    }
    showToast('Restore complete. Reloading data…', 'success');
    window.location.reload();
  }

  async function handleSaveBrandTitle(val) {
    setBrandTitle(val);
    await window.api.settings.set('brand_title', val);
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Backup & Restore</h1>
      </div>

      <div className="surface section-block backup-card">
        <h2 className="backup-card-title">Branding Settings</h2>
        <p className="helper-text backup-card-desc">
          Customize the brand header title displayed at the top of generated PDF bills.
        </p>
        <div className="field" style={{ maxWidth: 360, marginTop: 12, marginBottom: 0 }}>
          <label htmlFor="brand-title">PDF Header Title</label>
          <input
            id="brand-title"
            type="text"
            value={brandTitle}
            onChange={(e) => handleSaveBrandTitle(e.target.value)}
            placeholder="SHUBH JEWELLERY"
          />
        </div>
      </div>

      <div className="surface section-block backup-card">
        <h2 className="backup-card-title">Backup Now</h2>
        <p className="helper-text backup-card-desc">
          Creates a single .zip containing the database and all generated bill PDFs.
        </p>
        <button className="btn btn-primary" onClick={handleBackup} disabled={backingUp}>
          {backingUp ? 'Backing up…' : 'Backup Now'}
        </button>
      </div>

      <div className="surface section-block backup-card">
        <h2 className="backup-card-title">Restore from Backup</h2>
        <p className="helper-text backup-card-desc">
          Replaces all current customers, bills and products with the contents of a backup .zip.
        </p>
        <button className="btn btn-ghost" onClick={() => setConfirmRestore(true)} disabled={restoring}>
          {restoring ? 'Restoring…' : 'Restore from Backup'}
        </button>
      </div>

      {confirmRestore && (
        <Modal
          title="Restore from backup?"
          onClose={() => setConfirmRestore(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirmRestore(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleRestoreConfirmed}>Restore</button>
            </>
          }
        >
          <p>
            Restoring will replace all current customers, bills, and products with the data from the
            backup you choose next. This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}

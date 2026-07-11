import { useState } from 'react';
import Modal from '../components/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function BackupRestoreTab() {
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const { showToast } = useToast();

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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Backup & Restore</h1>
      </div>

      <div className="surface section-block" style={{ padding: 24, maxWidth: 560 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Backup Now</h2>
        <p className="helper-text" style={{ marginBottom: 16 }}>
          Creates a single .zip containing the database and all generated bill PDFs.
        </p>
        <button className="btn btn-primary" onClick={handleBackup} disabled={backingUp}>
          {backingUp ? 'Backing up…' : 'Backup Now'}
        </button>
      </div>

      <div className="surface section-block" style={{ padding: 24, maxWidth: 560 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Restore from Backup</h2>
        <p className="helper-text" style={{ marginBottom: 16 }}>
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

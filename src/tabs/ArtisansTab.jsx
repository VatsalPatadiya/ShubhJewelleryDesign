import { useEffect, useState } from 'react';
import ArtisanForm from '../components/ArtisanForm.jsx';
import ArtisanTable from '../components/ArtisanTable.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function ArtisansTab({ onViewArtisanBills }) {
  const [artisans, setArtisans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [whatsappResult, setWhatsappResult] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { showToast } = useToast();

  async function refresh() {
    setLoading(true);
    const rows = await window.api.artisans.list();
    setArtisans(rows);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleExport() {
    const result = await window.api.artisans.exportCsv();
    if (result.canceled) return;
    if (result.success) {
      showToast(`Exported to ${result.filePath}`, 'success');
    } else {
      showToast(result.error || 'Export failed.', 'error');
    }
  }

  async function handleImport() {
    const picked = await window.api.artisans.pickImportFile();
    if (picked.canceled) return;
    if (!picked.success) {
      showToast(picked.error || 'Could not open file.', 'error');
      return;
    }
    const result = await window.api.artisans.importCsv(picked.filePath);
    if (!result.success) {
      showToast(result.error || 'Import failed.', 'error');
      return;
    }
    showToast(`${result.added} added, ${result.skipped} skipped as duplicates/invalid.`, 'success');
    refresh();
  }

  async function handleSendWhatsapp(artisan) {
    const result = await window.api.whatsapp.sendPendingArtisanBills(artisan.id);
    console.log('result', result)
    if (!result.success) {
      showToast(result.error || 'Could not send pending artisanBills.', 'error');
      return;
    }
    setWhatsappResult(result);
  }

  async function handleDeleteConfirm() {
    const result = await window.api.artisans.remove(deleteTarget.id);
    setDeleteTarget(null);
    if (!result.success) {
      showToast(result.error, 'error');
      return;
    }
    showToast('Artisan deleted.', 'success');
    refresh();
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Artisans</h1>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={handleImport}>Import CSV</button>
          <button className="btn btn-ghost" onClick={handleExport}>Export CSV</button>
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>Add Artisan</button>
        </div>
      </div>

      {!loading && artisans.length === 0 && (
        <div className="empty-state">
          <p>No artisans yet.</p>
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>Add your first artisan</button>
        </div>
      )}

      <ArtisanTable
        artisans={artisans}
        onRowClick={onViewArtisanBills}
        onSendWhatsapp={handleSendWhatsapp}
        onDelete={setDeleteTarget}
      />

      {showAddForm && (
        <ArtisanForm
          onClose={() => setShowAddForm(false)}
          onSaved={() => {
            setShowAddForm(false);
            showToast('Artisan added.', 'success');
            refresh();
          }}
        />
      )}

      {whatsappResult && (
        <Modal
          title="WhatsApp opened"
          onClose={() => setWhatsappResult(null)}
          footer={<button className="btn btn-primary" onClick={() => setWhatsappResult(null)}>Got it</button>}
        >
          <p>{whatsappResult.note}</p>
          <p className="caption">PDF saved at: {whatsappResult.pdfPath}</p>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="Delete artisan?"
          onClose={() => setDeleteTarget(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm}>Delete</button>
            </>
          }
        >
          <p>Delete <strong>{deleteTarget.name}</strong>? This cannot be undone.</p>
        </Modal>
      )}
    </div>
  );
}

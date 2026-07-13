import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import PinVerificationScreen from './components/PinVerificationScreen.jsx';
import { CustomersIcon, BillingIcon, BillsIcon, BackupIcon, SettingsIcon, ExpensesIcon } from './components/icons/NavIcons.jsx';
import CustomersTab from './tabs/CustomersTab.jsx';
import ProductsBillingTab from './tabs/ProductsBillingTab.jsx';
import BillsTab from './tabs/BillsTab.jsx';
import ExpensesTab from './tabs/ExpensesTab.jsx';
import BackupRestoreTab from './tabs/BackupRestoreTab.jsx';
import SettingsTab from './tabs/SettingsTab.jsx';

const TABS = [
  { key: 'customers', label: 'Customers', icon: CustomersIcon },
  { key: 'billing', label: 'Billing', icon: BillingIcon },
  { key: 'bills', label: 'Bills', icon: BillsIcon },
  { key: 'expenses', label: 'Manage Expenses', icon: ExpensesIcon },
  { key: 'backup', label: 'Backup & Restore', icon: BackupIcon },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

const COLLAPSE_KEY = 'sidebar-collapsed';

export default function App() {
  const [activeTab, setActiveTab] = useState('customers');
  const [billsFilterCustomerId, setBillsFilterCustomerId] = useState(null);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const [editingBillId, setEditingBillId] = useState(null);

  // Security Lock States
  const [pinRequired, setPinRequired] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [savedPin, setSavedPin] = useState('');
  const [brandTitle, setBrandTitle] = useState('SHUBH JEWELLERS');
  const [lockTimeout, setLockTimeout] = useState(0);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  // Load and sync settings
  const loadSettings = async () => {
    if (!window.api) return;
    const pin = await window.api.settings.get('app_pin');
    const title = await window.api.settings.get('brand_title');
    const timeout = await window.api.settings.get('app_lock_timeout');

    if (pin && pin.trim()) {
      setPinRequired(true);
      setSavedPin(pin.trim());
    } else {
      setPinRequired(false);
      setSavedPin('');
    }

    if (title && title.trim()) {
      setBrandTitle(title.trim());
    }

    if (timeout !== null && timeout !== undefined) {
      setLockTimeout(Number(timeout));
    }
  };

  useEffect(() => {
    loadSettings();
  }, [pinVerified, activeTab]);

  // Inactivity lock tracking
  useEffect(() => {
    if (!pinRequired || lockTimeout <= 0 || !pinVerified) {
      return;
    }

    let timeoutId;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setPinVerified(false);
      }, lockTimeout);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [pinRequired, lockTimeout, pinVerified]);

  function goToBillsForCustomer(customerId) {
    setBillsFilterCustomerId(customerId);
    setActiveTab('bills');
  }

  function handleEditBill(billId) {
    setEditingBillId(billId);
    setActiveTab('billing');
  }

  function handleBillingSaved() {
    setEditingBillId(null);
    setActiveTab('bills');
  }

  function handleCancelEdit() {
    setEditingBillId(null);
    setActiveTab('bills');
  }

  if (pinRequired && !pinVerified) {
    return (
      <PinVerificationScreen
        brandTitle={brandTitle}
        savedPin={savedPin}
        onVerified={() => setPinVerified(true)}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        brandTitle={brandTitle}
        tabs={TABS}
        activeTab={activeTab}
        onSelect={(tabKey) => {
          if (tabKey !== 'billing') {
            setEditingBillId(null);
          }
          setActiveTab(tabKey);
        }}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      <main className="tab-content">
        {activeTab === 'customers' && <CustomersTab onViewBills={goToBillsForCustomer} />}
        {activeTab === 'billing' && (
          <ProductsBillingTab
            editingBillId={editingBillId}
            onSaved={handleBillingSaved}
            onCancelEdit={handleCancelEdit}
          />
        )}
        {activeTab === 'bills' && (
          <BillsTab
            initialCustomerId={billsFilterCustomerId}
            onFilterConsumed={() => setBillsFilterCustomerId(null)}
            onEditBill={handleEditBill}
          />
        )}
        {activeTab === 'expenses' && <ExpensesTab />}
        {activeTab === 'backup' && <BackupRestoreTab />}
        {activeTab === 'settings' && <SettingsTab onBrandTitleChange={setBrandTitle} onSettingsChanged={loadSettings} />}
      </main>
    </div>
  );
}

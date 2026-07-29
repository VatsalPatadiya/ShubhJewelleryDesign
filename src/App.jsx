import { useEffect, useState, useRef } from 'react';
import { encrypt, decrypt } from './crypto.js';
import Sidebar from './components/Sidebar.jsx';
import PinVerificationScreen from './components/PinVerificationScreen.jsx';
import { CustomersIcon, BillingIcon, BillsIcon, BackupIcon, SettingsIcon, ExpensesIcon } from './components/icons/NavIcons.jsx';
import CustomersTab from './tabs/CustomersTab.jsx';
import ProductsBillingTab from './tabs/ProductsBillingTab.jsx';
import BillsTab from './tabs/BillsTab.jsx';

import ArtisansTab from './tabs/ArtisansTab.jsx';
import ArtisanBillingTab from './tabs/ArtisanBillingTab.jsx';
import ArtisanBillsTab from './tabs/ArtisanBillsTab.jsx';

import SuppliersTab from './tabs/SuppliersTab.jsx';
import SupplierBillingTab from './tabs/SupplierBillingTab.jsx';
import SupplierBillsTab from './tabs/SupplierBillsTab.jsx';

import ExpensesTab from './tabs/ExpensesTab.jsx';
import BackupRestoreTab from './tabs/BackupRestoreTab.jsx';
import SettingsTab from './tabs/SettingsTab.jsx';

const TABS = [
  {
    group: 'Customers',
    icon: CustomersIcon,
    items: [
      { key: 'customers', label: 'Directory', icon: CustomersIcon },
      { key: 'billing', label: 'Billing', icon: BillingIcon },
      { key: 'bills', label: 'Bills', icon: BillsIcon },
    ]
  },
  {
    group: 'Artisans',
    icon: CustomersIcon,
    items: [
      { key: 'artisans', label: 'Directory', icon: CustomersIcon },
      { key: 'artisan_billing', label: 'Billing', icon: BillingIcon },
      { key: 'artisan_bills', label: 'Bills', icon: BillsIcon },
    ]
  },
  {
    group: 'Suppliers',
    icon: CustomersIcon,
    items: [
      { key: 'suppliers', label: 'Directory', icon: CustomersIcon },
      { key: 'supplier_billing', label: 'Billing', icon: BillingIcon },
      { key: 'supplier_bills', label: 'Bills', icon: BillsIcon },
    ]
  },
  { key: 'expenses', label: 'Manage Expenses', icon: ExpensesIcon },
  { key: 'backup', label: 'Backup & Restore', icon: BackupIcon },
  { key: 'settings', label: 'Settings', icon: SettingsIcon },
];

const COLLAPSE_KEY = 'sidebar-collapsed';

export default function App() {
  const [activeTab, setActiveTab] = useState('customers');
  const [billsFilterCustomerId, setBillsFilterCustomerId] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const collapsedLoaded = useRef(false);
  const [editingBillId, setEditingBillId] = useState(null);

  const [artisanBillsFilterId, setArtisanBillsFilterId] = useState(null);
  const [editingArtisanBillId, setEditingArtisanBillId] = useState(null);

  const [supplierBillsFilterId, setSupplierBillsFilterId] = useState(null);
  const [editingSupplierBillId, setEditingSupplierBillId] = useState(null);

  // Security Lock States
  const [pinRequired, setPinRequired] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [savedPin, setSavedPin] = useState('');
  const [brandTitle, setBrandTitle] = useState('SHUBH JEWELLERS');
  const [lockTimeout, setLockTimeout] = useState(0);

  // Load encrypted sidebar preference on mount
  useEffect(() => {
    decrypt(localStorage.getItem(COLLAPSE_KEY) || '').then((val) => {
      setCollapsed(val === '1');
      collapsedLoaded.current = true;
    }).catch(() => {
      // Legacy unencrypted or missing — use raw value
      const raw = localStorage.getItem(COLLAPSE_KEY);
      setCollapsed(raw === '1');
      collapsedLoaded.current = true;
    });
  }, []);

  // Persist encrypted sidebar preference
  useEffect(() => {
    if (!collapsedLoaded.current) return;
    encrypt(collapsed ? '1' : '0').then((enc) => {
      localStorage.setItem(COLLAPSE_KEY, enc);
    });
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

  function goToBillsForArtisan(id) {
    setArtisanBillsFilterId(id);
    setActiveTab('artisan_bills');
  }

  function handleEditArtisanBill(billId) {
    setEditingArtisanBillId(billId);
    setActiveTab('artisan_billing');
  }

  function handleArtisanBillingSaved() {
    setEditingArtisanBillId(null);
    setActiveTab('artisan_bills');
  }

  function handleCancelArtisanEdit() {
    setEditingArtisanBillId(null);
    setActiveTab('artisan_bills');
  }

  function goToBillsForSupplier(id) {
    setSupplierBillsFilterId(id);
    setActiveTab('supplier_bills');
  }

  function handleEditSupplierBill(billId) {
    setEditingSupplierBillId(billId);
    setActiveTab('supplier_billing');
  }

  function handleSupplierBillingSaved() {
    setEditingSupplierBillId(null);
    setActiveTab('supplier_bills');
  }

  function handleCancelSupplierEdit() {
    setEditingSupplierBillId(null);
    setActiveTab('supplier_bills');
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
          if (tabKey !== 'billing') setEditingBillId(null);
          if (tabKey !== 'artisan_billing') setEditingArtisanBillId(null);
          if (tabKey !== 'supplier_billing') setEditingSupplierBillId(null);
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

        {activeTab === 'artisans' && <ArtisansTab onViewBills={goToBillsForArtisan} />}
        {activeTab === 'artisan_billing' && (
          <ArtisanBillingTab
            editingBillId={editingArtisanBillId}
            onSaved={handleArtisanBillingSaved}
            onCancelEdit={handleCancelArtisanEdit}
          />
        )}
        {activeTab === 'artisan_bills' && (
          <ArtisanBillsTab
            initialArtisanId={artisanBillsFilterId}
            onFilterConsumed={() => setArtisanBillsFilterId(null)}
            onEditBill={handleEditArtisanBill}
          />
        )}

        {activeTab === 'suppliers' && <SuppliersTab onViewBills={goToBillsForSupplier} />}
        {activeTab === 'supplier_billing' && (
          <SupplierBillingTab
            editingBillId={editingSupplierBillId}
            onSaved={handleSupplierBillingSaved}
            onCancelEdit={handleCancelSupplierEdit}
          />
        )}
        {activeTab === 'supplier_bills' && (
          <SupplierBillsTab
            initialSupplierId={supplierBillsFilterId}
            onFilterConsumed={() => setSupplierBillsFilterId(null)}
            onEditBill={handleEditSupplierBill}
          />
        )}
        {activeTab === 'expenses' && <ExpensesTab />}
        {activeTab === 'backup' && <BackupRestoreTab />}
        {activeTab === 'settings' && <SettingsTab onBrandTitleChange={setBrandTitle} onSettingsChanged={loadSettings} />}
      </main>
    </div>
  );
}

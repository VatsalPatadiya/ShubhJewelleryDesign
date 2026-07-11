import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import { CustomersIcon, BillingIcon, BillsIcon, BackupIcon } from './components/icons/NavIcons.jsx';
import CustomersTab from './tabs/CustomersTab.jsx';
import ProductsBillingTab from './tabs/ProductsBillingTab.jsx';
import BillsTab from './tabs/BillsTab.jsx';
import BackupRestoreTab from './tabs/BackupRestoreTab.jsx';

const TABS = [
  { key: 'customers', label: 'Customers', icon: CustomersIcon },
  { key: 'billing', label: 'Billing', icon: BillingIcon },
  { key: 'bills', label: 'Bills', icon: BillsIcon },
  { key: 'backup', label: 'Backup & Restore', icon: BackupIcon },
];

const COLLAPSE_KEY = 'sidebar-collapsed';

export default function App() {
  const [activeTab, setActiveTab] = useState('customers');
  const [billsFilterCustomerId, setBillsFilterCustomerId] = useState(null);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  function goToBillsForCustomer(customerId) {
    setBillsFilterCustomerId(customerId);
    setActiveTab('bills');
  }

  return (
    <div className="app-shell">
      <Sidebar
        tabs={TABS}
        activeTab={activeTab}
        onSelect={setActiveTab}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      <main className="tab-content">
        {activeTab === 'customers' && <CustomersTab onViewBills={goToBillsForCustomer} />}
        {activeTab === 'billing' && <ProductsBillingTab onSaved={() => setActiveTab('bills')} />}
        {activeTab === 'bills' && (
          <BillsTab
            initialCustomerId={billsFilterCustomerId}
            onFilterConsumed={() => setBillsFilterCustomerId(null)}
          />
        )}
        {activeTab === 'backup' && <BackupRestoreTab />}
      </main>
    </div>
  );
}

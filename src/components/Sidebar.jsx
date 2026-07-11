import { RingIcon, ChevronIcon } from './icons/NavIcons.jsx';

export default function Sidebar({ tabs, activeTab, onSelect, collapsed, onToggleCollapse }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">
          <RingIcon size={20} />
        </span>
        {!collapsed && <span className="sidebar-brand-text">Shubh Jewellers</span>}
      </div>

      <nav className="sidebar-nav">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(tab.key)}
              data-tooltip={collapsed ? tab.label : undefined}
            >
              <span className="sidebar-nav-icon">
                <Icon size={20} />
              </span>
              {!collapsed && <span className="sidebar-nav-label">{tab.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronIcon direction={collapsed ? 'right' : 'left'} size={16} />
          {!collapsed && <span>Collapse</span>}
        </button>
        {!collapsed && <div className="sidebar-version">v1.0.0</div>}
      </div>
    </aside>
  );
}

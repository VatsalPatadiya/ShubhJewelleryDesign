import { useState } from 'react';
import { RingIcon, ChevronIcon } from './icons/NavIcons.jsx';

export default function Sidebar({ brandTitle, tabs, activeTab, onSelect, collapsed, onToggleCollapse }) {
  const [expandedGroup, setExpandedGroup] = useState('Customers');
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">
          <RingIcon size={20} />
        </span>
        {!collapsed && <span className="sidebar-brand-text">{brandTitle}</span>}
      </div>

      <nav className="sidebar-nav">
        {tabs.map((tab, idx) => {
          if (tab.group) {
            const GroupIcon = tab.icon;
            const isExpanded = expandedGroup === tab.group && !collapsed;
            const isGroupActive = tab.items.some(item => item.key === activeTab);
            
            return (
              <div key={`group-${idx}`} className="sidebar-group">
                <button
                  className={`sidebar-nav-item ${isGroupActive && !isExpanded ? 'active' : ''}`}
                  onClick={() => {
                    if (collapsed) onToggleCollapse();
                    setExpandedGroup(isExpanded ? null : tab.group);
                  }}
                  data-tooltip={collapsed ? tab.group : undefined}
                >
                  <span className="sidebar-nav-icon">
                    <GroupIcon size={20} />
                  </span>
                  {!collapsed && <span className="sidebar-nav-label">{tab.group}</span>}
                  {!collapsed && (
                    <span className="sidebar-nav-chevron" style={{ marginLeft: 'auto', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                      <ChevronIcon direction="right" size={16} />
                    </span>
                  )}
                </button>
                
                {isExpanded && !collapsed && (
                  <div className="sidebar-subnav" style={{ marginLeft: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {tab.items.map(item => {
                      const SubIcon = item.icon;
                      const isActive = activeTab === item.key;
                      return (
                        <button
                          key={item.key}
                          className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                          onClick={() => onSelect(item.key)}
                        >
                          <span className="sidebar-nav-icon" style={{ transform: 'scale(0.85)' }}>
                            <SubIcon size={20} />
                          </span>
                          <span className="sidebar-nav-label" style={{ fontSize: '13px' }}>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Render flat tab
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

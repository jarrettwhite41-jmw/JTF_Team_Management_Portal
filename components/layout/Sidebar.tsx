import React from 'react';
import { PageType, NavigationItem } from '../../types';

interface SidebarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const navigationItems: NavigationItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'personnel', label: 'Personnel', icon: '👥' },
    { id: 'cast', label: 'Cast', icon: '🎭' },
    { id: 'crew', label: 'Crew', icon: '🛠️' },
    { id: 'bartenders', label: 'Bartenders', icon: '🍺' },
    { id: 'classes', label: 'Classes', icon: '📚' },
    { id: 'shows', label: 'Shows', icon: '🎬' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'scheduling', label: 'Schedule', icon: '📅' },
    { id: 'student-directory', label: 'Students', icon: '🎓' }
  ];

  return (
    <div className="jtf-sidebar h-full w-64 flex flex-col flex-shrink-0 shadow-xl">

      {/* Brand Header */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span className="jtf-logo-text">Just The Funny</span>
        <p className="jtf-logo-sub">Team Portal</p>
        <div className="mt-3 h-px" style={{ background: 'linear-gradient(to right, #dc2626, #eab308, transparent)' }} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 pt-4 overflow-y-auto">
        <p className="jtf-nav-label">Navigation</p>
        <ul className="space-y-0.5">
          {navigationItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
                  currentPage === item.id ? 'jtf-nav-active' : 'jtf-nav-item'
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
                {currentPage === item.id && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#eab308' }} />
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-xs" style={{ color: '#4b5563' }}>© {new Date().getFullYear()} Just The Funny</p>
      </div>

    </div>
  );
};
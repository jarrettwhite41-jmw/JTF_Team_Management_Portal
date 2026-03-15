import React from 'react';
import { PageType, NavigationItem } from '../../types';

interface SidebarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen = false, onClose }) => {
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

  const handleNavigate = (page: PageType) => {
    onNavigate(page);
    onClose?.();
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <div
        className={[
          'jtf-sidebar flex flex-col shadow-xl',
          'fixed inset-y-0 left-0 z-50 w-64',
          'transition-transform duration-300 ease-in-out',
          'md:relative md:inset-auto md:z-auto md:h-full md:flex-shrink-0 md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Brand Header */}
        <div className="px-5 pt-6 pb-5 flex items-start justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <span className="jtf-logo-text">Just The Funny</span>
            <p className="jtf-logo-sub">Team Portal</p>
            <div className="mt-3 h-px" style={{ background: 'linear-gradient(to right, #dc2626, #eab308, transparent)' }} />
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 ml-2 mt-0.5"
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 pt-4 overflow-y-auto">
          <p className="jtf-nav-label">Navigation</p>
          <ul className="space-y-0.5">
            {navigationItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigate(item.id)}
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
    </>
  );
};
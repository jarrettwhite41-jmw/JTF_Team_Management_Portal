import React, { useEffect, useMemo, useState } from 'react';
import { PageType, NavigationItem } from '../../types';

interface SidebarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen = false, onClose }) => {
  const topLevelItems: NavigationItem[] = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'scheduling', label: 'Schedule', icon: '📅' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
  ], []);

  const managementGroups = useMemo(() => [
    {
      id: 'personnel-management',
      label: 'Personnel Management',
      icon: '👥',
      defaultPage: 'personnel-management' as PageType,
      children: [
        { id: 'personnel-management', label: 'Personnel Directory', icon: '🗂️' },
        { id: 'student-directory', label: 'Student Management', icon: '🎓' },
        { id: 'cast', label: 'Cast Management', icon: '🎭' },
        { id: 'teacher-management', label: 'Teacher Management', icon: '🧑‍🏫' },
        { id: 'director-management', label: 'Director Management', icon: '🎬' },
        { id: 'special-guests', label: 'Special Guests', icon: '🎤' },
      ] as NavigationItem[],
    },
    {
      id: 'show-management',
      label: 'Show Management',
      icon: '🎪',
      defaultPage: 'show-management' as PageType,
      children: [
        { id: 'show-management', label: 'Shows', icon: '🎬' },
        { id: 'crew', label: 'Crew Assignments', icon: '🛠️' },
        { id: 'bartenders', label: 'Bartenders', icon: '🍺' },
        { id: 'cast', label: 'Cast Management', icon: '🎭' },
      ] as NavigationItem[],
    },
    {
      id: 'class-management',
      label: 'Class Management',
      icon: '📚',
      defaultPage: 'class-management' as PageType,
      children: [
        { id: 'class-management', label: 'Classes', icon: '📘' },
        { id: 'student-directory', label: 'Student Management', icon: '🎓' },
        { id: 'teacher-management', label: 'Teacher Management', icon: '🧑‍🏫' },
        { id: 'special-guests', label: 'Special Guests', icon: '🎤' },
        { id: 'workshops', label: 'Workshops', icon: '🧠' },
      ] as NavigationItem[],
    },
  ], []);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(managementGroups.map((group) => group.id))
  );

  useEffect(() => {
    const owningGroup = managementGroups.find((group) => group.children.some((item) => item.id === currentPage));
    if (!owningGroup) return;
    setExpandedGroups((prev) => {
      if (prev.has(owningGroup.id)) return prev;
      const next = new Set(prev);
      next.add(owningGroup.id);
      return next;
    });
  }, [currentPage, managementGroups]);

  const handleNavigate = (page: PageType) => {
    onNavigate(page);
    onClose?.();
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
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
          'bg-slate-900 flex flex-col shadow-xl',
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
            <div className="mt-3 h-px" style={{ background: 'linear-gradient(to right, #ef4444, #eab308, transparent)' }} />
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
          <ul className="space-y-0.5 mb-3">
            {topLevelItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
                    currentPage === item.id
                      ? 'bg-sky-500 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  }`}
                >
                  <span className="text-lg leading-none">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="space-y-2">
            {managementGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.id);
              const hasActiveChild = group.children.some((item) => item.id === currentPage);

              return (
                <div key={group.id} className="rounded-lg border border-slate-800/80 overflow-hidden">
                  <button
                    onClick={() => {
                      handleNavigate(group.defaultPage);
                      toggleGroup(group.id);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                      hasActiveChild ? 'bg-slate-800 text-slate-100' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-base leading-none">{group.icon}</span>
                      <span className="text-sm font-semibold">{group.label}</span>
                    </span>
                    <span className={`text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                  </button>

                  {isExpanded && (
                    <ul className="bg-slate-900/70 px-2 py-2 space-y-1">
                      {group.children.map((item) => (
                        <li key={`${group.id}-${item.id}`}>
                          <button
                            onClick={() => handleNavigate(item.id)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors ${
                              currentPage === item.id
                                ? 'bg-sky-500 text-white'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                            }`}
                          >
                            <span className="text-sm leading-none">{item.icon}</span>
                            <span className="text-xs font-medium">{item.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs" style={{ color: '#4b5563' }}>© {new Date().getFullYear()} Just The Funny</p>
        </div>

      </div>
    </>
  );
};
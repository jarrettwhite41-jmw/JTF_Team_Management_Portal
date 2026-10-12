import React, { useEffect, useMemo, useState } from 'react';
import { PageType, NavigationItem, PortalAccessRole } from '../../types';

interface SidebarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  roleLabel?: PortalAccessRole | null;
  currentUserEmail?: string | null;
  onSignOut?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  roleLabel,
  currentUserEmail,
  onSignOut,
  isOpen = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const canAccessItem = (role: PortalAccessRole | null | undefined, page: PageType): boolean => {
    if (!role) return false;
    if (role === 'admin' || role === 'manager') return true;
    if (role === 'director') return ['dashboard', 'scheduling', 'crm-operations', 'show-management', 'shows', 'ticketing', 'crew', 'cast', 'special-guests', 'director-management'].includes(page);
    if (role === 'teacher') return ['dashboard', 'scheduling', 'crm-operations', 'class-management', 'classes', 'student-directory', 'student-profile', 'teacher-management', 'workshops', 'skills-management'].includes(page);
    if (role === 'cast') return ['dashboard', 'scheduling', 'cast', 'shows', 'show-management'].includes(page);
    if (role === 'student') return page === 'dashboard';
    return page === 'dashboard';
  };
  const topLevelItems: NavigationItem[] = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'scheduling', label: 'Schedule', icon: '📅' },
    { id: 'crm-operations', label: 'Theater CRM & Ops', icon: '🏢' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
  ].filter(item => canAccessItem(roleLabel, item.id)), [roleLabel]);

  const managementGroups = useMemo(() => [
    {
      id: 'show-management',
      label: 'Shows & Production',
      icon: '🎭',
      defaultPage: 'show-management' as PageType,
      children: [
        { id: 'show-management', label: 'Shows', icon: '🎬' },
        { id: 'ticketing', label: 'Ticketing & Sales', icon: '🎟️' },
        { id: 'crew', label: 'Crew Assignments', icon: '🛠️' },
        { id: 'cast', label: 'Cast Management', icon: '🎭' },
        { id: 'bartenders', label: 'Bartender Management', icon: '🍺' },
        { id: 'games', label: 'Games', icon: '🎲' },
      ] as NavigationItem[],
    },
    {
      id: 'people-management',
      label: 'People & Staffing',
      icon: '👥',
      defaultPage: 'personnel-management' as PageType,
      children: [
        { id: 'personnel-management', label: 'Company Roster', icon: '🗂️' },
        { id: 'teacher-management', label: 'Instructors', icon: '🧑‍🏫' },
        { id: 'director-management', label: 'Show Directors', icon: '🎬' },
        { id: 'special-guests', label: 'Guest Artists', icon: '🎤' },
        { id: 'portal-access', label: 'User Roles & Logins', icon: '🔐' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
        { id: 'account-recovery', label: 'Account Help', icon: '🔧' },
      ] as NavigationItem[],
    },
    {
      id: 'class-management',
      label: 'Classes & Conservatory',
      icon: '📘',
      defaultPage: 'class-management' as PageType,
      children: [
        { id: 'class-management', label: 'Class Offerings', icon: '📘' },
        { id: 'student-directory', label: 'Student Directory', icon: '🎓' },
        { id: 'workshops', label: 'Workshops', icon: '🧠' },
        { id: 'skills-management', label: 'Curriculum & Skills', icon: '⭐' },
      ] as NavigationItem[],
    },
  ].map(group => ({
    ...group,
    children: group.children.filter(child => canAccessItem(roleLabel, child.id)),
  })).filter(group => group.children.length > 0), [roleLabel]);  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
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
          'jtf-sidebar flex flex-col shadow-xl',
          'fixed inset-y-0 left-0 z-50',
          isCollapsed ? 'w-16' : 'w-64',
          'transition-all duration-300 ease-in-out',
          'md:relative md:inset-auto md:z-auto md:h-full md:flex-shrink-0 md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Brand Header */}
        <div className={`px-4 pt-4 pb-3 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-white/10`}>
          {!isCollapsed ? (
            <div className="flex flex-col min-w-0">
              <img src="/logo.png" alt="Just The Funny" className="h-8 w-auto object-contain max-w-[150px]" />
              <p className="jtf-logo-sub">Team Portal</p>
            </div>
          ) : (
            <span className="text-xl font-black text-blue-400">JTF</span>
          )}

          <div className="flex items-center gap-1">
            {/* Collapse toggle button — visible on tablet/desktop/landscape */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Close button — mobile only */}
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              aria-label="Close menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 pt-3 overflow-y-auto overflow-x-hidden">
          {!isCollapsed && <p className="jtf-nav-label">Navigation</p>}
          <ul className="space-y-0.5 mb-3">
            {topLevelItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigate(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2.5 rounded-lg text-left transition-all duration-150 ${
                    currentPage === item.id
                      ? 'jtf-nav-active'
                      : 'jtf-nav-item'
                  }`}
                >
                  <span className="text-lg leading-none">{item.icon}</span>
                  {!isCollapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>

          <div className="space-y-2">
            {managementGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.id);
              const hasActiveChild = group.children.some((item) => item.id === currentPage);

              if (isCollapsed) {
                // Collapsed: show icon for default page or first active child
                return (
                  <div key={group.id} className="flex justify-center">
                    <button
                      onClick={() => handleNavigate(group.defaultPage)}
                      title={group.label}
                      className={`p-2.5 rounded-lg transition-colors ${
                        hasActiveChild ? 'jtf-nav-active' : 'jtf-nav-item hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-lg leading-none">{group.icon}</span>
                    </button>
                  </div>
                );
              }

              return (
                <div key={group.id} className="rounded-lg border border-slate-800/80 overflow-hidden">
                  <button
                    onClick={() => {
                      handleNavigate(group.defaultPage);
                      toggleGroup(group.id);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                      hasActiveChild ? 'jtf-nav-active-soft' : 'jtf-nav-item'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="text-base leading-none">{group.icon}</span>
                      <span className="text-sm font-semibold truncate">{group.label}</span>
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
                                ? 'jtf-nav-active'
                                : 'jtf-nav-item'
                            }`}
                          >
                            <span className="text-sm leading-none">{item.icon}</span>
                            <span className="text-xs font-medium truncate">{item.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {canAccessItem(roleLabel, 'data-import') && (
            <div className={`mt-4 pt-4 border-t border-white/10 ${isCollapsed ? 'flex justify-center' : ''}`}>
              <button
                onClick={() => handleNavigate('data-import')}
                title={isCollapsed ? 'Spreadsheet Roster Upload' : undefined}
                className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'w-full gap-3 px-3'} py-2.5 rounded-lg text-left transition-all duration-150 ${
                  currentPage === 'data-import'
                    ? 'jtf-nav-active font-semibold'
                    : 'jtf-nav-item'
                }`}
              >
                <span className="text-lg leading-none">📊</span>
                {!isCollapsed && <span className="text-sm truncate">Spreadsheet Import</span>}
              </button>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className={`px-3 py-3 border-t border-white/10 ${isCollapsed ? 'text-center' : ''}`}>
          {!isCollapsed && (currentUserEmail || roleLabel) && (
            <div className="mb-2">
              {currentUserEmail && <p className="text-xs text-slate-300 truncate">{currentUserEmail}</p>}
              {roleLabel && <p className="text-[11px] uppercase tracking-wide text-slate-500">Role: {roleLabel}</p>}
            </div>
          )}
          {onSignOut && (
            <button
              onClick={onSignOut}
              title={isCollapsed ? 'Sign Out' : undefined}
              className={`mb-2 rounded-lg text-slate-200 border border-slate-700 hover:bg-slate-800 transition-colors ${
                isCollapsed ? 'p-2 inline-flex justify-center' : 'w-full px-3 py-2 text-sm'
              }`}
            >
              {isCollapsed ? '↩️' : 'Sign Out'}
            </button>
          )}
          {!isCollapsed && <p className="text-xs text-slate-500">© {new Date().getFullYear()} Just The Funny</p>}
        </div>

      </div>
    </>
  );
};

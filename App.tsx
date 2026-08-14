import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { PersonnelDirectory } from './pages/PersonnelDirectory';
import { CastDirectory } from './pages/CastDirectory';
import { CrewDirectory } from './pages/CrewDirectory';
import { BartendersPage } from './pages/BartendersPage';
import { ClassRegistration } from './pages/ClassRegistration';
import { Shows } from './pages/Shows';
import { Games } from './pages/Games';
import { Workshops } from './pages/Workshops';
import { SpecialGuests } from './pages/SpecialGuests';
import { InventoryPage } from './pages/Inventory';
import { Scheduling } from './pages/Scheduling';
import { StudentDirectory } from './pages/StudentDirectory';
import { StudentProfile } from './pages/StudentProfile';
import { TeacherManagement } from './pages/TeacherManagement';
import { DirectorManagement } from './pages/DirectorManagement';
import { PortalAccess } from './pages/PortalAccess';
import { DataImport } from './pages/DataImport';
import { AccountRecovery } from './pages/AccountRecovery';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { SkillsManagement } from './pages/SkillsManagement';
import { Loader } from './components/common/Loader';
import { authService } from './services/authService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { PageType, PortalAccessRole } from './types';

const TEAM_PAGE_STORAGE_KEY = 'team:current-page';
const TEAM_STUDENT_STORAGE_KEY = 'team:selected-student';
const HUB_URL = (import.meta.env.VITE_PORTAL_HUB_URL as string | undefined)?.trim() || 'https://jtf-hub.vercel.app';

const TEAM_PAGE_SET = new Set<PageType>([
  'dashboard', 'games', 'personnel-management', 'personnel', 'cast', 'crew', 'bartenders',
  'class-management', 'classes', 'show-management', 'shows', 'workshops',
  'special-guests', 'teacher-management', 'director-management', 'portal-access',
  'data-import', 'inventory', 'scheduling', 'student-directory', 'student-profile', 'account-recovery', 'skills-management', 'settings',
]);

const getInitialTeamPage = (): PageType => {
  if (typeof window === 'undefined') return 'dashboard';
  const saved = window.sessionStorage.getItem(TEAM_PAGE_STORAGE_KEY) as PageType | null;
  return saved && TEAM_PAGE_SET.has(saved) ? saved : 'dashboard';
};

const getInitialSelectedStudent = (): number | null => {
  if (typeof window === 'undefined') return null;
  const saved = window.sessionStorage.getItem(TEAM_STUDENT_STORAGE_KEY);
  if (!saved) return null;
  const parsed = Number(saved);
  return Number.isFinite(parsed) ? parsed : null;
};

const canAccessPage = (role: PortalAccessRole, page: PageType): boolean => {
  const adminPages: PageType[] = [
    'personnel-management', 'personnel', 'cast', 'crew', 'bartenders',
    'class-management', 'classes', 'show-management', 'shows', 'games', 'workshops',
    'special-guests', 'teacher-management', 'director-management', 'portal-access',
    'data-import', 'inventory', 'scheduling', 'student-directory', 'student-profile', 'skills-management', 'settings',
  ];

  if (role === 'admin' || role === 'manager') return true;
  if (role === 'director') return ['dashboard', 'scheduling', 'show-management', 'shows', 'crew', 'cast', 'special-guests', 'director-management'].includes(page);
  if (role === 'teacher') return ['dashboard', 'scheduling', 'class-management', 'classes', 'student-directory', 'student-profile', 'teacher-management', 'workshops', 'skills-management'].includes(page);
  if (role === 'cast') return ['dashboard', 'scheduling', 'cast', 'shows', 'show-management'].includes(page);
  if (role === 'student') return ['dashboard'].includes(page);

  return !adminPages.includes(page) || page === 'dashboard';
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>(getInitialTeamPage);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(getInitialSelectedStudent);
  const [pageHistory, setPageHistory] = useState<PageType[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSectionsOpen, setIsMobileSectionsOpen] = useState(false);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<PortalAccessRole | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      if (!isSupabaseConfigured()) {
        if (!mounted) return;
        setAuthError('Supabase auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
        setAuthLoading(false);
        return;
      }

      try {
        const user = await authService.getCurrentUser();
        if (!mounted) return;
        setSessionUserId(user?.id ?? null);
        setSessionEmail(user?.email ?? null);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    initializeAuth();

    const { data } = authService.onAuthStateChange((_event, session) => {
      setSessionUserId(session?.user?.id ?? null);
      setSessionEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    const loadRole = async () => {
      if (!sessionUserId) {
        setUserRole(null);
        setAccessDenied(false);
        return;
      }

      const result = await authService.getTeamPortalRole(sessionUserId, sessionEmail);
      if (!result.success || !result.role) {
        setAccessDenied(true);
        setUserRole(null);
        return;
      }

      setUserRole(result.role);
      setAccessDenied(false);
    };

    loadRole();
  }, [sessionUserId, sessionEmail]);

  React.useEffect(() => {
    if (!userRole) return;
    if (canAccessPage(userRole, currentPage)) return;
    setCurrentPage('dashboard');
  }, [userRole, currentPage]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(TEAM_PAGE_STORAGE_KEY, currentPage);
    if (selectedStudentId) {
      window.sessionStorage.setItem(TEAM_STUDENT_STORAGE_KEY, String(selectedStudentId));
    } else {
      window.sessionStorage.removeItem(TEAM_STUDENT_STORAGE_KEY);
    }
  }, [currentPage, selectedStudentId]);

  const navigateToPage = (page: PageType) => {
    setPageHistory((prev) => (page !== currentPage ? [...prev, currentPage].slice(-20) : prev));
    setCurrentPage(page);
    if (page !== 'student-profile') setSelectedStudentId(null);
  };

  const handleBackPage = () => {
    setPageHistory((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const lastPage = next.pop();
      if (lastPage) {
        setCurrentPage(lastPage);
        if (lastPage !== 'student-profile') setSelectedStudentId(null);
      }
      return next;
    });
  };

  const handleSignOut = async () => {
    await authService.signOut();
    setCurrentPage('dashboard');
    setSelectedStudentId(null);
    setPageHistory([]);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(TEAM_PAGE_STORAGE_KEY);
      window.sessionStorage.removeItem(TEAM_STUDENT_STORAGE_KEY);
    }
  };

  const renderPage = () => {
    if (userRole && !canAccessPage(userRole, currentPage)) {
      return (
        <div className="p-6">
          <div className="max-w-xl bg-white rounded-xl border p-6 shadow-card">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h1>
            <p className="text-sm text-gray-600">Your Team role does not have access to this section.</p>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return (
          <>
            <div className="md:hidden">
              <div className="bg-slate-100 p-4 pb-20">
                <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-lg">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">JTF Team</p>
                  <h1 className="mt-1 text-2xl font-bold">Team</h1>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleMobileNavigate('dashboard')}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm"
                  >
                    <span className="block text-[11px] uppercase tracking-[0.14em] text-slate-500">Dashboard</span>
                    <span className="mt-2 block text-lg font-semibold text-slate-800">Home</span>
                  </button>
                  <button
                    onClick={() => handleMobileNavigate('show-management')}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm"
                  >
                    <span className="block text-[11px] uppercase tracking-[0.14em] text-slate-500">Shows</span>
                    <span className="mt-2 block text-lg font-semibold text-slate-800">Shows</span>
                  </button>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800">Needs attention</h2>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Open</p>
                      <div className="mt-1 text-3xl font-bold text-slate-900">12</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Gap</p>
                      <div className="mt-1 text-3xl font-bold text-slate-900">4</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800">Show pipeline</h2>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-800">Midnight Run</p>
                          <p className="mt-1 text-sm text-slate-500">Sep 18 • 8:00 PM</p>
                        </div>
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">Waiting</span>
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">Director</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-800">Guest Workshop</p>
                          <p className="mt-1 text-sm text-slate-500">Sep 20 • 2:00 PM</p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">Confirmed</span>
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">Staffed</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-800">Quick tasks</h2>
                  <div className="mt-3 space-y-2">
                    <button
                      onClick={() => handleMobileNavigate('show-management')}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left"
                    >
                      <div>
                        <p className="text-base font-semibold text-slate-800">Assign director</p>
                        <p className="text-sm text-slate-500">Show</p>
                      </div>
                      <span className="text-sm font-semibold text-amber-600">Action</span>
                    </button>
                    <button
                      onClick={() => handleMobileNavigate('cast')}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left"
                    >
                      <div>
                        <p className="text-base font-semibold text-slate-800">Update availability</p>
                        <p className="text-sm text-slate-500">Cast</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-600">Ready</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <Dashboard onNavigate={navigateToPage} />
            </div>
          </>
        );
      case 'personnel-management':
      case 'personnel':
        return <PersonnelDirectory />;
      case 'cast':
        return <CastDirectory canManageGames={userRole === 'admin' || userRole === 'manager'} />;
      case 'crew':
        return <CrewDirectory />;
      case 'bartenders':
        return <BartendersPage />;
      case 'teacher-management':
        return <TeacherManagement onNavigate={navigateToPage} />;
      case 'director-management':
        return <DirectorManagement onNavigate={navigateToPage} />;
      case 'portal-access':
        return <PortalAccess />;
      case 'class-management':
      case 'classes':
        return <ClassRegistration onNavigate={navigateToPage} />;
      case 'show-management':
      case 'shows':
        return <Shows onNavigate={navigateToPage} />;
      case 'games':
        return <Games />;
      case 'workshops':
        return <Workshops />;
      case 'special-guests':
        return <SpecialGuests />;
      case 'inventory':
        return <InventoryPage />;
      case 'data-import':
        return <DataImport />;
      case 'account-recovery':
        return <AccountRecovery />;
      case 'scheduling':
        return <Scheduling />;
      case 'student-directory':
        return <StudentDirectory onNavigateToStudent={(id) => {
          setSelectedStudentId(id);
          navigateToPage('student-profile');
        }} />;
      case 'student-profile':
        return selectedStudentId ? (
          <StudentProfile 
            studentId={selectedStudentId} 
            onBack={() => navigateToPage('student-directory')} 
          />
        ) : <StudentDirectory onNavigateToStudent={(id) => {
          setSelectedStudentId(id);
          navigateToPage('student-profile');
        }} />;
      case 'skills-management':
        return <SkillsManagement />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-50">
        <Loader text="Checking login session..." />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-50 p-6">
        <div className="max-w-xl bg-white rounded-xl border p-6 shadow-card">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Auth Setup Required</h1>
          <p className="text-sm text-gray-600 mb-2">{authError}</p>
          <p className="text-xs text-gray-500">The Team portal now requires login for all users.</p>
        </div>
      </div>
    );
  }

  if (!sessionUserId) {
    return <Login />;
  }

  if (accessDenied || !userRole) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-50 p-6">
        <div className="max-w-xl bg-white rounded-xl border p-6 shadow-card">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Access Not Authorized</h1>
          <p className="text-sm text-gray-600 mb-4">
            Your account is signed in, but it is not mapped to an active Team portal role yet.
          </p>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const mobileTopLevelSections: Array<{ id: PageType; label: string; icon: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'scheduling', label: 'Schedule', icon: '📅' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'data-import', label: 'Import Center', icon: '⬆️' },
  ].filter((item) => canAccessPage(userRole, item.id));

  const mobileSectionGroups: Array<{ label: string; icon: string; pages: Array<{ id: PageType; label: string; icon: string }> }> = [
    {
      label: 'Personnel',
      icon: '👥',
      pages: [
        { id: 'personnel-management', label: 'Personnel Directory', icon: '🗂️' },
        { id: 'cast', label: 'Cast Management', icon: '🎭' },
        { id: 'bartenders', label: 'Bartenders', icon: '🍺' },
        { id: 'teacher-management', label: 'Teachers', icon: '🧑‍🏫' },
        { id: 'director-management', label: 'Directors', icon: '🎬' },
        { id: 'portal-access', label: 'Portal Access', icon: '🔐' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
        { id: 'account-recovery', label: 'Account Recovery', icon: '🔧' },
        { id: 'special-guests', label: 'Special Guests', icon: '🎤' },
      ].filter((item) => canAccessPage(userRole, item.id)),
    },
    {
      label: 'Shows',
      icon: '🎪',
      pages: [
        { id: 'show-management', label: 'Shows', icon: '🎬' },
        { id: 'crew', label: 'Crew Assignments', icon: '🛠️' },
        { id: 'games', label: 'Games', icon: '🎲' },
      ].filter((item) => canAccessPage(userRole, item.id)),
    },
    {
      label: 'Classes',
      icon: '📚',
      pages: [
        { id: 'class-management', label: 'Classes', icon: '📘' },
        { id: 'student-directory', label: 'Student Directory', icon: '🎓' },
        { id: 'teacher-management', label: 'Teachers', icon: '🧑‍🏫' },
        { id: 'workshops', label: 'Workshops', icon: '🧠' },
        { id: 'skills-management', label: 'Skills', icon: '⭐' },
      ].filter((item) => canAccessPage(userRole, item.id)),
    },
  ].filter((group) => group.pages.length > 0);

  const handleMobileNavigate = (page: PageType) => {
    if (canAccessPage(userRole, page)) {
      navigateToPage(page);
      setIsMobileSectionsOpen(false);
      setIsMobileActionsOpen(false);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="flex w-full h-full min-h-0 min-w-0 bg-slate-100 overflow-hidden">
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => {
          if (canAccessPage(userRole, page)) navigateToPage(page);
        }}
        roleLabel={userRole}
        currentUserEmail={sessionEmail}
        onSignOut={handleSignOut}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto pb-20 md:pb-0">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackPage}
              disabled={pageHistory.length === 0}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
            <button
              onClick={() => { window.location.href = HUB_URL; }}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Portal Hub
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
            >
              Refresh
            </button>
          </div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{currentPage.replace(/-/g, ' ')}</p>
        </div>
        {renderPage()}
      </main>

      {/* Mobile sections sheet for nested navigation */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${
          (isMobileSectionsOpen || isMobileActionsOpen) ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => {
          setIsMobileSectionsOpen(false);
          setIsMobileActionsOpen(false);
        }}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-x-0 bottom-16 z-50 max-h-[65vh] overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 shadow-2xl transition-transform duration-300 md:hidden ${
          isMobileSectionsOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Sections</h2>
          <button
            onClick={() => setIsMobileSectionsOpen(false)}
            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        {mobileTopLevelSections.length > 0 && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Quick Access</h3>
            <div className="grid grid-cols-2 gap-2">
              {mobileTopLevelSections.map((item) => (
                <button
                  key={`quick-${item.id}`}
                  onClick={() => handleMobileNavigate(item.id)}
                  className={`rounded-lg px-3 py-2 text-left text-sm ${
                    currentPage === item.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {mobileSectionGroups.map((group) => (
            <section key={group.label} className="rounded-xl border border-slate-200 bg-white p-3">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">
                <span className="mr-2">{group.icon}</span>
                {group.label}
              </h3>
              <div className="grid grid-cols-1 gap-1.5">
                {group.pages.map((item) => (
                  <button
                    key={`group-${group.label}-${item.id}`}
                    onClick={() => handleMobileNavigate(item.id)}
                    className={`rounded-lg px-3 py-2 text-left text-sm ${
                      currentPage === item.id
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Mobile actions sheet (replaces sidebar usage on phone) */}
      <div
        className={`fixed inset-x-0 bottom-16 z-50 max-h-[55vh] overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-4 shadow-2xl transition-transform duration-300 md:hidden ${
          isMobileActionsOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Quick Actions</h2>
          <button
            onClick={() => setIsMobileActionsOpen(false)}
            className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Signed In</p>
          <p className="mt-1 truncate text-sm font-medium text-slate-700">{sessionEmail || 'Team user'}</p>
          <p className="mt-0.5 text-xs uppercase tracking-wide text-slate-500">Role: {userRole}</p>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2">
          {canAccessPage(userRole, 'data-import') && (
            <button
              onClick={() => handleMobileNavigate('data-import')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <span className="mr-2">⬆️</span>
              Import Center
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-100"
          >
            <span className="mr-2">↩️</span>
            Sign Out
          </button>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto grid h-16 max-w-2xl grid-cols-4 px-2">
          <button
            onClick={() => handleMobileNavigate('dashboard')}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium ${
              currentPage === 'dashboard' ? 'text-primary-600' : 'text-slate-500'
            }`}
          >
            <span className="text-lg">🏠</span>
            Home
          </button>
          <button
            onClick={() => handleMobileNavigate('show-management')}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium ${
              currentPage === 'show-management' || currentPage === 'shows' ? 'text-primary-600' : 'text-slate-500'
            }`}
          >
            <span className="text-lg">🎬</span>
            Shows
          </button>
          <button
            onClick={() => handleMobileNavigate('personnel-management')}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium ${
              currentPage === 'personnel-management' || currentPage === 'personnel' || currentPage === 'cast' || currentPage === 'crew' ? 'text-primary-600' : 'text-slate-500'
            }`}
          >
            <span className="text-lg">👥</span>
            Staff
          </button>
          <button
            onClick={() => {
              setIsMobileSectionsOpen(false);
              setIsMobileActionsOpen((prev) => !prev);
            }}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium ${
              isMobileActionsOpen ? 'text-primary-600' : 'text-slate-500'
            }`}
            aria-label="Open quick actions"
          >
            <span className="text-lg">⋯</span>
            More
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;





import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { PersonnelDirectory } from './pages/PersonnelDirectory';
import { CastDirectory } from './pages/CastDirectory';
import { CrewDirectory } from './pages/CrewDirectory';
import { BartendersPage } from './pages/BartendersPage';
import { ClassRegistration } from './pages/ClassRegistration';
import { Shows } from './pages/Shows';
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
import { Login } from './pages/Login';
import { Loader } from './components/common/Loader';
import { authService } from './services/authService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { PageType, PortalAccessRole } from './types';

const canAccessPage = (role: PortalAccessRole, page: PageType): boolean => {
  const adminPages: PageType[] = [
    'personnel-management', 'personnel', 'cast', 'crew', 'bartenders',
    'class-management', 'classes', 'show-management', 'shows', 'workshops',
    'special-guests', 'teacher-management', 'director-management', 'portal-access',
    'data-import', 'inventory', 'scheduling', 'student-directory', 'student-profile',
  ];

  if (role === 'admin' || role === 'manager') return true;
  if (role === 'director') return ['dashboard', 'scheduling', 'show-management', 'shows', 'crew', 'cast', 'special-guests', 'director-management'].includes(page);
  if (role === 'teacher') return ['dashboard', 'scheduling', 'class-management', 'classes', 'student-directory', 'student-profile', 'teacher-management', 'workshops'].includes(page);
  if (role === 'cast') return ['dashboard', 'scheduling', 'cast', 'shows', 'show-management'].includes(page);
  if (role === 'student') return ['dashboard'].includes(page);

  return !adminPages.includes(page) || page === 'dashboard';
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSectionsOpen, setIsMobileSectionsOpen] = useState(false);
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

  const handleSignOut = async () => {
    await authService.signOut();
    setCurrentPage('dashboard');
    setSelectedStudentId(null);
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
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'personnel-management':
      case 'personnel':
        return <PersonnelDirectory />;
      case 'cast':
        return <CastDirectory />;
      case 'crew':
        return <CrewDirectory />;
      case 'bartenders':
        return <BartendersPage />;
      case 'teacher-management':
        return <TeacherManagement onNavigate={setCurrentPage} />;
      case 'director-management':
        return <DirectorManagement onNavigate={setCurrentPage} />;
      case 'portal-access':
        return <PortalAccess />;
      case 'class-management':
      case 'classes':
        return <ClassRegistration onNavigate={setCurrentPage} />;
      case 'show-management':
      case 'shows':
        return <Shows onNavigate={setCurrentPage} />;
      case 'workshops':
        return <Workshops />;
      case 'special-guests':
        return <SpecialGuests />;
      case 'inventory':
        return <InventoryPage />;
      case 'data-import':
        return <DataImport />;
      case 'scheduling':
        return <Scheduling />;
      case 'student-directory':
        return <StudentDirectory onNavigateToStudent={(id) => {
          setSelectedStudentId(id);
          setCurrentPage('student-profile');
        }} />;
      case 'student-profile':
        return selectedStudentId ? (
          <StudentProfile 
            studentId={selectedStudentId} 
            onBack={() => setCurrentPage('student-directory')} 
          />
        ) : <StudentDirectory onNavigateToStudent={(id) => {
          setSelectedStudentId(id);
          setCurrentPage('student-profile');
        }} />;
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
        { id: 'special-guests', label: 'Special Guests', icon: '🎤' },
      ].filter((item) => canAccessPage(userRole, item.id)),
    },
    {
      label: 'Shows',
      icon: '🎪',
      pages: [
        { id: 'show-management', label: 'Shows', icon: '🎬' },
        { id: 'crew', label: 'Crew Assignments', icon: '🛠️' },
      ].filter((item) => canAccessPage(userRole, item.id)),
    },
    {
      label: 'Classes',
      icon: '📚',
      pages: [
        { id: 'class-management', label: 'Classes', icon: '📘' },
        { id: 'student-directory', label: 'Student Directory', icon: '🎓' },
        { id: 'workshops', label: 'Workshops', icon: '🧠' },
      ].filter((item) => canAccessPage(userRole, item.id)),
    },
  ].filter((group) => group.pages.length > 0);

  const handleMobileNavigate = (page: PageType) => {
    if (canAccessPage(userRole, page)) {
      setCurrentPage(page);
      setIsMobileSectionsOpen(false);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="flex w-full h-full min-h-0 min-w-0 bg-slate-100 overflow-hidden">
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => {
          if (canAccessPage(userRole, page)) setCurrentPage(page);
        }}
        roleLabel={userRole}
        currentUserEmail={sessionEmail}
        onSignOut={handleSignOut}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto pb-20 md:pb-0">
        {renderPage()}
      </main>

      {/* Mobile sections sheet for nested navigation */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${
          isMobileSectionsOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsMobileSectionsOpen(false)}
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

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="mx-auto grid h-16 max-w-2xl grid-cols-4 px-2">
          <button
            onClick={() => handleMobileNavigate('dashboard')}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium ${
              currentPage === 'dashboard' ? 'text-primary-600' : 'text-slate-500'
            }`}
          >
            <span className="text-base">🏠</span>
            Home
          </button>
          <button
            onClick={() => handleMobileNavigate('scheduling')}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium ${
              currentPage === 'scheduling' ? 'text-primary-600' : 'text-slate-500'
            }`}
          >
            <span className="text-base">📅</span>
            Schedule
          </button>
          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              setIsMobileSectionsOpen((prev) => !prev);
            }}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium ${
              isMobileSectionsOpen ? 'text-primary-600' : 'text-slate-500'
            }`}
          >
            <span className="text-base">🧭</span>
            Sections
          </button>
          <button
            onClick={() => {
              setIsMobileSectionsOpen(false);
              setIsMobileMenuOpen(true);
            }}
            className="flex flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium text-slate-500"
            aria-label="Open full menu"
          >
            <span className="text-base">☰</span>
            Menu
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
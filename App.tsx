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

  return (
    <div className="flex w-full h-full bg-slate-100 overflow-hidden">
      {/* Mobile top header bar */}
      <header className="bg-slate-900 md:hidden fixed top-0 left-0 right-0 z-30 h-14 flex items-center px-4 shadow-lg">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Open navigation menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="ml-3">
          <span className="jtf-logo-text">Just The Funny</span>
          <p className="jtf-logo-sub">Team Portal</p>
        </div>
      </header>

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

      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {renderPage()}
      </main>
    </div>
  );
};

export default App;
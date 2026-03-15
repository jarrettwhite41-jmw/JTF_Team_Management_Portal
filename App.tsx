import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { PersonnelDirectory } from './pages/PersonnelDirectory';
import { CastDirectory } from './pages/CastDirectory';
import { CrewDirectory } from './pages/CrewDirectory';
import { BartendersPage } from './pages/BartendersPage';
import { ClassRegistration } from './pages/ClassRegistration';
import { Shows } from './pages/Shows';
import { InventoryPage } from './pages/Inventory';
import { Scheduling } from './pages/Scheduling';
import { StudentDirectory } from './pages/StudentDirectory';
import { StudentProfile } from './pages/StudentProfile';
import { PageType } from './types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'personnel':
        return <PersonnelDirectory />;
      case 'cast':
        return <CastDirectory />;
      case 'crew':
        return <CrewDirectory />;
      case 'bartenders':
        return <BartendersPage />;
      case 'classes':
        return <ClassRegistration />;
      case 'shows':
        return <Shows />;
      case 'inventory':
        return <InventoryPage />;
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

  return (
    <div className="flex h-screen bg-zinc-50">
      {/* Mobile top header bar */}
      <header className="jtf-mobile-header md:hidden fixed top-0 left-0 right-0 z-30 h-14 flex items-center px-4 shadow-lg">
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
        onNavigate={setCurrentPage}
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
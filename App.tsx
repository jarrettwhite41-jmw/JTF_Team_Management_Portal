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
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
};

export default App;
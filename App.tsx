import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { PersonnelDirectory } from './pages/PersonnelDirectory';
import { ClassRegistration } from './pages/ClassRegistration';
import { Shows } from './pages/Shows';
import { InventoryPage } from './pages/Inventory';
import { Scheduling } from './pages/Scheduling';
import { PageType } from './types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'personnel':
        return <PersonnelDirectory />;
      case 'classes':
        return <ClassRegistration />;
      case 'shows':
        return <Shows />;
      case 'inventory':
        return <InventoryPage />;
      case 'scheduling':
        return <Scheduling />;
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
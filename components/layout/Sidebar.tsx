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
    { id: 'student-directory', label: 'Students', icon: '🎓' },
    { id: 'cast', label: 'Cast', icon: '🎭' },
    { id: 'classes', label: 'Classes', icon: '📚' },
    { id: 'shows', label: 'Shows', icon: '🎬' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'scheduling', label: 'Schedule', icon: '📅' }
  ];

  return (
    <div className="bg-white shadow-sm border-r h-full w-64 flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-gray-900">JTF Portal</h1>
        <p className="text-sm text-gray-600">Team Management</p>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentPage === item.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t">
        <p className="text-xs text-gray-500">© 2024 JTF Team Portal</p>
      </div>
    </div>
  );
};
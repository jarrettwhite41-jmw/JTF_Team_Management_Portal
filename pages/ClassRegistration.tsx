import React, { useState, useEffect } from 'react';
import { ClassCard } from '../components/classes/ClassCard';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { gasService } from '../services/googleAppsScript';

type FilterType = 'all' | 'upcoming' | 'in-progress' | 'completed';

interface ClassOffering {
  OfferingID: number;
  ClassLevelID: number;
  LevelName?: string;
  TeacherPersonnelID: number;
  TeacherName?: string;
  StartDate: string;
  EndDate: string;
  MaxStudents: number;
  EnrolledCount?: number;
  Status: 'Upcoming' | 'In Progress' | 'Completed' | 'Cancelled';
  Location?: string;
  MeetingDays?: string;
  MeetingTime?: string;
}

export const ClassRegistration: React.FC = () => {
  const [classes, setClasses] = useState<ClassOffering[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<ClassOffering[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showNewClassModal, setShowNewClassModal] = useState(false);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [classes, filter, searchTerm]);

  const loadClasses = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getAllClassOfferings();

      if (response.success && response.data) {
        setClasses(response.data);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to load classes' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading classes' });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...classes];

    // Apply status filter
    if (filter !== 'all') {
      const statusMap: Record<FilterType, string> = {
        'all': '',
        'upcoming': 'Upcoming',
        'in-progress': 'In Progress',
        'completed': 'Completed'
      };
      filtered = filtered.filter(c => c.Status === statusMap[filter]);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.LevelName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.TeacherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.Location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredClasses(filtered);
  };

  const getFilterCount = (filterType: FilterType): number => {
    if (filterType === 'all') return classes.length;
    const statusMap: Record<FilterType, string> = {
      'all': '',
      'upcoming': 'Upcoming',
      'in-progress': 'In Progress',
      'completed': 'Completed'
    };
    return classes.filter(c => c.Status === statusMap[filterType]).length;
  };

  const handleManageClass = (offeringId: number) => {
    // This will be implemented when we add routing
    console.log('Navigate to class management:', offeringId);
    setMessage({ type: 'success', text: 'Class management page coming soon!' });
  };

  if (isLoading) {
    return <Loader text="Loading classes..." />;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Class Management</h1>
            <p className="text-gray-600 mt-1">Manage class offerings, rosters, and attendance</p>
          </div>
          <button
            onClick={() => setShowNewClassModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Class
          </button>
        </div>

        {message && (
          <Message
            type={message.type}
            message={message.text}
            onClose={() => setMessage(null)}
          />
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Classes ({getFilterCount('all')})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'upcoming'
                ? 'bg-yellow-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Upcoming ({getFilterCount('upcoming')})
          </button>
          <button
            onClick={() => setFilter('in-progress')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'in-progress'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            In Progress ({getFilterCount('in-progress')})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Completed ({getFilterCount('completed')})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search classes by name, teacher, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Classes Grid */}
      {filteredClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((classOffering) => (
            <ClassCard
              key={classOffering.OfferingID}
              classOffering={classOffering}
              onManage={() => handleManageClass(classOffering.OfferingID)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No classes found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search' : 'Get started by creating a new class'}
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={() => setShowNewClassModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Class
              </button>
            </div>
          )}
        </div>
      )}

      {/* New Class Modal - Placeholder */}
      {showNewClassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Class</h3>
            <p className="text-gray-600 mb-4">New class creation form coming soon!</p>
            <button
              onClick={() => setShowNewClassModal(false)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
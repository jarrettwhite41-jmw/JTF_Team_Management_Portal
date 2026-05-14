import React, { useEffect, useMemo, useState } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { gasService } from '../services/googleAppsScript';
import { PageType } from '../types';

interface TeacherManagementProps {
  onNavigate?: (page: PageType) => void;
}

interface TeacherRecord {
  TeacherID: number;
  PersonnelID: number;
  FirstName: string;
  LastName: string;
  PrimaryEmail: string;
}

export const TeacherManagement: React.FC<TeacherManagementProps> = ({ onNavigate }) => {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getAllTeachers();
      if (response.success && response.data) {
        setTeachers(response.data as TeacherRecord[]);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to load teachers' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading teachers' });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTeachers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return teachers;
    return teachers.filter((teacher) => {
      const fullName = `${teacher.FirstName || ''} ${teacher.LastName || ''}`.toLowerCase();
      return fullName.includes(query) || (teacher.PrimaryEmail || '').toLowerCase().includes(query);
    });
  }, [teachers, searchTerm]);

  if (isLoading) {
    return <Loader text="Loading teachers..." />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teacher Management</h1>
          <p className="text-sm text-gray-600 mt-1">Teachers are cast members assigned to classes.</p>
        </div>
        <button
          onClick={() => onNavigate?.('cast')}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Go to Cast Management
        </button>
      </div>

      {message && (
        <div className="mb-4">
          <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search teachers by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher ID</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTeachers.map((teacher) => (
              <tr key={teacher.TeacherID} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {`${teacher.FirstName || ''} ${teacher.LastName || ''}`.trim()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{teacher.PrimaryEmail || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">#{teacher.TeacherID}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTeachers.length === 0 && (
          <div className="py-10 text-center text-gray-500">No teachers found.</div>
        )}
      </div>
    </div>
  );
};

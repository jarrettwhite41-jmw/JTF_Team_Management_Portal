import React, { useEffect, useMemo, useState } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { gasService } from '../services/googleAppsScript';
import { PageType } from '../types';

interface DirectorManagementProps {
  onNavigate?: (page: PageType) => void;
}

interface DirectorRecord {
  DirectorID: number;
  PersonnelID: number;
  FirstName: string;
  LastName: string;
  PrimaryEmail: string;
}

export const DirectorManagement: React.FC<DirectorManagementProps> = ({ onNavigate }) => {
  const [directors, setDirectors] = useState<DirectorRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadDirectors();
  }, []);

  const loadDirectors = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getAllDirectors();
      if (response.success && response.data) {
        setDirectors(response.data as DirectorRecord[]);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to load directors' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading directors' });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDirectors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return directors;
    return directors.filter((director) => {
      const fullName = `${director.FirstName || ''} ${director.LastName || ''}`.toLowerCase();
      return fullName.includes(query) || (director.PrimaryEmail || '').toLowerCase().includes(query);
    });
  }, [directors, searchTerm]);

  if (isLoading) {
    return <Loader text="Loading directors..." />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Director Management</h1>
          <p className="text-sm text-gray-600 mt-1">Directors are cast members attached to shows.</p>
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
          placeholder="Search directors by name or email..."
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Director ID</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDirectors.map((director) => (
              <tr key={director.DirectorID} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {`${director.FirstName || ''} ${director.LastName || ''}`.trim()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{director.PrimaryEmail || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">#{director.DirectorID}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredDirectors.length === 0 && (
          <div className="py-10 text-center text-gray-500">No directors found.</div>
        )}
      </div>
    </div>
  );
};

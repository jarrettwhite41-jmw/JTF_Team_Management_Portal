import React, { useEffect, useMemo, useState } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { supabaseService as gasService } from '../services/supabaseService';
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

interface CastRecord {
  CastMemberID: number;
  PersonnelID: number;
  FirstName: string;
  LastName: string;
  FullName?: string;
  PrimaryEmail: string;
}

export const DirectorManagement: React.FC<DirectorManagementProps> = ({ onNavigate }) => {
  const [directors, setDirectors] = useState<DirectorRecord[]>([]);
  const [castMembers, setCastMembers] = useState<CastRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadDirectors();
  }, []);

  const loadDirectors = async () => {
    setIsLoading(true);
    try {
      const [directorResponse, castResponse] = await Promise.all([
        gasService.getAllDirectors(),
        gasService.getAllCastMembers(),
      ]);

      if (directorResponse.success && directorResponse.data) {
        setDirectors(directorResponse.data as DirectorRecord[]);
      } else {
        setMessage({ type: 'error', text: directorResponse.error || 'Failed to load directors' });
      }

      const castRows = Array.isArray((castResponse.data as any)?.data)
        ? (castResponse.data as any).data
        : (Array.isArray(castResponse.data) ? castResponse.data : []);

      const normalizedCast = castRows.map((row: any) => ({
        CastMemberID: Number(row.CastMemberID),
        PersonnelID: Number(row.PersonnelID),
        FirstName: row.FirstName || '',
        LastName: row.LastName || row.Lastname || '',
        FullName: row.FullName || `${row.FirstName || ''} ${row.LastName || row.Lastname || ''}`.trim(),
        PrimaryEmail: row.PrimaryEmail || '',
      }));

      setCastMembers(normalizedCast);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading directors' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDirector = async () => {
    if (!selectedPersonnelId) return;
    setIsSubmitting(true);
    try {
      const response = await gasService.addPersonAsDirector(Number(selectedPersonnelId));
      if (response.success) {
        setMessage({ type: 'success', text: 'Director added successfully.' });
        setSelectedPersonnelId('');
        await loadDirectors();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to add director.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error adding director.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveDirector = async (directorId: number, fullName: string) => {
    setIsSubmitting(true);
    try {
      const response = await gasService.removeDirector(directorId);
      if (response.success) {
        setMessage({ type: 'success', text: `${fullName} removed from directors.` });
        await loadDirectors();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to remove director.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error removing director.' });
    } finally {
      setIsSubmitting(false);
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

  const availableCastMembers = useMemo(() => {
    const assignedPersonnelIds = new Set(directors.map((director) => director.PersonnelID));
    return castMembers
      .filter((member) => !assignedPersonnelIds.has(member.PersonnelID))
      .sort((a, b) => `${a.FirstName} ${a.LastName}`.localeCompare(`${b.FirstName} ${b.LastName}`, undefined, { sensitivity: 'base' }));
  }, [castMembers, directors]);

  if (isLoading) {
    return <Loader text="Loading directors..." />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Director Management</h1>
          <p className="text-sm text-gray-600 mt-1">Directors are cast members attached to shows. Add or remove assignments here.</p>
        </div>
        <button
          onClick={() => onNavigate?.('cast')}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Go to Cast Management
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Director (Cast Only)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <select
            title="Select cast member to add as director"
            value={selectedPersonnelId}
            onChange={(event) => setSelectedPersonnelId(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">Select cast member</option>
            {availableCastMembers.map((member) => (
              <option key={member.CastMemberID} value={member.PersonnelID}>
                {member.FullName || `${member.FirstName} ${member.LastName}`.trim()}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddDirector}
            disabled={!selectedPersonnelId || isSubmitting}
            className="w-full rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50 sm:w-auto"
          >
            {isSubmitting ? 'Saving...' : 'Add Director'}
          </button>
        </div>
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

      <div className="space-y-3 md:hidden">
        {filteredDirectors.map((director) => (
          <article key={director.DirectorID} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900">{`${director.FirstName || ''} ${director.LastName || ''}`.trim()}</h2>
                <p className="mt-1 break-all text-sm text-gray-600">{director.PrimaryEmail || '-'}</p>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">#{director.DirectorID}</span>
            </div>
            <button
              type="button"
              onClick={() => handleRemoveDirector(director.DirectorID, `${director.FirstName || ''} ${director.LastName || ''}`.trim())}
              disabled={isSubmitting}
              className="mt-4 w-full rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Remove
            </button>
          </article>
        ))}

        {filteredDirectors.length === 0 && (
          <div className="rounded-xl border bg-white px-4 py-10 text-center text-gray-500 shadow-sm">No directors found.</div>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border bg-white shadow-sm md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Director ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    type="button"
                    onClick={() => handleRemoveDirector(director.DirectorID, `${director.FirstName || ''} ${director.LastName || ''}`.trim())}
                    disabled={isSubmitting}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </td>
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

import React, { useEffect, useMemo, useState } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { gasService } from '../services/googleAppsScript';
import { PageType, PortalNavigationContext } from '../types';

interface DirectorManagementProps {
  onNavigate?: (page: PageType, context?: PortalNavigationContext) => void;
}

interface DirectorRecord {
  DirectorID: number;
  PersonnelID: number;
  FirstName: string;
  LastName: string;
  PrimaryEmail: string;
  ShowsCount?: number;
  LastDirectedDate?: string;
  TopCast?: Array<{ personnelId: number; name: string; count: number }>;
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
        {filteredDirectors.map((director) => {
          const fullName = `${director.FirstName || ''} ${director.LastName || ''}`.trim();
          const showCount = director.ShowsCount ?? 0;
          return (
            <article key={director.DirectorID} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900">{fullName}</h2>
                  <p className="mt-1 break-all text-sm text-gray-600">{director.PrimaryEmail || '-'}</p>
                </div>
                <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-semibold text-indigo-800">
                  🎬 {showCount} show{showCount === 1 ? '' : 's'}
                </span>
              </div>
              {director.TopCast && director.TopCast.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase text-gray-500 mb-1">Most Frequently Cast:</p>
                  <div className="flex flex-wrap gap-1">
                    {director.TopCast.map((tc) => (
                      <button
                        key={tc.personnelId}
                        type="button"
                        onClick={() =>
                          onNavigate?.('shows', {
                            directorFilter: fullName,
                            castMemberFilter: String(tc.personnelId),
                          })
                        }
                        className="px-2 py-0.5 rounded-full bg-gray-100 hover:bg-indigo-50 text-[11px] text-gray-700 font-medium"
                      >
                        {tc.name} ({tc.count})
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate?.('shows', { directorFilter: fullName })}
                  className="flex-1 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  🎬 View Shows ({showCount})
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('cast', { castPersonnelId: director.PersonnelID, castSearch: fullName })}
                  className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100"
                >
                  🎭 Cast Profile
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveDirector(director.DirectorID, fullName)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </article>
          );
        })}

        {filteredDirectors.length === 0 && (
          <div className="rounded-xl border bg-white px-4 py-10 text-center text-gray-500 shadow-sm">No directors found.</div>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border bg-white shadow-sm md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Director</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shows Directed</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequent Cast</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDirectors.map((director) => {
              const fullName = `${director.FirstName || ''} ${director.LastName || ''}`.trim();
              const showCount = director.ShowsCount ?? 0;
              return (
                <tr key={director.DirectorID} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">{fullName}</div>
                    <div className="text-xs text-gray-500">{director.PrimaryEmail || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                      🎬 {showCount} show{showCount === 1 ? '' : 's'}
                    </span>
                    {director.LastDirectedDate && (
                      <div className="text-[11px] text-gray-500 mt-1">Last: {director.LastDirectedDate}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {director.TopCast && director.TopCast.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {director.TopCast.map((tc) => (
                          <button
                            key={tc.personnelId}
                            type="button"
                            onClick={() =>
                              onNavigate?.('shows', {
                                directorFilter: fullName,
                                castMemberFilter: String(tc.personnelId),
                              })
                            }
                            className="px-2 py-0.5 rounded-full bg-gray-100 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 text-xs text-gray-700 font-medium transition-colors"
                            title={`View shows directed by ${fullName} featuring ${tc.name}`}
                          >
                            {tc.name} <strong className="text-indigo-700">({tc.count})</strong>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onNavigate?.('shows', { directorFilter: fullName })}
                        className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        🎬 View Shows ({showCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => onNavigate?.('cast', { castPersonnelId: director.PersonnelID, castSearch: fullName })}
                        className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors"
                      >
                        🎭 Cast Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveDirector(director.DirectorID, fullName)}
                        disabled={isSubmitting}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredDirectors.length === 0 && (
          <div className="py-10 text-center text-gray-500">No directors found.</div>
        )}
      </div>
    </div>
  );
};

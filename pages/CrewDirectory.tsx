import React, { useState, useEffect, useMemo } from 'react';
import { CrewCard } from '../components/crew/CrewCard';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { CrewMemberWithDetails } from '../types';
import { gasService } from '../services/googleAppsScript';

// Palette of Tailwind badge class sets — one per show (cycles if > 8 shows)
const SHOW_COLORS = [
  'bg-violet-100 text-violet-700 border-violet-200',
  'bg-sky-100 text-sky-700 border-sky-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
];

// Heavier header versions that match each badge
const SHOW_HEADER_COLORS = [
  'bg-violet-600 text-white',
  'bg-sky-600 text-white',
  'bg-amber-500 text-white',
  'bg-rose-600 text-white',
  'bg-emerald-600 text-white',
  'bg-orange-500 text-white',
  'bg-pink-600 text-white',
  'bg-cyan-600 text-white',
];

export const CrewDirectory: React.FC = () => {
  const [crewMembers, setCrewMembers] = useState<CrewMemberWithDetails[]>([]);
  const [filteredCrewMembers, setFilteredCrewMembers] = useState<CrewMemberWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dutyFilter, setDutyFilter] = useState<string>('all');
  const [showFilter, setShowFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'grouped' | 'byShow'>('grid');
  const [selectedCrewMember, setSelectedCrewMember] = useState<CrewMemberWithDetails | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadCrewMembers();
  }, []);

  useEffect(() => {
    let filtered = crewMembers;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        `${m.FirstName || ''} ${m.LastName || m.Lastname || ''}`.toLowerCase().includes(term) ||
        (m.PrimaryEmail || '').toLowerCase().includes(term) ||
        (m.DutyName || '').toLowerCase().includes(term) ||
        (m.ShowName || '').toLowerCase().includes(term)
      );
    }
    if (dutyFilter !== 'all') {
      filtered = filtered.filter(m => (m.DutyName || '') === dutyFilter);
    }
    if (showFilter !== 'all') {
      filtered = filtered.filter(m => (m.ShowName || '') === showFilter);
    }
    setFilteredCrewMembers(filtered);
  }, [crewMembers, searchTerm, dutyFilter, showFilter]);

  const loadCrewMembers = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getAllCrewMembers();
      if (response.success && response.data && Array.isArray((response.data as any).data)) {
        setCrewMembers((response.data as any).data);
        setMessage(null);
      } else {
        setMessage({ type: 'error', text: (response.data && (response.data as any).error) || (response as any).error || 'Failed to load crew members' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading crew member data' });
    } finally {
      setIsLoading(false);
    }
  };

  // Derived data
  const uniqueDutyTypes = Array.from(new Set(crewMembers.map(m => m.DutyName).filter(Boolean))) as string[];
  const uniqueShows = Array.from(new Set(crewMembers.map(m => m.ShowName).filter(Boolean))) as string[];
  const uniqueShowCount = uniqueShows.length;
  const uniqueCrewCount = new Set(crewMembers.map(m => m.PersonnelID).filter(Boolean)).size;

  // Unique show dates sorted chronologically
  const getDateKey = (m: CrewMemberWithDetails) => m.ShowDate || m.LastShowDate || '';
  const uniqueShowDates = Array.from(new Set(crewMembers.map(getDateKey).filter(Boolean)))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  // Map each show date to a stable color index
  const showColorMap = useMemo(() => {
    const map: Record<string, number> = {};
    uniqueShowDates.forEach((date, i) => { map[date] = i % SHOW_COLORS.length; });
    return map;
  }, [uniqueShowDates.join('|')]);

  const getShowBadgeClasses = (dateKey?: string) =>
    dateKey && showColorMap[dateKey] !== undefined ? SHOW_COLORS[showColorMap[dateKey]] : 'bg-gray-100 text-gray-600 border-gray-200';

  const getShowHeaderClasses = (dateKey?: string) =>
    dateKey && showColorMap[dateKey] !== undefined ? SHOW_HEADER_COLORS[showColorMap[dateKey]] : 'bg-gray-500 text-white';

  // Group filtered members by duty type
  const groupedByDuty = uniqueDutyTypes.reduce<Record<string, CrewMemberWithDetails[]>>((acc, duty) => {
    const members = filteredCrewMembers.filter(m => m.DutyName === duty);
    if (members.length) acc[duty] = members;
    return acc;
  }, {});
  const unassigned = filteredCrewMembers.filter(m => !m.DutyName);
  if (unassigned.length) groupedByDuty['Unassigned'] = unassigned;

  // Group filtered members by show date (sorted chronologically)
  const groupedByShow = uniqueShowDates.reduce<Record<string, CrewMemberWithDetails[]>>((acc, date) => {
    const members = filteredCrewMembers.filter(m => getDateKey(m) === date);
    if (members.length) acc[date] = members;
    return acc;
  }, {});
  const noShow = filteredCrewMembers.filter(m => !getDateKey(m));
  if (noShow.length) groupedByShow[''] = noShow;

  const handleCardClick = (m: CrewMemberWithDetails) => {
    setSelectedCrewMember(m);
    setIsDetailModalOpen(true);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try { return new Date(dateString).toLocaleDateString(); }
    catch { return dateString; }
  };

  const getDisplayName = (m: CrewMemberWithDetails) =>
    `${m.FirstName || ''} ${m.LastName || m.Lastname || ''}`.trim() || 'Unknown';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crew Directory</h1>
          <p className="text-sm text-gray-500 mt-1">View crew members and show duty assignments</p>
        </div>
        <p className="text-sm text-gray-600">{filteredCrewMembers.length} assignment{filteredCrewMembers.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Stats bar */}
      {!isLoading && crewMembers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-500">Total Crew Members</p>
            <p className="text-2xl font-bold text-teal-600">{uniqueCrewCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-500">Duty Types</p>
            <p className="text-2xl font-bold text-indigo-600">{uniqueDutyTypes.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-500">Shows Supported</p>
            <p className="text-2xl font-bold text-purple-600">{uniqueShowCount}</p>
          </div>
        </div>
      )}

      {message && (
        <div className="mb-4">
          <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by name, email, duty, or show..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={dutyFilter}
          onChange={(e) => setDutyFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-sm"
        >
          <option value="all">All Duties</option>
          {uniqueDutyTypes.map(duty => (
            <option key={duty} value={duty}>{duty}</option>
          ))}
        </select>
        <select
          value={showFilter}
          onChange={(e) => setShowFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-sm"
        >
          <option value="all">All Shows</option>
          {uniqueShows.map(show => (
            <option key={show} value={show}>{show}</option>
          ))}
        </select>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 text-sm transition-colors ${viewMode === 'grid' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-3 py-2 text-sm transition-colors border-l ${viewMode === 'grouped' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            By Duty
          </button>
          <button
            onClick={() => setViewMode('byShow')}
            className={`px-3 py-2 text-sm transition-colors border-l ${viewMode === 'byShow' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            By Show
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <Loader text="Loading crew members..." />
      ) : filteredCrewMembers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-lg font-medium mb-1">No crew members found</p>
          <p className="text-sm">Try adjusting your search or filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCrewMembers.map((member, idx) => (
            <CrewCard
              key={`${member.PersonnelID}-${member.DutyID}-${idx}`}
              crewMember={member}
              onClick={() => handleCardClick(member)}
              showColorClasses={getShowBadgeClasses(getDateKey(member))}
            />
          ))}
        </div>
      ) : viewMode === 'grouped' ? (
        <div className="space-y-6">
          {Object.entries(groupedByDuty).map(([duty, members]) => (
            <div key={duty} className="bg-white rounded-lg shadow-sm border">
              <div className="px-5 py-3 border-b bg-gray-50 rounded-t-lg flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">{duty}</h3>
                <span className="text-sm text-gray-500 bg-white border px-2 py-0.5 rounded-full">
                  {members.length} assignment{members.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {members.map((member, idx) => (
                  <CrewCard
                    key={`${member.PersonnelID}-${member.DutyID}-${idx}`}
                    crewMember={member}
                    onClick={() => handleCardClick(member)}
                    showColorClasses={getShowBadgeClasses(getDateKey(member))}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── By Show view ─────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Legend */}
          {uniqueShowDates.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {uniqueShowDates.map(date => (
                <span
                  key={date}
                  className={`px-3 py-1 text-xs font-medium rounded-full border ${getShowBadgeClasses(date)}`}
                >
                  {formatDate(date)}
                </span>
              ))}
            </div>
          )}
          {Object.entries(groupedByShow).map(([date, members]) => (
            <div key={date || 'nodate'} className="rounded-lg shadow-sm border overflow-hidden">
              <div className={`px-5 py-3 flex justify-between items-center ${getShowHeaderClasses(date)}`}>
                <div>
                  <h3 className="font-semibold text-lg">{date ? formatDate(date) : 'No Date'}</h3>
                  {members[0]?.ShowName && (
                    <p className="text-xs opacity-80 mt-0.5">{members[0].ShowName}</p>
                  )}
                </div>
                <span className="text-sm bg-white bg-opacity-20 border border-white border-opacity-30 px-2 py-0.5 rounded-full">
                  {members.length} assignment{members.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {members.map((member, idx) => (
                  <CrewCard
                    key={`${member.PersonnelID}-${member.DutyID}-${idx}`}
                    crewMember={member}
                    onClick={() => handleCardClick(member)}
                    showColorClasses={getShowBadgeClasses(getDateKey(member))}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Crew Member Detail Modal ──────────────────────────────── */}
      {isDetailModalOpen && selectedCrewMember && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-lg">
                  {(selectedCrewMember.FirstName?.[0] || '') + ((selectedCrewMember.LastName || selectedCrewMember.Lastname)?.[0] || '')}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{getDisplayName(selectedCrewMember)}</h2>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                    selectedCrewMember.Status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedCrewMember.Status || 'Crew Member'}
                  </span>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            {/* Contact + latest assignment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{selectedCrewMember.PrimaryEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{selectedCrewMember.PrimaryPhone || 'N/A'}</p>
                  </div>
                  {selectedCrewMember.Birthday && (
                    <div>
                      <p className="text-gray-500">Birthday</p>
                      <p className="font-medium text-gray-900">{formatDate(selectedCrewMember.Birthday)}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-teal-50 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-3">Latest Assignment</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-500">Duty</p>
                    <p className="font-medium text-gray-900">{selectedCrewMember.DutyName || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Show</p>
                    <p className="font-medium text-gray-900">{selectedCrewMember.ShowName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Show Date</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedCrewMember.ShowDate || selectedCrewMember.LastShowDate)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* All duty assignments for this person */}
            {(() => {
              const allDuties = crewMembers.filter(m => m.PersonnelID === selectedCrewMember.PersonnelID);
              if (allDuties.length <= 1) return null;
              return (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    All Duty Assignments ({allDuties.length})
                  </h3>
                  <div className="space-y-2">
                    {allDuties.map((duty, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium text-gray-900">{duty.DutyName || 'Unassigned'}</span>
                          {duty.ShowName && (
                            <span className={`px-2 py-0.5 text-xs rounded-full border ${getShowBadgeClasses(duty.ShowName)}`}>
                              {duty.ShowName}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 flex-shrink-0 ml-2">{formatDate(duty.ShowDate || duty.LastShowDate)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


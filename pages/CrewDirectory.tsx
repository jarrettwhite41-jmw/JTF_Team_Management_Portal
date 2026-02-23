import React, { useState, useEffect } from 'react';
import { CrewCard } from '../components/crew/CrewCard';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { CrewMemberWithDetails, Personnel } from '../types';
import { gasService } from '../services/googleAppsScript';

export const CrewDirectory: React.FC = () => {
  const [crewMembers, setCrewMembers] = useState<CrewMemberWithDetails[]>([]);
  const [filteredCrewMembers, setFilteredCrewMembers] = useState<CrewMemberWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dutyFilter, setDutyFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'grouped'>('grid');
  const [selectedCrewMember, setSelectedCrewMember] = useState<CrewMemberWithDetails | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add crew member modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<number[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Remove confirmation state
  const [removeTarget, setRemoveTarget] = useState<CrewMemberWithDetails | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

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
    setFilteredCrewMembers(filtered);
  }, [crewMembers, searchTerm, dutyFilter]);

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
  const crewPersonnelIds = new Set(crewMembers.map(c => c.PersonnelID).filter(Boolean));
  const uniqueDutyTypes = Array.from(new Set(crewMembers.map(m => m.DutyName).filter(Boolean))) as string[];
  const uniqueShowCount = new Set(crewMembers.map(m => m.ShowName).filter(Boolean)).size;
  const uniqueCrewCount = new Set(crewMembers.map(m => m.PersonnelID).filter(Boolean)).size;

  // Group filtered members by duty type
  const groupedByDuty = uniqueDutyTypes.reduce<Record<string, CrewMemberWithDetails[]>>((acc, duty) => {
    const members = filteredCrewMembers.filter(m => m.DutyName === duty);
    if (members.length) acc[duty] = members;
    return acc;
  }, {});
  const unassigned = filteredCrewMembers.filter(m => !m.DutyName);
  if (unassigned.length) groupedByDuty['Unassigned'] = unassigned;

  // Add modal helpers
  const availablePersonnel = allPersonnel.filter(p => {
    const notInCrew = !crewPersonnelIds.has(p.PersonnelID);
    const matchesSearch =
      personnelSearch === '' ||
      `${p.FirstName} ${p.LastName}`.toLowerCase().includes(personnelSearch.toLowerCase()) ||
      (p.PrimaryEmail || '').toLowerCase().includes(personnelSearch.toLowerCase());
    return notInCrew && matchesSearch;
  });

  const togglePersonnelSelect = (id: number) => {
    setSelectedPersonnelIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (availablePersonnel.every(p => selectedPersonnelIds.includes(p.PersonnelID))) {
      setSelectedPersonnelIds([]);
    } else {
      setSelectedPersonnelIds(availablePersonnel.map(p => p.PersonnelID));
    }
  };

  const handleOpenAddModal = async () => {
    setPersonnelSearch('');
    setSelectedPersonnelIds([]);
    setIsAddModalOpen(true);
    if (allPersonnel.length === 0) {
      try {
        const response = await gasService.getAllPersonnel();
        if (response.success && Array.isArray(response.data)) {
          setAllPersonnel(response.data as Personnel[]);
        }
      } catch { /* silent */ }
    }
  };

  const handleAddSelectedCrewMembers = async () => {
    if (selectedPersonnelIds.length === 0) return;
    setIsAdding(true);
    let successCount = 0;
    let failCount = 0;
    for (const id of selectedPersonnelIds) {
      try {
        const response = await gasService.addPersonAsCrewMember(id);
        if (response.success) successCount++;
        else failCount++;
      } catch { failCount++; }
    }
    setIsAdding(false);
    setIsAddModalOpen(false);
    setSelectedPersonnelIds([]);
    await loadCrewMembers();
    if (successCount > 0)
      setMessage({ type: 'success', text: `${successCount} crew member${successCount > 1 ? 's' : ''} added successfully.` });
    if (failCount > 0)
      setMessage({ type: 'error', text: `${failCount} member${failCount > 1 ? 's' : ''} failed to add.` });
  };

  const handleCardClick = (m: CrewMemberWithDetails) => {
    setSelectedCrewMember(m);
    setIsDetailModalOpen(true);
  };

  const handleRemoveClick = (personnelId: number) => {
    const target = crewMembers.find(c => c.PersonnelID === personnelId);
    if (target) setRemoveTarget(target);
  };

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    setIsRemoving(true);
    try {
      const response = await gasService.removeCrewMember(removeTarget.CrewMemberID);
      if (response.success) {
        setMessage({ type: 'success', text: `${removeTarget.FirstName} ${removeTarget.LastName || removeTarget.Lastname} removed from crew.` });
        setRemoveTarget(null);
        await loadCrewMembers();
      } else {
        setMessage({ type: 'error', text: (response as any).error || 'Failed to remove crew member.' });
        setRemoveTarget(null);
      }
    } catch {
      setMessage({ type: 'error', text: 'Error removing crew member.' });
      setRemoveTarget(null);
    } finally {
      setIsRemoving(false);
    }
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
          <p className="text-sm text-gray-500 mt-1">Manage crew members and show duty assignments</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-600">{filteredCrewMembers.length} assignment{filteredCrewMembers.length !== 1 ? 's' : ''}</p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            + Add Crew Member
          </button>
        </div>
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
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 text-sm transition-colors ${viewMode === 'grid' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-3 py-2 text-sm transition-colors ${viewMode === 'grouped' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            By Duty
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
          <p className="text-sm">Try adjusting your search or filters, or add a crew member.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCrewMembers.map((member, idx) => (
            <CrewCard
              key={`${member.PersonnelID}-${member.DutyID}-${idx}`}
              crewMember={member}
              onClick={() => handleCardClick(member)}
              onRemove={handleRemoveClick}
            />
          ))}
        </div>
      ) : (
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
                    onRemove={handleRemoveClick}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Crew Member Modal ─────────────────────────────────── */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Crew Members from Personnel</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <input
              type="text"
              placeholder="Search personnel..."
              value={personnelSearch}
              onChange={(e) => setPersonnelSearch(e.target.value)}
              className="mb-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            {availablePersonnel.length > 0 && (
              <div className="flex items-center justify-between mb-2 px-1">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={availablePersonnel.every(p => selectedPersonnelIds.includes(p.PersonnelID))}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-teal-600"
                  />
                  Select all
                </label>
                {selectedPersonnelIds.length > 0 && (
                  <span className="text-sm text-teal-700 font-medium">{selectedPersonnelIds.length} selected</span>
                )}
              </div>
            )}
            <div className="overflow-y-auto flex-1">
              {availablePersonnel.length === 0 ? (
                <p className="text-center text-gray-500 py-6">No available personnel found.</p>
              ) : (
                availablePersonnel.map((person) => {
                  const isChecked = selectedPersonnelIds.includes(person.PersonnelID);
                  return (
                    <label
                      key={person.PersonnelID}
                      className={`flex items-center gap-3 p-3 mb-1 border rounded-lg cursor-pointer select-none transition-colors ${
                        isChecked ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => togglePersonnelSelect(person.PersonnelID)}
                        className="w-4 h-4 accent-teal-600 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{`${person.FirstName} ${person.LastName}`.trim()}</p>
                        <p className="text-sm text-gray-500 truncate">{person.PrimaryEmail || 'No email'}</p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSelectedCrewMembers}
                disabled={isAdding || selectedPersonnelIds.length === 0}
                className="px-4 py-2 text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors font-medium"
              >
                {isAdding ? 'Adding...' : `Add ${selectedPersonnelIds.length > 0 ? selectedPersonnelIds.length + ' ' : ''}Selected`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove Confirmation Modal ─────────────────────────────── */}
      {removeTarget && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setRemoveTarget(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Remove Crew Member</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove{' '}
              <span className="font-medium text-gray-900">{getDisplayName(removeTarget)}</span>{' '}
              from the crew directory? This will delete their crew member record.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRemoveTarget(null)}
                disabled={isRemoving}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                disabled={isRemoving}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isRemoving ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
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
                        <div>
                          <span className="font-medium text-gray-900">{duty.DutyName || 'Unassigned'}</span>
                          <span className="text-gray-400 mx-2">·</span>
                          <span className="text-gray-600 text-sm">{duty.ShowName || 'Unknown Show'}</span>
                        </div>
                        <span className="text-sm text-gray-500">{formatDate(duty.ShowDate || duty.LastShowDate)}</span>
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


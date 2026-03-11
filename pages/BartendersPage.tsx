import React, { useState, useEffect } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { BartenderWithDetails, Personnel } from '../types';
import { gasService } from '../services/googleAppsScript';

export const BartendersPage: React.FC = () => {
  const [bartenders, setBartenders] = useState<BartenderWithDetails[]>([]);
  const [filteredBartenders, setFilteredBartenders] = useState<BartenderWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBartender, setSelectedBartender] = useState<BartenderWithDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<number[]>([]);
  const [trainedMap, setTrainedMap] = useState<Record<number, boolean>>({});
  const [isAdding, setIsAdding] = useState(false);

  // Remove confirmation state
  const [removeTarget, setRemoveTarget] = useState<BartenderWithDetails | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    loadBartenders();
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setFilteredBartenders(
      term
        ? bartenders.filter(b =>
            `${b.FirstName} ${b.LastName}`.toLowerCase().includes(term) ||
            (b.PrimaryEmail || '').toLowerCase().includes(term) ||
            (b.PrimaryPhone || '').toLowerCase().includes(term)
          )
        : bartenders
    );
  }, [bartenders, searchTerm]);

  const loadBartenders = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getBartendersWithDetails();
      if (response.success && Array.isArray((response.data as any)?.data ?? response.data)) {
        const data = (response.data as any)?.data ?? response.data;
        setBartenders(data);
        setMessage(null);
      } else {
        setMessage({ type: 'error', text: (response as any).error || 'Failed to load bartenders.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error loading bartender data.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Derived data
  const bartenderPersonnelIds = new Set(bartenders.map(b => b.PersonnelID).filter(Boolean));
  const activeCount = bartenders.filter(b => String(b.Active).toLowerCase() === 'true' || b.Active === true || String(b.Active) === '1').length;
  const trainedCount = bartenders.filter(b => String(b.Trained).toLowerCase() === 'true' || b.Trained === true || String(b.Trained) === '1').length;

  // Add modal helpers
  const availablePersonnel = allPersonnel.filter(p => {
    const notBartender = !bartenderPersonnelIds.has(p.PersonnelID);
    const matchesSearch =
      personnelSearch === '' ||
      `${p.FirstName} ${p.LastName}`.toLowerCase().includes(personnelSearch.toLowerCase()) ||
      (p.PrimaryEmail || '').toLowerCase().includes(personnelSearch.toLowerCase());
    return notBartender && matchesSearch;
  });

  const toggleSelect = (id: number) =>
    setSelectedPersonnelIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  const toggleSelectAll = () => {
    if (availablePersonnel.every(p => selectedPersonnelIds.includes(p.PersonnelID))) {
      setSelectedPersonnelIds([]);
    } else {
      setSelectedPersonnelIds(availablePersonnel.map(p => p.PersonnelID));
    }
  };

  const handleOpenAdd = async () => {
    setPersonnelSearch('');
    setSelectedPersonnelIds([]);
    setTrainedMap({});
    setIsAddOpen(true);
    if (allPersonnel.length === 0) {
      try {
        const r = await gasService.getAllPersonnel();
        if (r.success && Array.isArray(r.data)) setAllPersonnel(r.data as Personnel[]);
      } catch { /* silent */ }
    }
  };

  const handleAddSelected = async () => {
    if (selectedPersonnelIds.length === 0) return;
    setIsAdding(true);
    let successCount = 0;
    let failCount = 0;
    for (const id of selectedPersonnelIds) {
      try {
        const trained = trainedMap[id] ?? false;
        const r = await gasService.addPersonAsBartender(id, trained, 'Active');
        if (r.success) successCount++;
        else failCount++;
      } catch { failCount++; }
    }
    setIsAdding(false);
    setIsAddOpen(false);
    setSelectedPersonnelIds([]);
    await loadBartenders();
    if (successCount > 0)
      setMessage({ type: 'success', text: `${successCount} bartender${successCount !== 1 ? 's' : ''} added successfully.` });
    if (failCount > 0)
      setMessage({ type: 'error', text: `${failCount} person${failCount !== 1 ? 's' : ''} could not be added.` });
  };

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    setIsRemoving(true);
    try {
      const r = await gasService.removeBartender(removeTarget.BartenderID);
      if (r.success) {
        setMessage({ type: 'success', text: `${removeTarget.FirstName} ${removeTarget.LastName} removed from bartenders.` });
        setRemoveTarget(null);
        await loadBartenders();
      } else {
        setMessage({ type: 'error', text: (r as any).error || 'Failed to remove bartender.' });
        setRemoveTarget(null);
      }
    } catch {
      setMessage({ type: 'error', text: 'Error removing bartender.' });
      setRemoveTarget(null);
    } finally {
      setIsRemoving(false);
    }
  };

  const formatDate = (d?: string) => {
    if (!d || d === 'N/A') return 'N/A';
    try { return new Date(d).toLocaleDateString(); } catch { return d; }
  };

  const boolLabel = (val: boolean | string | undefined) => {
    if (val === true || String(val).toLowerCase() === 'true' || String(val) === '1') return true;
    return false;
  };

  const getInitials = (b: BartenderWithDetails) =>
    `${(b.FirstName || '')[0] || ''}${(b.LastName || '')[0] || ''}`.toUpperCase() || '??';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bartenders</h1>
          <p className="text-sm text-gray-500 mt-1">Manage bartender roster and view shift history</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-600">{filteredBartenders.length} bartender{filteredBartenders.length !== 1 ? 's' : ''}</p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
          >
            + Add Bartender
          </button>
        </div>
      </div>

      {/* Stats */}
      {!isLoading && bartenders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-500">Total Bartenders</p>
            <p className="text-2xl font-bold text-amber-600">{bartenders.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-500">Trained</p>
            <p className="text-2xl font-bold text-indigo-600">{trainedCount}</p>
          </div>
        </div>
      )}

      {message && (
        <div className="mb-4">
          <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
          <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <Loader text="Loading bartenders..." />
      ) : filteredBartenders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <p className="text-lg font-medium mb-1">No bartenders found</p>
          <p className="text-sm">Try adjusting your search or add a bartender.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBartenders.map(b => (
            <div
              key={b.BartenderID}
              onClick={() => { setSelectedBartender(b); setIsDetailOpen(true); }}
              className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-semibold">
                  {getInitials(b)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{`${b.FirstName} ${b.LastName}`.trim() || 'Unknown'}</h3>
                  <p className="text-sm text-gray-500 truncate">{b.PrimaryEmail || 'No email'}</p>
                </div>
              </div>

              <div className="space-y-1 text-sm text-gray-600 mb-3">
                <p><strong>Phone:</strong> {b.PrimaryPhone || 'N/A'}</p>
                <p><strong>Shifts:</strong> {b.ShiftCount ?? 0}</p>
                <p><strong>Last Shift:</strong> {formatDate(b.LastShiftDate)}</p>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {boolLabel(b.Trained) && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-800 font-medium">Trained</span>
                )}
                {boolLabel(b.Active) ? (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 font-medium">Active</span>
                ) : (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 font-medium">Inactive</span>
                )}
                {b.Status && b.Status !== 'Active' && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 font-medium">{b.Status}</span>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100">
                <button
                  onClick={e => { e.stopPropagation(); setRemoveTarget(b); }}
                  className="w-full px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                >
                  Remove Bartender
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Bartender Modal ──────────────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsAddOpen(false)}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Bartenders from Personnel</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <input
              type="text"
              placeholder="Search personnel..."
              value={personnelSearch}
              onChange={e => setPersonnelSearch(e.target.value)}
              className="mb-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />

            {availablePersonnel.length > 0 && (
              <div className="flex items-center justify-between mb-2 px-1">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={availablePersonnel.every(p => selectedPersonnelIds.includes(p.PersonnelID))}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-amber-600"
                  />
                  Select all
                </label>
                {selectedPersonnelIds.length > 0 && (
                  <span className="text-sm text-amber-700 font-medium">{selectedPersonnelIds.length} selected</span>
                )}
              </div>
            )}

            <div className="overflow-y-auto flex-1">
              {availablePersonnel.length === 0 ? (
                <p className="text-center text-gray-500 py-6">No available personnel found.</p>
              ) : (
                availablePersonnel.map(person => {
                  const isChecked = selectedPersonnelIds.includes(person.PersonnelID);
                  return (
                    <div
                      key={person.PersonnelID}
                      className={`flex items-center gap-3 p-3 mb-1 border rounded-lg transition-colors ${
                        isChecked ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(person.PersonnelID)}
                        className="w-4 h-4 accent-amber-600 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{`${person.FirstName} ${person.LastName}`.trim()}</p>
                        <p className="text-sm text-gray-500 truncate">{person.PrimaryEmail || 'No email'}</p>
                      </div>
                      {isChecked && (
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={trainedMap[person.PersonnelID] ?? false}
                            onChange={e => setTrainedMap(prev => ({ ...prev, [person.PersonnelID]: e.target.checked }))}
                            className="w-3.5 h-3.5 accent-indigo-600"
                          />
                          Trained
                        </label>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 flex justify-between items-center">
              <button onClick={() => setIsAddOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAddSelected}
                disabled={isAdding || selectedPersonnelIds.length === 0}
                className="px-4 py-2 text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors font-medium"
              >
                {isAdding ? 'Adding...' : `Add ${selectedPersonnelIds.length > 0 ? selectedPersonnelIds.length + ' ' : ''}Selected`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remove Confirmation Modal ────────────────────────────────── */}
      {removeTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setRemoveTarget(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Remove Bartender</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove{' '}
              <span className="font-medium text-gray-900">{removeTarget.FirstName} {removeTarget.LastName}</span>{' '}
              from the Bartenders table? Their shift history will be preserved.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRemoveTarget(null)} disabled={isRemoving} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirmRemove} disabled={isRemoving} className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                {isRemoving ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bartender Detail Modal ───────────────────────────────────── */}
      {isDetailOpen && selectedBartender && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsDetailOpen(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-lg">
                  {getInitials(selectedBartender)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{`${selectedBartender.FirstName} ${selectedBartender.LastName}`.trim()}</h2>
                  <div className="flex gap-1.5 mt-1">
                    {boolLabel(selectedBartender.Trained) && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-800 font-medium">Trained</span>
                    )}
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${boolLabel(selectedBartender.Active) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {boolLabel(selectedBartender.Active) ? 'Active' : 'Inactive'}
                    </span>
                    {selectedBartender.Status && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 font-medium">{selectedBartender.Status}</span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{selectedBartender.PrimaryEmail || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium text-gray-900">{selectedBartender.PrimaryPhone || 'N/A'}</p>
                  </div>
                  {selectedBartender.Birthday && (
                    <div>
                      <p className="text-gray-500">Birthday</p>
                      <p className="font-medium text-gray-900">{formatDate(String(selectedBartender.Birthday))}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">Shift Summary</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-500">Total Shifts</p>
                    <p className="font-medium text-gray-900">{selectedBartender.ShiftCount ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last Shift</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedBartender.LastShiftDate)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last Show</p>
                    <p className="font-medium text-gray-900">{selectedBartender.LastShowName || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => { setIsDetailOpen(false); setRemoveTarget(selectedBartender); }}
                className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                Remove Bartender
              </button>
              <button onClick={() => setIsDetailOpen(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

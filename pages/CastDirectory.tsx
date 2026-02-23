import React, { useState, useEffect } from 'react';
import { CastCard } from '../components/cast/CastCard';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { CastMemberWithDetails, Personnel } from '../types';
import { gasService } from '../services/googleAppsScript';

export const CastDirectory: React.FC = () => {
  const [castMembers, setCastMembers] = useState<CastMemberWithDetails[]>([]);
  const [filteredCastMembers, setFilteredCastMembers] = useState<CastMemberWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCastMember, setSelectedCastMember] = useState<CastMemberWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Cast Member modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Remove confirmation state
  const [removeTarget, setRemoveTarget] = useState<CastMemberWithDetails | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    loadCastMembers();
  }, []);

  useEffect(() => {
    const filtered = castMembers.filter(member =>
      `${member.FirstName || ''} ${(member as any).Lastname || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.PrimaryEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.PrimaryPhone || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCastMembers(filtered);
  }, [castMembers, searchTerm]);

  const loadCastMembers = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getAllCastMembers();
      if (response.success && response.data && Array.isArray((response.data as any).data)) {
        setCastMembers((response.data as any).data);
        setMessage(null);
      } else {
        setMessage({ type: 'error', text: (response.data && (response.data as any).error) || (response as any).error || 'Failed to load cast members' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading cast member data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddModal = async () => {
    setPersonnelSearch('');
    setIsAddModalOpen(true);
    if (allPersonnel.length === 0) {
      try {
        const response = await gasService.getAllPersonnel();
        if (response.success && Array.isArray(response.data)) {
          setAllPersonnel(response.data as Personnel[]);
        }
      } catch {
        // silently fail - user will see empty list
      }
    }
  };

  // Personnel not already in cast (by PersonnelID)
  const castPersonnelIds = new Set(castMembers.map(c => c.PersonnelID).filter(Boolean));
  const availablePersonnel = allPersonnel.filter(p => {
    const notInCast = !castPersonnelIds.has(p.PersonnelID);
    const matchesSearch = personnelSearch === '' ||
      `${p.FirstName} ${p.LastName}`.toLowerCase().includes(personnelSearch.toLowerCase()) ||
      (p.PrimaryEmail || '').toLowerCase().includes(personnelSearch.toLowerCase());
    return notInCast && matchesSearch;
  });

  const handleAddCastMember = async (personnel: Personnel) => {
    setIsAdding(true);
    try {
      const response = await gasService.addPersonAsCastMember(personnel.PersonnelID);
      if (response.success) {
        setMessage({ type: 'success', text: `${personnel.FirstName} ${personnel.LastName} added to cast.` });
        setIsAddModalOpen(false);
        await loadCastMembers();
      } else {
        setMessage({ type: 'error', text: (response as any).error || 'Failed to add cast member.' });
        setIsAddModalOpen(false);
      }
    } catch {
      setMessage({ type: 'error', text: 'Error adding cast member.' });
      setIsAddModalOpen(false);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveClick = (castMemberId: number) => {
    const target = castMembers.find(c => c.CastMemberID === castMemberId);
    if (target) setRemoveTarget(target);
  };

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    setIsRemoving(true);
    try {
      const response = await gasService.removeCastMember(removeTarget.CastMemberID);
      if (response.success) {
        setMessage({ type: 'success', text: `${removeTarget.FirstName} ${removeTarget.LastName} removed from cast.` });
        setRemoveTarget(null);
        await loadCastMembers();
      } else {
        setMessage({ type: 'error', text: (response as any).error || 'Failed to remove cast member.' });
        setRemoveTarget(null);
      }
    } catch {
      setMessage({ type: 'error', text: 'Error removing cast member.' });
      setRemoveTarget(null);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleCastMemberClick = (castMember: CastMemberWithDetails) => {
    setSelectedCastMember(castMember);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCastMember(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cast Directory</h1>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-600">{filteredCastMembers.length} cast assignments</p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            + Add Cast Member
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4">
          <Message
            type={message.type}
            message={message.text}
            onClose={() => setMessage(null)}
          />
        </div>
      )}

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {isLoading ? (
        <Loader text="Loading cast members..." />
      ) : message && message.type === 'error' ? (
        <div className="mb-4">
          <Message
            type="error"
            message={message.text}
            onClose={() => setMessage(null)}
          />
          <button
            onClick={loadCastMembers}
            className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredCastMembers.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">
          <p>No cast members found.</p>
          <button
            onClick={loadCastMembers}
            className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Reload
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCastMembers.map((castMember) => (
            <CastCard
              key={`${castMember.PerformanceID}-${castMember.CastMemberID}`}
              castMember={castMember}
              onClick={() => handleCastMemberClick(castMember)}
              onRemove={handleRemoveClick}
            />
          ))}
        </div>
      )}

      {/* Add Cast Member Modal */}
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
              <h2 className="text-lg font-semibold text-gray-900">Add Cast Member from Personnel</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>

            <input
              type="text"
              placeholder="Search personnel..."
              value={personnelSearch}
              onChange={(e) => setPersonnelSearch(e.target.value)}
              className="mb-3 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />

            <div className="overflow-y-auto flex-1">
              {availablePersonnel.length === 0 ? (
                <p className="text-center text-gray-500 py-6">No available personnel found.</p>
              ) : (
                availablePersonnel.map((person) => (
                  <div
                    key={person.PersonnelID}
                    className="flex items-center justify-between p-3 mb-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{`${person.FirstName} ${person.LastName}`.trim()}</p>
                      <p className="text-sm text-gray-500">{person.PrimaryEmail || 'No email'}</p>
                    </div>
                    <button
                      onClick={() => handleAddCastMember(person)}
                      disabled={isAdding}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      {isAdding ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {removeTarget && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setRemoveTarget(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Remove Cast Member</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove{' '}
              <span className="font-medium text-gray-900">
                {removeTarget.FirstName} {removeTarget.LastName}
              </span>{' '}
              from the cast directory? This will delete their entry from the CastMemberInfo table.
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

      {/* Cast Member Detail Modal */}
      {selectedCastMember && isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Cast Member Details</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <p className="text-gray-900">{`${selectedCastMember.FirstName || ''} ${(selectedCastMember as any).Lastname || ''}`.trim() || 'Unknown'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Show Date</label>
                <p className="text-gray-900">{formatDate((selectedCastMember as any).LastShowDate)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birthday</label>
                <p className="text-gray-900">{formatDate((selectedCastMember as any).Birthday)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                  selectedCastMember.Status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {selectedCastMember.Status || 'Unknown'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900">{selectedCastMember.PrimaryEmail || 'Not available'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <p className="text-gray-900">{selectedCastMember.PrimaryPhone || 'Not available'}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleCloseModal}
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

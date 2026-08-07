import React, { useState, useEffect } from 'react';
import { PersonCard } from '../components/personnel/PersonCard';
import { PersonnelModal } from '../components/personnel/PersonnelModal';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { Personnel, PersonnelWithDetails, ModalMode, PersonnelDeletionDependencies } from '../types';
import { gasService } from '../services/googleAppsScript';

export const PersonnelDirectory: React.FC = () => {
  const [personnel, setPersonnel] = useState<PersonnelWithDetails[]>([]);
  const [filteredPersonnel, setFilteredPersonnel] = useState<PersonnelWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'cast' | 'crew' | 'teacher' | 'director' | 'unassigned'>('all');
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<Personnel | null>(null);
  const [deleteDependencies, setDeleteDependencies] = useState<PersonnelDeletionDependencies | null>(null);
  const [forceDelete, setForceDelete] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return fallback;
  };

  const normalizePersonnelPayload = (personData: Personnel | Omit<Personnel, 'PersonnelID'>) => ({
    ...personData,
    PrimaryPhone: (personData as Personnel).PrimaryPhone?.trim() || '',
    Instagram: (personData as Personnel).Instagram?.trim() || '',
    Birthday: (personData as Personnel).Birthday
      ? String((personData as Personnel).Birthday).trim()
      : '',
  });

  useEffect(() => {
    loadPersonnel();
  }, []);

  useEffect(() => {
    const filtered = personnel.filter(person => {
      const isActive = person.IsActive !== false;
      const isVisibleByStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? isActive
          : !isActive;

      const matchesRole = (() => {
        if (roleFilter === 'all') return true;
        if (roleFilter === 'student') return person.isStudent === true;
        if (roleFilter === 'cast') return person.isCastMember === true;
        if (roleFilter === 'crew') return person.isCrewMember === true;
        if (roleFilter === 'teacher') return person.isTeacher === true;
        if (roleFilter === 'director') return person.isDirector === true;
        return !person.isStudent && !person.isCastMember && !person.isCrewMember && !person.isTeacher && !person.isDirector;
      })();

      const normalizedQuery = searchTerm.trim().toLowerCase();
      const matchesSearch =
        normalizedQuery === ''
          || `${person.FirstName} ${person.LastName}`.toLowerCase().includes(normalizedQuery)
          || person.PrimaryEmail.toLowerCase().includes(normalizedQuery)
          || (person.PrimaryPhone || '').toLowerCase().includes(normalizedQuery);

      return isVisibleByStatus && matchesRole && matchesSearch;
    });
    setFilteredPersonnel(filtered);
  }, [personnel, searchTerm, statusFilter, roleFilter]);

  const loadPersonnel = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getAllPersonnel();
      if (response.success && response.data) {
        setPersonnel(response.data);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to load personnel' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading personnel data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonClick = (person: Personnel) => {
    setSelectedPerson(person);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedPerson(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEditPerson = () => {
    setModalMode('edit');
  };

  const handleDeletePerson = async () => {
    if (selectedPerson) {
      try {
        const response = await gasService.getPersonnelDeletionDependencies(selectedPerson.PersonnelID);
        if (!response.success || !response.data) {
          setMessage({ type: 'error', text: response.error || 'Failed to check deletion dependencies' });
          return;
        }

        setPersonToDelete(selectedPerson);
        setDeleteDependencies(response.data);
        setForceDelete(false);
        setIsDeleteModalOpen(true);
        setIsModalOpen(false);
      } catch (_error) {
        setMessage({ type: 'error', text: 'Error checking deletion dependencies' });
      }
    }
  };

  const confirmDelete = async () => {
    if (personToDelete) {
      try {
        const response = await gasService.deletePersonnel(personToDelete.PersonnelID, forceDelete);
        if (response.success) {
          setMessage({ type: 'success', text: 'Personnel deleted successfully' });
          loadPersonnel();
        } else {
          setMessage({ type: 'error', text: response.error || 'Failed to delete personnel' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Error deleting personnel' });
      }
    }
    setIsDeleteModalOpen(false);
    setPersonToDelete(null);
    setDeleteDependencies(null);
    setForceDelete(false);
  };

  const handleInactivate = async () => {
    if (!personToDelete) return;

    try {
      const response = await gasService.inactivatePersonnel(personToDelete.PersonnelID);
      if (response.success) {
        setMessage({ type: 'success', text: 'Personnel inactivated successfully' });
        await loadPersonnel();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to inactivate personnel' });
      }
    } catch (_error) {
      setMessage({ type: 'error', text: 'Error inactivating personnel' });
    }

    setIsDeleteModalOpen(false);
    setPersonToDelete(null);
    setDeleteDependencies(null);
    setForceDelete(false);
  };

  const handleReactivate = async () => {
    if (!selectedPerson) return;

    try {
      const response = await gasService.reactivatePersonnel(selectedPerson.PersonnelID);
      if (response.success) {
        setMessage({ type: 'success', text: 'Personnel reactivated successfully' });
        setIsModalOpen(false);
        setSelectedPerson(null);
        await loadPersonnel();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to reactivate personnel' });
      }
    } catch (_error) {
      setMessage({ type: 'error', text: 'Error reactivating personnel' });
    }
  };

  const handleSavePerson = async (personData: Personnel | Omit<Personnel, 'PersonnelID'>) => {
    const normalized = normalizePersonnelPayload(personData);
    const emailToCheck = (normalized as Personnel).PrimaryEmail?.trim().toLowerCase();
    const duplicate = personnel.find(p => {
      const isSelf = modalMode === 'edit' && (normalized as Personnel).PersonnelID === p.PersonnelID;
      return !isSelf && p.PrimaryEmail?.trim().toLowerCase() === emailToCheck;
    });
    if (duplicate) {
      throw new Error(`A person with the email "${emailToCheck}" already exists (${duplicate.FirstName} ${duplicate.LastName}).`);
    }

    try {
      let response;
      if (modalMode === 'create') {
        response = await gasService.createPersonnel(normalized as Omit<Personnel, 'PersonnelID'>);
      } else {
        response = await gasService.updatePersonnel(normalized as Personnel);
      }

      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: modalMode === 'create' ? 'Personnel created successfully' : 'Personnel updated successfully'
        });
        await loadPersonnel();
      } else {
        throw new Error(getErrorMessage(response.error, 'Failed to save personnel'));
      }
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to save personnel'));
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPerson(null);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 sm:mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Personnel Directory</h1>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Add New Person
        </button>
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

      <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            title="Filter by active status"
          >
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="all">All Status</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            title="Filter by role"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="cast">Cast</option>
            <option value="crew">Crew</option>
            <option value="teacher">Teachers</option>
            <option value="director">Directors</option>
            <option value="unassigned">No Role Tags</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('active');
              setRoleFilter('all');
            }}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600">Showing {filteredPersonnel.length} of {personnel.length} personnel records</p>
      </div>

      {isLoading ? (
        <Loader text="Loading personnel..." />
      ) : message && message.type === 'error' ? (
        <div className="mb-4">
          <Message
            type="error"
            message={message.text}
            onClose={() => setMessage(null)}
          />
          <button
            onClick={loadPersonnel}
            className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredPersonnel.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">
          <p>No personnel records found.</p>
          <button
            onClick={loadPersonnel}
            className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Reload
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPersonnel.map((person) => (
            <PersonCard
              key={person.PersonnelID}
              person={person}
              onClick={() => handlePersonClick(person)}
            />
          ))}
        </div>
      )}

      <PersonnelModal
        isOpen={isModalOpen}
        mode={modalMode}
        person={selectedPerson || undefined}
        onClose={handleCloseModal}
        onSave={handleSavePerson}
        onEdit={handleEditPerson}
        onDelete={handleDeletePerson}
        onReactivate={handleReactivate}
      />

      {isDeleteModalOpen && personToDelete && deleteDependencies && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Delete Personnel</h3>
            <p className="text-sm text-gray-700 mb-4">
              Are you sure you want to delete {personToDelete.FirstName} {personToDelete.LastName}?
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Tip: Use Inactivate Instead to archive this person without permanently deleting their record.
            </p>

            {deleteDependencies.totalReferences > 0 ? (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-900 mb-2">
                  {deleteDependencies.totalReferences} related record(s) found.
                </p>
                <div className="text-xs text-amber-900 space-y-1 max-h-40 overflow-auto">
                  {Object.entries(deleteDependencies.references)
                    .filter(([, count]) => count > 0)
                    .map(([key, count]) => (
                      <div key={key} className="flex justify-between">
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                </div>
                <label className="mt-3 flex items-start gap-2 text-sm text-amber-900">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={forceDelete}
                    onChange={(e) => setForceDelete(e.target.checked)}
                  />
                  I understand this person is referenced elsewhere and want to force delete anyway.
                </label>
              </div>
            ) : (
              <p className="text-sm text-gray-600 mb-4">No dependent records found.</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setPersonToDelete(null);
                  setDeleteDependencies(null);
                  setForceDelete(false);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInactivate}
                className="px-4 py-2 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-50"
              >
                Inactivate Instead
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteDependencies.totalReferences > 0 && !forceDelete}
                className={`px-4 py-2 rounded-lg text-white ${
                  deleteDependencies.totalReferences > 0 && !forceDelete
                    ? 'bg-red-300 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {deleteDependencies.totalReferences > 0 ? 'Force Delete' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
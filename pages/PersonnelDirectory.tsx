import React, { useState, useEffect } from 'react';
import { PersonCard } from '../components/personnel/PersonCard';
import { PersonnelModal } from '../components/personnel/PersonnelModal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { Personnel, PersonnelWithDetails, ModalMode } from '../types';
import { gasService } from '../services/googleAppsScript';

export const PersonnelDirectory: React.FC = () => {
  const [personnel, setPersonnel] = useState<PersonnelWithDetails[]>([]);
  const [filteredPersonnel, setFilteredPersonnel] = useState<PersonnelWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<Personnel | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPersonnel();
  }, []);

  useEffect(() => {
    const filtered = personnel.filter(person =>
      `${person.FirstName} ${person.LastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      person.PrimaryEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPersonnel(filtered);
  }, [personnel, searchTerm]);

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

  const handleDeletePerson = () => {
    if (selectedPerson) {
      setPersonToDelete(selectedPerson);
      setIsDeleteModalOpen(true);
      setIsModalOpen(false);
    }
  };

  const confirmDelete = async () => {
    if (personToDelete) {
      try {
        const response = await gasService.deletePersonnel(personToDelete.PersonnelID);
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
  };

  const handleSavePerson = async (personData: Personnel | Omit<Personnel, 'PersonnelID'>) => {
    try {
      let response;
      if (modalMode === 'create') {
        response = await gasService.createPersonnel(personData as Omit<Personnel, 'PersonnelID'>);
      } else {
        response = await gasService.updatePersonnel(personData as Personnel);
      }

      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: modalMode === 'create' ? 'Personnel created successfully' : 'Personnel updated successfully'
        });
        loadPersonnel();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to save personnel' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving personnel' });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPerson(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
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

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
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
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Personnel"
        message={`Are you sure you want to delete ${personToDelete?.FirstName} ${personToDelete?.LastName}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        isDestructive={true}
      />
    </div>
  );
};
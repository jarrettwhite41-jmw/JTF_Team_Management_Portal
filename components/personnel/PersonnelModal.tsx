import React, { useState, useEffect } from 'react';
import { Personnel, ModalMode } from '../../types';
import { Loader } from '../common/Loader';

interface PersonnelModalProps {
  isOpen: boolean;
  mode: ModalMode;
  person?: Personnel;
  onClose: () => void;
  onSave: (person: Personnel | Omit<Personnel, 'PersonnelID'>) => Promise<void>;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const PersonnelModal: React.FC<PersonnelModalProps> = ({
  isOpen,
  mode,
  person,
  onClose,
  onSave,
  onEdit,
  onDelete
}) => {
  const [formData, setFormData] = useState<Partial<Personnel>>({
    FirstName: '',
    LastName: '',
    PrimaryEmail: '',
    PrimaryPhone: '',
    Instagram: '',
    Birthday: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (person) {
      setFormData(person);
    } else {
      setFormData({
        FirstName: '',
        LastName: '',
        PrimaryEmail: '',
        PrimaryPhone: '',
        Instagram: '',
        Birthday: ''
      });
    }
  }, [person, isOpen]);

  const handleInputChange = (field: keyof Personnel, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (mode === 'create') {
        await onSave(formData as Omit<Personnel, 'PersonnelID'>);
      } else {
        await onSave(formData as Personnel);
      }
      onClose();
    } catch (error) {
      console.error('Error saving personnel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const isEditable = mode === 'edit' || mode === 'create';
  const title = mode === 'create' ? 'Add New Personnel' : 
               mode === 'edit' ? 'Edit Personnel' : 'Personnel Details';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        {isLoading ? (
          <Loader />
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                {isEditable ? (
                  <input
                    type="text"
                    value={formData.FirstName || ''}
                    onChange={(e) => handleInputChange('FirstName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                ) : (
                  <p className="py-2 text-gray-900">{formData.FirstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                {isEditable ? (
                  <input
                    type="text"
                    value={formData.LastName || ''}
                    onChange={(e) => handleInputChange('LastName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                ) : (
                  <p className="py-2 text-gray-900">{formData.Lastname}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                {isEditable ? (
                  <input
                    type="email"
                    value={formData.PrimaryEmail || ''}
                    onChange={(e) => handleInputChange('PrimaryEmail', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                ) : (
                  <p className="py-2 text-gray-900">{formData.PrimaryEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                {isEditable ? (
                  <input
                    type="tel"
                    value={formData.PrimaryPhone || ''}
                    onChange={(e) => handleInputChange('PrimaryPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="py-2 text-gray-900">{formData.PrimaryPhone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instagram
                </label>
                {isEditable ? (
                  <input
                    type="text"
                    value={formData.Instagram || ''}
                    onChange={(e) => handleInputChange('Instagram', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="@username"
                  />
                ) : (
                  <p className="py-2 text-gray-900">{formData.Instagram}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birthday
                </label>
                {isEditable ? (
                  <input
                    type="date"
                    value={formData.Birthday ? formData.Birthday.toString().split('T')[0] : ''}
                    onChange={(e) => handleInputChange('Birthday', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="py-2 text-gray-900">
                    {formData.Birthday ? new Date(formData.Birthday).toLocaleDateString() : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {mode === 'view' ? 'Close' : 'Cancel'}
              </button>
              
              {mode === 'view' && person && (
                <>
                  <button
                    type="button"
                    onClick={onEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </>
              )}
              
              {isEditable && (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {mode === 'create' ? 'Create' : 'Save Changes'}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
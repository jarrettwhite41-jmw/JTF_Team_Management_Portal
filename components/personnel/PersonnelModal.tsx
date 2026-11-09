import React, { useState, useEffect } from 'react';
import { Personnel, ModalMode } from '../../types';
import { Loader } from '../common/Loader';

interface PersonnelModalProps {
  isOpen: boolean;
  mode: ModalMode;
  person?: Personnel;
  onClose: () => void;
  onSave: (person: Personnel | Omit<Personnel, 'PersonnelID'>, roles?: { isStudent?: boolean; isCast?: boolean; isTeacher?: boolean; isDirector?: boolean; isBartender?: boolean }) => Promise<void>;
  onEdit?: () => void;
  onDelete?: () => void;
  onReactivate?: () => void;
}

export const PersonnelModal: React.FC<PersonnelModalProps> = ({
  isOpen,
  mode,
  person,
  onClose,
  onSave,
  onEdit,
  onDelete,
  onReactivate
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);

  // Initial role assignment flags for new personnel creation
  const [assignRoles, setAssignRoles] = useState({
    isStudent: false,
    isCast: false,
    isTeacher: false,
    isDirector: false,
    isBartender: false,
  });

  const emptyForm = {
    FirstName: '',
    LastName: '',
    PrimaryEmail: '',
    PrimaryPhone: '',
    Instagram: '',
    Birthday: ''
  };

  useEffect(() => {
    setErrorMessage(null);
    setSuccessCount(0);
    setAssignRoles({
      isStudent: false,
      isCast: false,
      isTeacher: false,
      isDirector: false,
      isBartender: false,
    });
    if (person) {
      setFormData(person);
    } else {
      setFormData(emptyForm);
    }
  }, [person, isOpen]);

  const handleInputChange = (field: keyof Personnel, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (mode === 'create') {
        await onSave(formData as Omit<Personnel, 'PersonnelID'>, assignRoles);
      } else {
        await onSave(formData as Personnel);
      }
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndAddAnother = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await onSave(formData as Omit<Personnel, 'PersonnelID'>, assignRoles);
      setSuccessCount(prev => prev + 1);
      setFormData(emptyForm);
      setAssignRoles({
        isStudent: false,
        isCast: false,
        isTeacher: false,
        isDirector: false,
        isBartender: false,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred. Please try again.');
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
            {successCount > 0 && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                {successCount} person{successCount > 1 ? 's' : ''} added. Fill in the form below to add another.
              </div>
            )}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {errorMessage}
              </div>
            )}
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
                  <p className="py-2 text-gray-900">{formData.LastName}</p>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact Name
                </label>
                {isEditable ? (
                  <input
                    type="text"
                    value={formData.EmergencyContactName || ''}
                    onChange={(e) => handleInputChange('EmergencyContactName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g. Jane Doe (Parent/Spouse)"
                  />
                ) : (
                  <p className="py-2 text-gray-900">{formData.EmergencyContactName || 'None'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact Phone
                </label>
                {isEditable ? (
                  <input
                    type="tel"
                    value={formData.EmergencyContactPhone || ''}
                    onChange={(e) => handleInputChange('EmergencyContactPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="(555) 000-0000"
                  />
                ) : (
                  <p className="py-2 text-gray-900">{formData.EmergencyContactPhone || 'None'}</p>
                )}
              </div>
            </div>
            {mode === 'create' && (
              <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-gray-800">Assign Initial Roles</span>
                  <span className="text-xs text-gray-500">(Optional - provisions profiles immediately upon creation)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={assignRoles.isStudent}
                      onChange={(e) => setAssignRoles(prev => ({ ...prev, isStudent: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>🎓 Student</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={assignRoles.isCast}
                      onChange={(e) => setAssignRoles(prev => ({ ...prev, isCast: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>🎭 Cast Member</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={assignRoles.isTeacher}
                      onChange={(e) => setAssignRoles(prev => ({ ...prev, isTeacher: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>🧑‍🏫 Instructor</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={assignRoles.isDirector}
                      onChange={(e) => setAssignRoles(prev => ({ ...prev, isDirector: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>🎬 Director</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={assignRoles.isBartender}
                      onChange={(e) => setAssignRoles(prev => ({ ...prev, isBartender: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>🍺 Bartender</span>
                  </label>
                </div>
              </div>
            )}
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
                  {person.IsActive === false && (
                    <button
                      type="button"
                      onClick={onReactivate}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Reactivate
                    </button>
                  )}
                </>
              )}
              
              {isEditable && (
                <>
                  {mode === 'create' && (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleSaveAndAddAnother}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      Save & Add Another
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    {mode === 'create' ? 'Save & Close' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
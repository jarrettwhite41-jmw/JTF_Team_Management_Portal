import React, { useState, useEffect } from 'react';
import { Inventory, ModalMode } from '../../types';
import { Loader } from '../common/Loader';

interface InventoryModalProps {
  isOpen: boolean;
  mode: ModalMode;
  item?: Inventory;
  onClose: () => void;
  onSave: (item: Inventory | Omit<Inventory, 'ItemID'>) => Promise<void>;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  mode,
  item,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<Inventory>>({
    ItemName: '',
    Category: '',
    Quantity: 0,
    Location: '',
    Notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        ItemName: '',
        Category: '',
        Quantity: 0,
        Location: '',
        Notes: ''
      });
    }
  }, [item, isOpen]);

  const handleInputChange = (field: keyof Inventory, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (mode === 'create') {
        await onSave(formData as Omit<Inventory, 'ItemID'>);
      } else {
        await onSave(formData as Inventory);
      }
      onClose();
    } catch (error) {
      console.error('Error saving inventory item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const isEditable = mode === 'edit' || mode === 'create';
  const title = mode === 'create' ? 'Add New Item' : 
               mode === 'edit' ? 'Edit Item' : 'Item Details';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
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
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name
                </label>
                {isEditable ? (
                  <input
                    type="text"
                    value={formData.ItemName || ''}
                    onChange={(e) => handleInputChange('ItemName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                ) : (
                  <p className="py-2 text-gray-900">{formData.ItemName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                {isEditable ? (
                  <input
                    type="text"
                    value={formData.Category || ''}
                    onChange={(e) => handleInputChange('Category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                ) : (
                  <p className="py-2 text-gray-900">{formData.Category}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                {isEditable ? (
                  <input
                    type="number"
                    min="0"
                    value={formData.Quantity || 0}
                    onChange={(e) => handleInputChange('Quantity', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                ) : (
                  <p className="py-2 text-gray-900">{formData.Quantity}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                {isEditable ? (
                  <input
                    type="text"
                    value={formData.Location || ''}
                    onChange={(e) => handleInputChange('Location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="py-2 text-gray-900">{formData.Location}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                {isEditable ? (
                  <textarea
                    value={formData.Notes || ''}
                    onChange={(e) => handleInputChange('Notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="py-2 text-gray-900">{formData.Notes}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {mode === 'view' ? 'Close' : 'Cancel'}
              </button>
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
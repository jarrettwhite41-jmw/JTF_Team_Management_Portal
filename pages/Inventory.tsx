import React, { useState, useEffect } from 'react';
import { InventoryModal } from '../components/inventory/InventoryModal';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { Inventory, ModalMode } from '../types';
import { gasService } from '../services/googleAppsScript';

export const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Inventory | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getAllInventory();
      if (response.success && response.data) {
        setInventory(response.data);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to load inventory' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading inventory data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setSelectedItem(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (item: Inventory) => {
    setSelectedItem(item);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDelete = (item: Inventory) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      try {
        const response = await gasService.deleteInventoryItem(itemToDelete.ItemID);
        if (response.success) {
          setMessage({ type: 'success', text: 'Item deleted successfully' });
          loadInventory();
        } else {
          setMessage({ type: 'error', text: response.error || 'Failed to delete item' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Error deleting item' });
      }
    }
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const handleSaveItem = async (itemData: Inventory | Omit<Inventory, 'ItemID'>) => {
    try {
      let response;
      if (modalMode === 'create') {
        response = await gasService.createInventoryItem(itemData as Omit<Inventory, 'ItemID'>);
      } else {
        response = await gasService.updateInventoryItem(itemData as Inventory);
      }

      if (response.success) {
        setMessage({ 
          type: 'success', 
          text: modalMode === 'create' ? 'Item created successfully' : 'Item updated successfully'
        });
        loadInventory();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to save item' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving item' });
    }
  };

  if (isLoading) {
    return <Loader text="Loading inventory..." />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <button
          onClick={handleAddNew}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Add Item
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

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventory.map((item) => (
              <tr key={item.ItemID} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.ItemName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.Category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.Quantity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.Location}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InventoryModal
        isOpen={isModalOpen}
        mode={modalMode}
        item={selectedItem || undefined}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Inventory Item"
        message={`Are you sure you want to delete "${itemToDelete?.ItemName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        isDestructive={true}
      />
    </div>
  );
};
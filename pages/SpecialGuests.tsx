import React, { useEffect, useState } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { gasService } from '../services/googleAppsScript';
import { SpecialGuest } from '../types';

type SpecialGuestFormData = {
  FullName: string;
  PrimaryEmail: string;
  PrimaryPhone: string;
  Expertise: string;
  Notes: string;
  Active: boolean;
};

const emptyForm: SpecialGuestFormData = {
  FullName: '',
  PrimaryEmail: '',
  PrimaryPhone: '',
  Expertise: '',
  Notes: '',
  Active: true,
};

interface SpecialGuestModalProps {
  isOpen: boolean;
  guest: SpecialGuest | null;
  onClose: () => void;
  onSaved: () => void;
}

const SpecialGuestModal: React.FC<SpecialGuestModalProps> = ({ isOpen, guest, onClose, onSaved }) => {
  const [form, setForm] = useState<SpecialGuestFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (guest) {
      setForm({
        FullName: guest.FullName || '',
        PrimaryEmail: guest.PrimaryEmail || '',
        PrimaryPhone: guest.PrimaryPhone || '',
        Expertise: guest.Expertise || '',
        Notes: guest.Notes || '',
        Active: guest.Active !== false,
      });
    } else {
      setForm(emptyForm);
    }
  }, [isOpen, guest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSaving(true);

    try {
      const payload: Omit<SpecialGuest, 'SpecialGuestID'> = {
        FullName: form.FullName.trim(),
        PrimaryEmail: form.PrimaryEmail.trim(),
        PrimaryPhone: form.PrimaryPhone.trim(),
        Expertise: form.Expertise.trim(),
        Notes: form.Notes.trim(),
        Active: form.Active,
      };

      const response = guest
        ? await gasService.updateSpecialGuest(guest.SpecialGuestID, payload)
        : await gasService.createSpecialGuest(payload);

      if (response.success) {
        setMessage({ type: 'success', text: guest ? 'Special guest updated successfully' : 'Special guest created successfully' });
        onSaved();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to save special guest' });
      }
    } catch (_error) {
      setMessage({ type: 'error', text: 'Error saving special guest' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">{guest ? 'Edit Special Guest' : 'Add Special Guest'}</h2>
          <button onClick={onClose} className="text-2xl font-bold text-gray-400 hover:text-gray-600">x</button>
        </div>

        {message && (
          <div className="px-6 pt-4">
            <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={form.FullName}
              onChange={(e) => setForm((prev) => ({ ...prev, FullName: e.target.value }))}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.PrimaryEmail}
                onChange={(e) => setForm((prev) => ({ ...prev, PrimaryEmail: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={form.PrimaryPhone}
                onChange={(e) => setForm((prev) => ({ ...prev, PrimaryPhone: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expertise</label>
            <input
              type="text"
              value={form.Expertise}
              onChange={(e) => setForm((prev) => ({ ...prev, Expertise: e.target.value }))}
              placeholder="Example: Musical improv, character work, long-form"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.Notes}
              onChange={(e) => setForm((prev) => ({ ...prev, Notes: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.Active}
              onChange={(e) => setForm((prev) => ({ ...prev, Active: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300"
            />
            Active (available for workshop assignment)
          </label>
        </form>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={isSaving} className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50">
            {isSaving ? 'Saving...' : guest ? 'Save Changes' : 'Create Guest'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const SpecialGuests: React.FC = () => {
  const [guests, setGuests] = useState<SpecialGuest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<SpecialGuest | null>(null);

  const loadGuests = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getAllSpecialGuests();
      if (response.success && response.data) {
        const sorted = [...(response.data || [])].sort((a, b) => a.FullName.localeCompare(b.FullName, undefined, { sensitivity: 'base' }));
        setGuests(sorted);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to load special guests' });
      }
    } catch (_error) {
      setMessage({ type: 'error', text: 'Error loading special guests' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGuests();
  }, []);

  const handleDelete = async (guest: SpecialGuest) => {
    if (!confirm(`Delete special guest "${guest.FullName}"?`)) return;

    const response = await gasService.deleteSpecialGuest(guest.SpecialGuestID);
    if (response.success) {
      setMessage({ type: 'success', text: 'Special guest deleted' });
      await loadGuests();
    } else {
      setMessage({ type: 'error', text: response.error || 'Failed to delete special guest' });
    }
  };

  if (isLoading) return <Loader text="Loading special guests..." />;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Special Guests</h1>
          <p className="text-gray-600">Manage external instructors and workshop guests</p>
        </div>
        <button
          onClick={() => {
            setSelectedGuest(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Add Special Guest
        </button>
      </div>

      {message && (
        <div className="mb-4">
          <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />
        </div>
      )}

      {guests.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">No special guests found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guests.map((guest) => (
            <div key={guest.SpecialGuestID} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{guest.FullName}</h3>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${guest.Active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                  {guest.Active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-700 mb-4">
                <p>{guest.PrimaryEmail || 'No email provided'}</p>
                <p>{guest.PrimaryPhone || 'No phone provided'}</p>
                <p>{guest.Expertise || 'No expertise listed'}</p>
                {guest.Notes ? <p className="text-gray-600">{guest.Notes}</p> : null}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setSelectedGuest(guest);
                    setIsModalOpen(true);
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(guest)}
                  className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SpecialGuestModal
        isOpen={isModalOpen}
        guest={selectedGuest}
        onClose={() => setIsModalOpen(false)}
        onSaved={async () => {
          setIsModalOpen(false);
          await loadGuests();
        }}
      />
    </div>
  );
};

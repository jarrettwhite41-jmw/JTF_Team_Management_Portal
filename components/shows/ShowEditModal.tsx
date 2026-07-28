import React, { useEffect, useState } from 'react';
import { Message } from '../common/Message';
import { supabaseService as gasService } from '../../services/supabaseService';
import { ShowInformation, ShowWithDetails } from '../../types';

interface ShowEditModalProps {
  isOpen: boolean;
  show?: ShowWithDetails | null;
  onClose: () => void;
  onSaved: () => void;
}

interface DirectorOption {
  DirectorID: number;
  PersonnelID: number;
  FirstName: string;
  LastName: string;
  PrimaryEmail: string;
}

interface ShowTypeOption {
  ShowTypeID: number;
  ShowTypeName: string;
}

interface RoomOption {
  RoomID: number;
  RoomName: string;
}

const emptyForm = {
  ShowDate: '',
  ShowTime: '21:00',
  ShowTypeID: '',
  DirectorID: '',
  Venue: '',
  Status: 'Scheduled' as ShowInformation['Status'],
};

const toDateInputValue = (value: Date | string | undefined) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ShowEditModal: React.FC<ShowEditModalProps> = ({ isOpen, show, onClose, onSaved }) => {
  const [form, setForm] = useState(emptyForm);
  const [showTypes, setShowTypes] = useState<ShowTypeOption[]>([]);
  const [directors, setDirectors] = useState<DirectorOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const toErrorText = (error: unknown): string => {
    if (typeof error === 'string') return error;
    if (!error) return 'An unexpected error occurred';
    if (typeof error === 'object') {
      const maybeError = error as { message?: unknown; error?: unknown };
      if (typeof maybeError.message === 'string' && maybeError.message.trim()) return maybeError.message;
      if (typeof maybeError.error === 'string' && maybeError.error.trim()) return maybeError.error;
      return JSON.stringify(error);
    }
    return String(error);
  };

  useEffect(() => {
    if (!isOpen) return;

    const loadOptions = async () => {
      setIsLoading(true);
      try {
        const [showTypesResponse, directorsResponse, roomsResponse] = await Promise.all([
          gasService.getAllShowTypes(),
          gasService.getAllDirectors(),
          gasService.getAllRooms(),
        ]);

        if (showTypesResponse.success) {
          setShowTypes(showTypesResponse.data || []);
        } else {
          setMessage({ type: 'error', text: showTypesResponse.error || 'Failed to load show types' });
        }

        if (directorsResponse.success) {
          setDirectors(directorsResponse.data || []);
        } else {
          setMessage({ type: 'error', text: directorsResponse.error || 'Failed to load directors' });
        }

        if (roomsResponse.success) {
          setRooms(roomsResponse.data || []);
        } else {
          setMessage({ type: 'error', text: toErrorText(roomsResponse.error) || 'Failed to load venues' });
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadOptions();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (show) {
      setForm({
        ShowDate: toDateInputValue(show.ShowDate),
        ShowTime: show.ShowTime || '21:00',
        ShowTypeID: String(show.ShowTypeID || ''),
        DirectorID: String(show.DirectorID || ''),
        Venue: show.Venue || '',
        Status: show.Status || 'Scheduled',
      });
    } else {
      setForm(emptyForm);
    }
  }, [isOpen, show]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const payload: Omit<ShowInformation, 'ShowID'> = {
        ShowDate: form.ShowDate,
        ShowTime: form.ShowTime,
        ShowTypeID: Number(form.ShowTypeID),
        DirectorID: form.DirectorID ? Number(form.DirectorID) : null,
        Venue: form.Venue.trim(),
        Status: form.Status,
      };

      const response = show
        ? await gasService.updateShow(show.ShowID, payload)
        : await gasService.createShow(payload);

      if (response.success) {
        setMessage({ type: 'success', text: show ? 'Show updated successfully' : 'Show created successfully' });
        onSaved();
      } else {
        setMessage({ type: 'error', text: toErrorText(response.error) || 'Failed to save show' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: toErrorText(error) || 'Error saving show' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!show) return;
    if (!confirm(`Delete ${show.ShowTypeName || 'this show'}? This will remove its cast and crew assignments.`)) return;

    setIsDeleting(true);
    setMessage(null);
    try {
      const response = await gasService.deleteShow(show.ShowID);
      if (response.success) {
        setMessage({ type: 'success', text: 'Show deleted successfully' });
        onSaved();
      } else {
        setMessage({ type: 'error', text: toErrorText(response.error) || 'Failed to delete show' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: toErrorText(error) || 'Error deleting show' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{show ? 'Edit Show' : 'Add New Show'}</h2>
            <p className="text-sm text-gray-500">{show ? `Show #${show.ShowID}` : 'Create a new show event'}</p>
          </div>
          <button onClick={onClose} className="text-2xl font-bold text-gray-400 hover:text-gray-600">×</button>
        </div>

        {message && (
          <div className="px-6 pt-4">
            <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-gray-500">Loading form options...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Show Date</label>
                  <input
                    type="date"
                    name="ShowDate"
                    value={form.ShowDate}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Show Time</label>
                  <input
                    type="time"
                    name="ShowTime"
                    value={form.ShowTime}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Show Type</label>
                  <select
                    name="ShowTypeID"
                    value={form.ShowTypeID}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a show type</option>
                    {showTypes.map(type => (
                      <option key={type.ShowTypeID} value={type.ShowTypeID}>{type.ShowTypeName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Director</label>
                  <select
                    name="DirectorID"
                    value={form.DirectorID}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">No director assigned</option>
                    {directors.map(director => (
                      <option key={director.DirectorID} value={director.DirectorID}>
                        {director.FirstName} {director.LastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                <select
                  name="Venue"
                  value={form.Venue}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a venue</option>
                  {rooms.map(room => (
                    <option key={room.RoomID} value={room.RoomName}>{room.RoomName}</option>
                  ))}
                  {form.Venue && !rooms.some(room => room.RoomName === form.Venue) && (
                    <option value={form.Venue}>{form.Venue}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="Status"
                  value={form.Status}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Canceled">Canceled</option>
                </select>
              </div>
            </>
          )}
        </form>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-6 py-4">
          <div>
            {show && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSaving || isLoading}
                className="rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Show'}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || isLoading}
            className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : show ? 'Save Changes' : 'Create Show'}
          </button>
        </div>
      </div>
    </div>
  );
};
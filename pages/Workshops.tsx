import React, { useEffect, useMemo, useState } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { gasService } from '../services/googleAppsScript';
import { Personnel, Workshop, WorkshopRegistration } from '../types';

type FilterType = 'all' | 'upcoming' | 'completed' | 'canceled';

type WorkshopFormData = {
  Title: string;
  Description: string;
  WorkshopDate: string;
  StartTime: string;
  EndTime: string;
  RoomID: string;
  Venue: string;
  InstructorPersonnelID: string;
  Capacity: string;
  Status: 'Upcoming' | 'Completed' | 'Canceled';
  Notes: string;
};

const emptyForm: WorkshopFormData = {
  Title: '',
  Description: '',
  WorkshopDate: '',
  StartTime: '',
  EndTime: '',
  RoomID: '',
  Venue: '',
  InstructorPersonnelID: '',
  Capacity: '20',
  Status: 'Upcoming',
  Notes: '',
};

const computeWorkshopStatus = (workshop: Workshop): 'Upcoming' | 'Completed' | 'Canceled' => {
  const explicitStatus = String(workshop.Status || '').toLowerCase();
  if (explicitStatus === 'canceled') return 'Canceled';

  const rawDate = String(workshop.WorkshopDate || '').slice(0, 10);
  const workshopDate = new Date(`${rawDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!Number.isNaN(workshopDate.getTime()) && workshopDate.getTime() < today.getTime()) return 'Completed';
  return 'Upcoming';
};

interface WorkshopEditModalProps {
  isOpen: boolean;
  workshop: Workshop | null;
  rooms: Array<{ RoomID: number; RoomName: string }>;
  instructors: Personnel[];
  onClose: () => void;
  onSaved: () => void;
}

const WorkshopEditModal: React.FC<WorkshopEditModalProps> = ({ isOpen, workshop, rooms, instructors, onClose, onSaved }) => {
  const [form, setForm] = useState<WorkshopFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (workshop) {
      setForm({
        Title: workshop.Title || '',
        Description: workshop.Description || '',
        WorkshopDate: String(workshop.WorkshopDate || '').slice(0, 10),
        StartTime: workshop.StartTime || '',
        EndTime: workshop.EndTime || '',
        RoomID: workshop.RoomID ? String(workshop.RoomID) : '',
        Venue: workshop.Venue || '',
        InstructorPersonnelID: workshop.InstructorPersonnelID ? String(workshop.InstructorPersonnelID) : '',
        Capacity: String(workshop.Capacity || 0),
        Status: workshop.Status || computeWorkshopStatus(workshop),
        Notes: workshop.Notes || '',
      });
    } else {
      setForm(emptyForm);
    }
  }, [isOpen, workshop]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSaving(true);

    try {
      const payload: Omit<Workshop, 'WorkshopID'> = {
        Title: form.Title.trim(),
        Description: form.Description.trim(),
        WorkshopDate: form.WorkshopDate,
        StartTime: form.StartTime || '',
        EndTime: form.EndTime || '',
        RoomID: form.RoomID ? Number(form.RoomID) : null,
        Venue: form.Venue.trim(),
        InstructorPersonnelID: form.InstructorPersonnelID ? Number(form.InstructorPersonnelID) : null,
        Capacity: Number(form.Capacity || 0),
        Status: form.Status,
        Notes: form.Notes.trim(),
      };

      const response = workshop
        ? await gasService.updateWorkshop(workshop.WorkshopID, payload)
        : await gasService.createWorkshop(payload);

      if (response.success) {
        setMessage({ type: 'success', text: workshop ? 'Workshop updated successfully' : 'Workshop created successfully' });
        onSaved();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to save workshop' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving workshop' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">{workshop ? 'Edit Workshop' : 'Add Workshop'}</h2>
          <button onClick={onClose} className="text-2xl font-bold text-gray-400 hover:text-gray-600">x</button>
        </div>

        {message && (
          <div className="px-6 pt-4">
            <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={form.Title}
              onChange={(e) => setForm(prev => ({ ...prev, Title: e.target.value }))}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.Description}
              onChange={(e) => setForm(prev => ({ ...prev, Description: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={form.WorkshopDate} onChange={(e) => setForm(prev => ({ ...prev, WorkshopDate: e.target.value }))} required className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
              <input type="time" value={form.StartTime} onChange={(e) => setForm(prev => ({ ...prev, StartTime: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
              <input type="time" value={form.EndTime} onChange={(e) => setForm(prev => ({ ...prev, EndTime: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
              <select value={form.RoomID} onChange={(e) => setForm(prev => ({ ...prev, RoomID: e.target.value, Venue: rooms.find(r => String(r.RoomID) === e.target.value)?.RoomName || prev.Venue }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                <option value="">Select room</option>
                {rooms.map(room => <option key={room.RoomID} value={room.RoomID}>{room.RoomName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
              <input type="text" value={form.Venue} onChange={(e) => setForm(prev => ({ ...prev, Venue: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
              <select value={form.InstructorPersonnelID} onChange={(e) => setForm(prev => ({ ...prev, InstructorPersonnelID: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                <option value="">Select instructor</option>
                {instructors.map(person => (
                  <option key={person.PersonnelID} value={person.PersonnelID}>{person.FirstName} {person.LastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
              <input type="number" min={1} value={form.Capacity} onChange={(e) => setForm(prev => ({ ...prev, Capacity: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.Status} onChange={(e) => setForm(prev => ({ ...prev, Status: e.target.value as WorkshopFormData['Status'] }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                <option value="Upcoming">Upcoming</option>
                <option value="Completed">Completed</option>
                <option value="Canceled">Canceled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input type="text" value={form.Notes} onChange={(e) => setForm(prev => ({ ...prev, Notes: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            </div>
          </div>
        </form>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={isSaving} className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50">
            {isSaving ? 'Saving...' : workshop ? 'Save Workshop' : 'Create Workshop'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface WorkshopRegistrationsModalProps {
  isOpen: boolean;
  workshop: Workshop | null;
  onClose: () => void;
  onUpdated: () => void;
}

const WorkshopRegistrationsModal: React.FC<WorkshopRegistrationsModalProps> = ({ isOpen, workshop, onClose, onUpdated }) => {
  const [registrations, setRegistrations] = useState<WorkshopRegistration[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen || !workshop) return;

    const loadModalData = async () => {
      setIsLoading(true);
      try {
        const [registrationResponse, personnelResponse] = await Promise.all([
          gasService.getWorkshopRegistrations(workshop.WorkshopID),
          gasService.getAllPersonnel(),
        ]);

        if (registrationResponse.success && registrationResponse.data) {
          setRegistrations(registrationResponse.data || []);
        }

        if (personnelResponse.success && personnelResponse.data) {
          setPersonnel(personnelResponse.data || []);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadModalData();
  }, [isOpen, workshop]);

  const refreshRegistrations = async () => {
    if (!workshop) return;
    const response = await gasService.getWorkshopRegistrations(workshop.WorkshopID);
    if (response.success && response.data) {
      setRegistrations(response.data || []);
      onUpdated();
    }
  };

  const handleAdd = async () => {
    if (!workshop || !selectedPersonnelId) return;
    setMessage(null);
    const response = await gasService.registerPersonnelForWorkshop(workshop.WorkshopID, Number(selectedPersonnelId));
    if (response.success) {
      setSelectedPersonnelId('');
      setMessage({ type: 'success', text: 'Participant added' });
      await refreshRegistrations();
    } else {
      setMessage({ type: 'error', text: response.error || 'Failed to add participant' });
    }
  };

  const handleRemove = async (registrationId: number) => {
    const response = await gasService.removeWorkshopRegistration(registrationId);
    if (response.success) {
      await refreshRegistrations();
    }
  };

  if (!isOpen || !workshop) return null;

  const registeredIds = new Set(registrations.map(r => r.PersonnelID));
  const availablePersonnel = personnel.filter(p => !registeredIds.has(p.PersonnelID));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Workshop Registrations</h2>
            <p className="text-sm text-gray-500">{workshop.Title}</p>
          </div>
          <button onClick={onClose} className="text-2xl font-bold text-gray-400 hover:text-gray-600">x</button>
        </div>

        {message && (
          <div className="px-6 pt-4">
            <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />
          </div>
        )}

        <div className="px-6 py-4 border-b border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <select value={selectedPersonnelId} onChange={(e) => setSelectedPersonnelId(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2">
              <option value="">Select participant</option>
              {availablePersonnel.map(person => (
                <option key={person.PersonnelID} value={person.PersonnelID}>{person.FirstName} {person.LastName}</option>
              ))}
            </select>
            <button onClick={handleAdd} disabled={!selectedPersonnelId} className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50">Add</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading registrations...</div>
          ) : registrations.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No registrations yet.</p>
          ) : (
            <div className="space-y-2">
              {registrations.map(reg => (
                <div key={reg.WorkshopRegistrationID} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                  <div>
                    <p className="font-medium text-gray-900">{reg.FullName || `${reg.FirstName || ''} ${reg.LastName || ''}`.trim()}</p>
                    <p className="text-sm text-gray-500">{reg.PrimaryEmail || ''}</p>
                  </div>
                  <button onClick={() => handleRemove(reg.WorkshopRegistrationID)} className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const Workshops: React.FC = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [filteredWorkshops, setFilteredWorkshops] = useState<Workshop[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [rooms, setRooms] = useState<Array<{ RoomID: number; RoomName: string }>>([]);
  const [instructors, setInstructors] = useState<Personnel[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);

  useEffect(() => {
    loadWorkshops();
    loadOptions();
  }, []);

  useEffect(() => {
    let filtered = [...workshops];

    if (filter !== 'all') {
      const statusMap: Record<FilterType, Workshop['Status'] | ''> = {
        all: '',
        upcoming: 'Upcoming',
        completed: 'Completed',
        canceled: 'Canceled',
      };
      filtered = filtered.filter(workshop => computeWorkshopStatus(workshop) === statusMap[filter]);
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(workshop =>
        workshop.Title.toLowerCase().includes(query) ||
        (workshop.Venue || '').toLowerCase().includes(query) ||
        (workshop.InstructorName || '').toLowerCase().includes(query)
      );
    }

    setFilteredWorkshops(filtered);
  }, [workshops, filter, searchTerm]);

  const loadWorkshops = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getAllWorkshops();
      if (response.success && response.data) {
        setWorkshops(response.data || []);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to load workshops' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading workshops' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadOptions = async () => {
    const [roomsResponse, personnelResponse] = await Promise.all([
      gasService.getAllRooms(),
      gasService.getAllPersonnel(),
    ]);

    if (roomsResponse.success) {
      setRooms(roomsResponse.data || []);
    }

    if (personnelResponse.success) {
      const sorted = [...(personnelResponse.data || [])].sort((a, b) => `${a.FirstName} ${a.LastName}`.localeCompare(`${b.FirstName} ${b.LastName}`, undefined, { sensitivity: 'base' }));
      setInstructors(sorted);
    }
  };

  const getFilterCount = (type: FilterType): number => {
    if (type === 'all') return workshops.length;
    const statusMap: Record<FilterType, Workshop['Status'] | ''> = {
      all: '',
      upcoming: 'Upcoming',
      completed: 'Completed',
      canceled: 'Canceled',
    };
    return workshops.filter(workshop => computeWorkshopStatus(workshop) === statusMap[type]).length;
  };

  const handleDeleteWorkshop = async (workshop: Workshop) => {
    if (!confirm(`Delete workshop "${workshop.Title}"?`)) return;

    const response = await gasService.deleteWorkshop(workshop.WorkshopID);
    if (response.success) {
      setMessage({ type: 'success', text: 'Workshop deleted' });
      await loadWorkshops();
    } else {
      setMessage({ type: 'error', text: response.error || 'Failed to delete workshop' });
    }
  };

  if (isLoading) return <Loader text="Loading workshops..." />;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workshops</h1>
          <p className="text-gray-600">Manage workshops and registrations</p>
        </div>
        <button
          onClick={() => {
            setSelectedWorkshop(null);
            setEditModalOpen(true);
          }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Add Workshop
        </button>
      </div>

      {message && (
        <div className="mb-4">
          <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />
        </div>
      )}

      <div className="mb-4 sm:mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>All ({getFilterCount('all')})</button>
          <button onClick={() => setFilter('upcoming')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'upcoming' ? 'bg-yellow-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>Upcoming ({getFilterCount('upcoming')})</button>
          <button onClick={() => setFilter('completed')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'completed' ? 'bg-gray-700 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>Completed ({getFilterCount('completed')})</button>
          <button onClick={() => setFilter('canceled')} className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'canceled' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>Canceled ({getFilterCount('canceled')})</button>
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by title, venue, instructor..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>

      {filteredWorkshops.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">No workshops found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkshops.map(workshop => {
            const computedStatus = computeWorkshopStatus(workshop);
            return (
              <div key={workshop.WorkshopID} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">{workshop.Title}</h3>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${computedStatus === 'Upcoming' ? 'bg-yellow-100 text-yellow-800' : computedStatus === 'Completed' ? 'bg-gray-200 text-gray-700' : 'bg-red-100 text-red-700'}`}>
                    {computedStatus}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{workshop.Description || 'No description'}</p>
                <div className="space-y-1 text-sm text-gray-700 mb-4">
                  <p>{new Date(workshop.WorkshopDate).toLocaleDateString()}</p>
                  <p>{workshop.StartTime || '--'} - {workshop.EndTime || '--'}</p>
                  <p>{workshop.Venue || 'TBD venue'}</p>
                  <p>Instructor: {workshop.InstructorName || 'TBD'}</p>
                  <p>Registrations: {workshop.RegistrationCount || 0} / {workshop.Capacity || 0}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setSelectedWorkshop(workshop);
                      setRegistrationModalOpen(true);
                    }}
                    className="rounded-lg bg-primary-600 px-3 py-2 text-sm text-white hover:bg-primary-700"
                  >
                    Registrations
                  </button>
                  <button
                    onClick={() => {
                      setSelectedWorkshop(workshop);
                      setEditModalOpen(true);
                    }}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                </div>
                <button
                  onClick={() => handleDeleteWorkshop(workshop)}
                  className="mt-2 w-full rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}

      <WorkshopEditModal
        isOpen={editModalOpen}
        workshop={selectedWorkshop}
        rooms={rooms}
        instructors={instructors}
        onClose={() => setEditModalOpen(false)}
        onSaved={async () => {
          setEditModalOpen(false);
          await loadWorkshops();
        }}
      />

      <WorkshopRegistrationsModal
        isOpen={registrationModalOpen}
        workshop={selectedWorkshop}
        onClose={() => setRegistrationModalOpen(false)}
        onUpdated={loadWorkshops}
      />
    </div>
  );
};

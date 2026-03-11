import React, { useState, useEffect } from 'react';
import { gasService } from '../../services/googleAppsScript';
import { Loader } from '../common/Loader';
import { Message } from '../common/Message';

interface ClassEditModalProps {
  isOpen: boolean;
  /** Pass null to create a new class, or an existing offering to edit */
  classOffering: any | null;
  onClose: () => void;
  onSaved: () => void;
}

interface ClassLevel {
  ClassLevelID: number;
  LevelName: string;
  Description?: string;
}

interface PersonnelOption {
  PersonnelID: number;
  FirstName: string;
  LastName: string;
}

interface Room {
  RoomID: number;
  RoomName: string;
}

const STATUS_OPTIONS = ['Upcoming', 'In Progress', 'Completed', 'Cancelled'];
const MEETING_DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultForm = {
  ClassLevelID: '',
  TeacherPersonnelID: '',
  StartDate: '',
  EndDate: '',
  MaxStudents: '12',
  Status: 'Upcoming',
  RoomID: '',
  MeetingDays: '',
  MeetingTime: '19:30',
};

export const ClassEditModal: React.FC<ClassEditModalProps> = ({
  isOpen,
  classOffering,
  onClose,
  onSaved,
}) => {
  const isEditing = Boolean(classOffering);

  const [form, setForm] = useState({ ...defaultForm });
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [personnel, setPersonnel] = useState<PersonnelOption[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load dropdown options
  useEffect(() => {
    if (isOpen) {
      loadDropdownData();
    }
  }, [isOpen]);

  // Pre-fill form when editing
  useEffect(() => {
    if (isOpen && classOffering) {
      setForm({
        ClassLevelID: String(classOffering.ClassLevelID ?? ''),
        TeacherPersonnelID: String(classOffering.TeacherPersonnelID ?? ''),
        StartDate: classOffering.StartDate
          ? new Date(classOffering.StartDate).toISOString().split('T')[0]
          : '',
        EndDate: classOffering.EndDate
          ? new Date(classOffering.EndDate).toISOString().split('T')[0]
          : '',
        MaxStudents: String(classOffering.MaxStudents ?? '12'),
        Status: classOffering.Status ?? 'Upcoming',
        RoomID: String(classOffering.RoomID ?? ''),
        MeetingDays: classOffering.MeetingDays ?? '',
        MeetingTime: classOffering.MeetingTime ?? '',
      });
    } else if (isOpen && !classOffering) {
      setForm({ ...defaultForm });
    }
    setMessage(null);
  }, [isOpen, classOffering]);

  const loadDropdownData = async () => {
    setIsLoading(true);
    try {
      const [levelsRes, personnelRes, roomsRes] = await Promise.all([
        gasService.getAllClassLevels(),
        gasService.getAllPersonnel(),
        gasService.getAllRooms(),
      ]);
      if (levelsRes.success && levelsRes.data) setClassLevels(levelsRes.data as ClassLevel[]);
      if (personnelRes.success && personnelRes.data) setPersonnel(personnelRes.data as PersonnelOption[]);
      if (roomsRes.success && roomsRes.data) setRooms(roomsRes.data as Room[]);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load form options' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'StartDate' && value) {
      // Auto-set end date to 42 days (6 weeks) after start so the 7th weekly session lands on the right day
      const start = new Date(value + 'T00:00:00');
      start.setDate(start.getDate() + 42);
      const endDate = start.toISOString().split('T')[0];
      setForm(prev => ({ ...prev, StartDate: value, EndDate: endDate }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleMeetingDayToggle = (day: string) => {
    const days = form.MeetingDays ? form.MeetingDays.split(',').map(d => d.trim()).filter(Boolean) : [];
    const updated = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
    setForm(prev => ({ ...prev, MeetingDays: updated.join(', ') }));
  };

  const selectedDays = form.MeetingDays
    ? form.MeetingDays.split(',').map(d => d.trim()).filter(Boolean)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ClassLevelID || !form.TeacherPersonnelID || !form.StartDate || !form.EndDate) {
      setMessage({ type: 'error', text: 'Level, teacher, start date, and end date are required.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const payload = {
      ...(isEditing ? { OfferingID: classOffering.OfferingID } : {}),
      ClassLevelID: Number(form.ClassLevelID),
      TeacherPersonnelID: Number(form.TeacherPersonnelID),
      StartDate: form.StartDate,
      EndDate: form.EndDate,
      MaxStudents: Number(form.MaxStudents) || 12,
      Status: form.Status,
      RoomID: Number(form.RoomID) || null,
      MeetingDays: form.MeetingDays,
      MeetingTime: form.MeetingTime,
    };

    try {
      const res = isEditing
        ? await gasService.updateClassOffering(payload)
        : await gasService.createClassOffering(payload);

      if (res.success) {
        setMessage({ type: 'success', text: isEditing ? 'Class updated!' : 'Class created!' });
        setTimeout(() => {
          onSaved();
          onClose();
        }, 800);
      } else {
        setMessage({ type: 'error', text: (res as any).error || 'Failed to save class.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An error occurred while saving.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Class' : 'New Class'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <Loader text="Loading options..." />
          ) : (
            <form id="class-edit-form" onSubmit={handleSubmit} className="space-y-5">
              {message && (
                <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />
              )}

              {/* Level + Teacher */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="ClassLevelID"
                    value={form.ClassLevelID}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a level…</option>
                    {classLevels.map(l => (
                      <option key={l.ClassLevelID} value={l.ClassLevelID}>
                        {l.LevelName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teacher <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="TeacherPersonnelID"
                    value={form.TeacherPersonnelID}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a teacher…</option>
                    {personnel.map(p => (
                      <option key={p.PersonnelID} value={p.PersonnelID}>
                        {p.FirstName} {p.LastName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="StartDate"
                    value={form.StartDate}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="EndDate"
                    value={form.EndDate}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status + Max Students */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="Status"
                    value={form.Status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
                  <input
                    type="number"
                    name="MaxStudents"
                    value={form.MaxStudents}
                    onChange={handleChange}
                    min={1}
                    max={100}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Room */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                <select
                  name="RoomID"
                  value={form.RoomID}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a room…</option>
                  {rooms.map(r => (
                    <option key={r.RoomID} value={String(r.RoomID)}>
                      {r.RoomName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Meeting Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Days</label>
                <div className="flex flex-wrap gap-2">
                  {MEETING_DAY_OPTIONS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleMeetingDayToggle(day)}
                      className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                        selectedDays.includes(day)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
                {form.MeetingDays && (
                  <p className="mt-1 text-xs text-gray-500">{form.MeetingDays}</p>
                )}
              </div>

              {/* Meeting Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Time</label>
                <input
                  type="time"
                  name="MeetingTime"
                  value={form.MeetingTime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="class-edit-form"
            disabled={isSaving || isLoading}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {isEditing ? 'Save Changes' : 'Create Class'}
          </button>
        </div>
      </div>
    </div>
  );
};

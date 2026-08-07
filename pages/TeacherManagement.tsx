import React, { useEffect, useMemo, useState } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { gasService } from '../services/googleAppsScript';
import { PageType } from '../types';

interface TeacherManagementProps {
  onNavigate?: (page: PageType) => void;
}

interface TeacherRecord {
  TeacherID: number;
  PersonnelID: number;
  FirstName: string;
  LastName: string;
  PrimaryEmail: string;
}

interface CastRecord {
  CastMemberID: number;
  PersonnelID: number;
  FirstName: string;
  LastName: string;
  FullName?: string;
  PrimaryEmail: string;
}

export const TeacherManagement: React.FC<TeacherManagementProps> = ({ onNavigate }) => {
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [castMembers, setCastMembers] = useState<CastRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [emailFilter, setEmailFilter] = useState<'all' | 'with_email' | 'missing_email'>('all');
  const [nameInitialFilter, setNameInitialFilter] = useState<string>('all');
  const [nameSort, setNameSort] = useState<'az' | 'za'>('az');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    setIsLoading(true);
    try {
      const [teacherResponse, castResponse] = await Promise.all([
        gasService.getAllTeachers(),
        gasService.getAllCastMembers(),
      ]);

      if (teacherResponse.success && teacherResponse.data) {
        setTeachers(teacherResponse.data as TeacherRecord[]);
      } else {
        setMessage({ type: 'error', text: teacherResponse.error || 'Failed to load teachers' });
      }

      const castRows = Array.isArray((castResponse.data as any)?.data)
        ? (castResponse.data as any).data
        : (Array.isArray(castResponse.data) ? castResponse.data : []);

      const normalizedCast = castRows.map((row: any) => ({
        CastMemberID: Number(row.CastMemberID),
        PersonnelID: Number(row.PersonnelID),
        FirstName: row.FirstName || '',
        LastName: row.LastName || row.Lastname || '',
        FullName: row.FullName || `${row.FirstName || ''} ${row.LastName || row.Lastname || ''}`.trim(),
        PrimaryEmail: row.PrimaryEmail || '',
      }));

      setCastMembers(normalizedCast);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading teachers' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTeacher = async () => {
    if (!selectedPersonnelId) return;
    setIsSubmitting(true);
    try {
      const response = await gasService.addPersonAsTeacher(Number(selectedPersonnelId));
      if (response.success) {
        setMessage({ type: 'success', text: 'Teacher added successfully.' });
        setSelectedPersonnelId('');
        await loadTeachers();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to add teacher.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error adding teacher.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveTeacher = async (teacherId: number, fullName: string) => {
    setIsSubmitting(true);
    try {
      const response = await gasService.removeTeacher(teacherId);
      if (response.success) {
        setMessage({ type: 'success', text: `${fullName} removed from teachers.` });
        await loadTeachers();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to remove teacher.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error removing teacher.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nameInitialOptions = useMemo(() => {
    const initials = new Set<string>();
    teachers.forEach((teacher) => {
      const lastName = (teacher.LastName || '').trim();
      const firstName = (teacher.FirstName || '').trim();
      const source = lastName || firstName;
      if (source) initials.add(source.charAt(0).toUpperCase());
    });

    return ['all', ...Array.from(initials).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))];
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return teachers.filter((teacher) => {
      const fullName = `${teacher.FirstName || ''} ${teacher.LastName || ''}`.toLowerCase();
      const hasEmail = (teacher.PrimaryEmail || '').trim() !== '';
      const initialSource = ((teacher.LastName || '').trim() || (teacher.FirstName || '').trim()).charAt(0).toUpperCase();

      const matchesSearch = query === '' || fullName.includes(query) || (teacher.PrimaryEmail || '').toLowerCase().includes(query);
      const matchesEmail =
        emailFilter === 'all'
          ? true
          : emailFilter === 'with_email'
          ? hasEmail
          : !hasEmail;
      const matchesInitial = nameInitialFilter === 'all' || initialSource === nameInitialFilter;

      return matchesSearch && matchesEmail && matchesInitial;
    }).sort((a, b) => {
      const aName = `${a.LastName || ''} ${a.FirstName || ''}`.trim().toLowerCase();
      const bName = `${b.LastName || ''} ${b.FirstName || ''}`.trim().toLowerCase();
      return nameSort === 'az' ? aName.localeCompare(bName) : bName.localeCompare(aName);
    });
  }, [teachers, searchTerm, emailFilter, nameInitialFilter, nameSort]);

  const availableCastMembers = useMemo(() => {
    const assignedPersonnelIds = new Set(teachers.map((teacher) => teacher.PersonnelID));
    return castMembers
      .filter((member) => !assignedPersonnelIds.has(member.PersonnelID))
      .sort((a, b) => `${a.FirstName} ${a.LastName}`.localeCompare(`${b.FirstName} ${b.LastName}`, undefined, { sensitivity: 'base' }));
  }, [castMembers, teachers]);

  if (isLoading) {
    return <Loader text="Loading teachers..." />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teacher Management</h1>
          <p className="text-sm text-gray-600 mt-1">Teachers are cast members assigned to classes. Add or remove assignments here.</p>
        </div>
        <button
          onClick={() => onNavigate?.('cast')}
          className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Go to Cast Management
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Teacher (Cast Only)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <select
            title="Select cast member to add as teacher"
            value={selectedPersonnelId}
            onChange={(event) => setSelectedPersonnelId(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="">Select cast member</option>
            {availableCastMembers.map((member) => (
              <option key={member.CastMemberID} value={member.PersonnelID}>
                {member.FullName || `${member.FirstName} ${member.LastName}`.trim()}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddTeacher}
            disabled={!selectedPersonnelId || isSubmitting}
            className="w-full rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50 sm:w-auto"
          >
            {isSubmitting ? 'Saving...' : 'Add Teacher'}
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4">
          <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />
        </div>
      )}

      <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search teachers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <select
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value as typeof emailFilter)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            title="Filter by email availability"
          >
            <option value="all">All Email States</option>
            <option value="with_email">With Email</option>
            <option value="missing_email">Missing Email</option>
          </select>
          <select
            value={nameInitialFilter}
            onChange={(e) => setNameInitialFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            title="Filter by last-name initial"
          >
            <option value="all">All Initials</option>
            {nameInitialOptions
              .filter((option) => option !== 'all')
              .map((initial) => (
                <option key={initial} value={initial}>{initial}</option>
              ))}
          </select>
          <select
            value={nameSort}
            onChange={(e) => setNameSort(e.target.value as typeof nameSort)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            title="Sort by name"
          >
            <option value="az">Sort Name A-Z</option>
            <option value="za">Sort Name Z-A</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setEmailFilter('all');
              setNameInitialFilter('all');
              setNameSort('az');
            }}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600">Showing {filteredTeachers.length} of {teachers.length} teachers</p>
      </div>

      <div className="space-y-3 md:hidden">
        {filteredTeachers.map((teacher) => (
          <article key={teacher.TeacherID} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-gray-900">{`${teacher.FirstName || ''} ${teacher.LastName || ''}`.trim()}</h2>
                <p className="mt-1 break-all text-sm text-gray-600">{teacher.PrimaryEmail || '-'}</p>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">#{teacher.TeacherID}</span>
            </div>
            <button
              type="button"
              onClick={() => handleRemoveTeacher(teacher.TeacherID, `${teacher.FirstName || ''} ${teacher.LastName || ''}`.trim())}
              disabled={isSubmitting}
              className="mt-4 w-full rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              Remove
            </button>
          </article>
        ))}

        {filteredTeachers.length === 0 && (
          <div className="rounded-xl border bg-white px-4 py-10 text-center text-gray-500 shadow-sm">No teachers found.</div>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border bg-white shadow-sm md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTeachers.map((teacher) => (
              <tr key={teacher.TeacherID} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {`${teacher.FirstName || ''} ${teacher.LastName || ''}`.trim()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{teacher.PrimaryEmail || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">#{teacher.TeacherID}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    type="button"
                    onClick={() => handleRemoveTeacher(teacher.TeacherID, `${teacher.FirstName || ''} ${teacher.LastName || ''}`.trim())}
                    disabled={isSubmitting}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTeachers.length === 0 && (
          <div className="py-10 text-center text-gray-500">No teachers found.</div>
        )}
      </div>
    </div>
  );
};

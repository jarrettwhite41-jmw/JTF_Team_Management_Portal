import React, { useMemo, useState, useEffect } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { StudentWithDetails, Personnel } from '../types';
import { gasService } from '../services/googleAppsScript';

interface StudentDirectoryProps {
  onNavigateToStudent?: (studentId: number) => void;
}

export const StudentDirectory: React.FC<StudentDirectoryProps> = ({ onNavigateToStudent }) => {
  const [students, setStudents] = useState<StudentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Inactive' | 'Graduated'>('All');
  const [levelFilter, setLevelFilter] = useState<string>('All');
  const [enrollmentFilter, setEnrollmentFilter] = useState<'All' | 'Has Active Enrollments' | 'No Active Enrollments'>('All');
  const [nameSort, setNameSort] = useState<'az' | 'za'>('az');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Add student modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<number[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getAllStudentsWithDetails();
      if (response.success && Array.isArray(response.data)) {
        setStudents(response.data);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to load students.' });
        setStudents([]);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading students.' });
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAdd = async () => {
    setPersonnelSearch('');
    setSelectedPersonnelIds([]);
    setIsAddOpen(true);

    try {
      const response = await gasService.getAllPersonnel();
      if (response.success && Array.isArray(response.data)) {
        // Filter out people already students
        const studentPersonnelIds = new Set(students.map(s => s.PersonnelID).filter(Boolean));
        const available = (response.data as Personnel[]).filter(p => !studentPersonnelIds.has(p.PersonnelID));
        setAllPersonnel(available);
      }
    } catch {
      setMessage({ type: 'error', text: 'Unable to load personnel.' });
    }
  };

  const toggleSelect = (id: number) =>
    setSelectedPersonnelIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  const toggleSelectAll = () => {
    if (availablePersonnel.every(p => selectedPersonnelIds.includes(p.PersonnelID))) {
      setSelectedPersonnelIds([]);
    } else {
      setSelectedPersonnelIds(availablePersonnel.map(p => p.PersonnelID));
    }
  };

  const handleAddSelected = async () => {
    if (selectedPersonnelIds.length === 0) return;
    setIsAdding(true);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];
    for (const id of selectedPersonnelIds) {
      try {
        const r = await gasService.addPersonAsStudent(id);
        if (r.success) successCount++;
        else {
          failCount++;
          const person = allPersonnel.find(p => p.PersonnelID === id);
          const name = person ? `${person.FirstName} ${person.LastName}` : `ID ${id}`;
          errors.push(`${name}: ${r.error || 'Unknown error'}`);
        }
      } catch (err) {
        failCount++;
        const person = allPersonnel.find(p => p.PersonnelID === id);
        const name = person ? `${person.FirstName} ${person.LastName}` : `ID ${id}`;
        errors.push(`${name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    setIsAdding(false);
    setIsAddOpen(false);
    setSelectedPersonnelIds([]);
    await loadStudents();
    if (successCount > 0)
      setMessage({ type: 'success', text: `${successCount} student${successCount !== 1 ? 's' : ''} added successfully.` });
    if (failCount > 0) {
      const errorText = errors.join(' | ');
      setMessage({ type: 'error', text: `${failCount} student${failCount !== 1 ? 's' : ''} failed to add: ${errorText}` });
    }
  };

  const levelOptions = useMemo(() => {
    const levels = new Set<string>();
    students.forEach((student) => {
      if (student.CurrentLevelName && student.CurrentLevelName.trim() !== '') {
        levels.add(student.CurrentLevelName.trim());
      }
    });
    return ['All', ...Array.from(levels).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))];
  }, [students]);

  const filteredStudents = students.filter(student => {
    const normalizedQuery = searchTerm.trim().toLowerCase();
    const matchesSearch = (
      normalizedQuery === ''
      || `${student.FirstName} ${student.LastName}`.toLowerCase().includes(normalizedQuery)
      || (student.PrimaryEmail && student.PrimaryEmail.toLowerCase().includes(normalizedQuery))
    );
    const matchesFilter = filterStatus === 'All' || student.StudentStatus === filterStatus;
    const matchesLevel = levelFilter === 'All' || (student.CurrentLevelName || '').trim() === levelFilter;
    const activeEnrollments = Number(student.ActiveEnrollments || 0);
    const matchesEnrollment =
      enrollmentFilter === 'All'
        ? true
        : enrollmentFilter === 'Has Active Enrollments'
        ? activeEnrollments > 0
        : activeEnrollments === 0;

    return matchesSearch && matchesFilter && matchesLevel && matchesEnrollment;
  }).sort((a, b) => {
    const aName = `${a.LastName || ''} ${a.FirstName || ''}`.trim().toLowerCase();
    const bName = `${b.LastName || ''} ${b.FirstName || ''}`.trim().toLowerCase();
    return nameSort === 'az' ? aName.localeCompare(bName) : bName.localeCompare(aName);
  });

  const availablePersonnel = allPersonnel.filter(p => {
    const matchesSearch =
      personnelSearch === '' ||
      `${p.FirstName} ${p.LastName}`.toLowerCase().includes(personnelSearch.toLowerCase()) ||
      (p.PrimaryEmail || '').toLowerCase().includes(personnelSearch.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800';
      case 'Graduated':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Directory</h1>
          <p className="text-sm text-gray-600 mt-1">{filteredStudents.length} students</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Add Student
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

      <div className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Graduated">Graduated</option>
          </select>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {levelOptions.map((level) => (
              <option key={level} value={level}>{level === 'All' ? 'All Levels' : level}</option>
            ))}
          </select>
          <select
            value={enrollmentFilter}
            onChange={(e) => setEnrollmentFilter(e.target.value as typeof enrollmentFilter)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="All">All Enrollment States</option>
            <option value="Has Active Enrollments">Has Active Enrollments</option>
            <option value="No Active Enrollments">No Active Enrollments</option>
          </select>
          <select
            value={nameSort}
            onChange={(e) => setNameSort(e.target.value as typeof nameSort)}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="az">Sort Name A-Z</option>
            <option value="za">Sort Name Z-A</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setFilterStatus('All');
              setLevelFilter('All');
              setEnrollmentFilter('All');
              setNameSort('az');
            }}
            className="w-full sm:w-auto px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600">Showing {filteredStudents.length} of {students.length} students</p>
      </div>

      {isLoading ? (
        <Loader text="Loading students..." />
      ) : filteredStudents.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">
          <p>No students found.</p>
          <button
            onClick={loadStudents}
            className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Reload
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStudents.map(student => (
            <div
              key={student.StudentID}
              className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onNavigateToStudent && onNavigateToStudent(student.StudentID!)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                    {(student.FirstName && student.FirstName.length > 0 ? student.FirstName.charAt(0) : '')}
                    {(student.LastName && student.LastName.length > 0 ? student.LastName.charAt(0) : '')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{student.FirstName} {student.LastName}</h3>
                    <p className="text-xs text-gray-500">{student.PrimaryEmail}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(student.StudentStatus)}`}>
                    {student.StudentStatus || 'N/A'}
                  </span>
                </div>
                {student.CurrentLevelName && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Current Level:</span>
                    <span className="text-gray-900 font-medium">{student.CurrentLevelName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Classes Completed:</span>
                  <span className="text-gray-900 font-medium">{student.ClassesCompleted || 0}</span>
                </div>
                {student.EnrollmentDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Student Since:</span>
                    <span className="text-gray-900 text-xs">
                      {new Date(student.EnrollmentDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <button
                className="mt-4 w-full px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors font-medium"
                onClick={e => { e.stopPropagation(); onNavigateToStudent && onNavigateToStudent(student.StudentID!); }}
              >
                View Full Profile
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Student Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Add Students</h2>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <input
                type="text"
                placeholder="Search personnel by name or email..."
                value={personnelSearch}
                onChange={(e) => setPersonnelSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 border-b flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={availablePersonnel.length > 0 && availablePersonnel.every(p => selectedPersonnelIds.includes(p.PersonnelID))}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700">Select All ({availablePersonnel.length})</span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {availablePersonnel.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No available personnel to add
                    </div>
                  ) : (
                    availablePersonnel.map(person => (
                      <div key={person.PersonnelID} className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0">
                        <input
                          type="checkbox"
                          checked={selectedPersonnelIds.includes(person.PersonnelID)}
                          onChange={() => toggleSelect(person.PersonnelID)}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {person.FirstName} {person.LastName}
                          </div>
                          <div className="text-xs text-gray-500">{person.PrimaryEmail}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSelected}
                  disabled={isAdding || selectedPersonnelIds.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {isAdding ? 'Adding...' : `Add ${selectedPersonnelIds.length} Student${selectedPersonnelIds.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

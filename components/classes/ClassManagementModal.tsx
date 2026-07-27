import React, { useEffect, useMemo, useState } from 'react';
import { StudentCard } from './StudentCard';
import { Loader } from '../common/Loader';
import { Message } from '../common/Message';
import { ClassEditModal } from './ClassEditModal';
import { gasService } from '../../services/googleAppsScript';

interface ClassManagementModalProps {
  isOpen: boolean;
  classOffering: any;
  onClose: () => void;
  onRefresh: () => void;
}

interface Student {
  StudentID: number;
  PersonnelID: number;
  FirstName: string;
  LastName: string;
  PrimaryEmail: string;
  PrimaryPhone?: string;
  Instagram?: string;
  Birthday?: string;
  EnrollmentID?: number;
  EnrollmentDate?: string;
  CompletionStatus?: string;
}

type Tab = 'roster' | 'attendance' | 'skills' | 'notes' | 'enrolled' | 'add';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'roster', label: 'Class Roster' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'skills', label: 'Skills' },
  { id: 'notes', label: 'Notes' },
  { id: 'enrolled', label: 'Enrolled Students' },
  { id: 'add', label: 'Add Students' },
];

export const ClassManagementModal: React.FC<ClassManagementModalProps> = ({
  isOpen,
  classOffering,
  onClose,
  onRefresh,
}) => {
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [classDetails, setClassDetails] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('roster');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());

  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingAttendanceFor, setSavingAttendanceFor] = useState<number | null>(null);

  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [skillRatings, setSkillRatings] = useState<any[]>([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<number | null>(null);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [ratingSkill, setRatingSkill] = useState<any>(null);
  const [ratingValue, setRatingValue] = useState(3);
  const [savingRating, setSavingRating] = useState(false);

  const [sessionLogs, setSessionLogs] = useState<any[]>([]);
  const [progressNotes, setProgressNotes] = useState<any[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [addingSessionLog, setAddingSessionLog] = useState(false);
  const [sessionLogText, setSessionLogText] = useState('');
  const [addingNoteFor, setAddingNoteFor] = useState<number | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [offeringStatus, setOfferingStatus] = useState<'Upcoming' | 'In Progress' | 'Completed' | 'Cancelled'>(
    classOffering?.Status || 'Upcoming',
  );

  const normalizeStatus = (value: string | undefined | null): string => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return 'Active';
    if (normalized === 'admin') return 'ADMIN';
    if (normalized === 'in progress') return 'In Progress';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const normalizeLevel = (value: string | number | null | undefined): string =>
    String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const normalizeClassDetails = (details: any): any => {
    if (!details) return null;

    if (Array.isArray(details.Enrollments)) {
      return details;
    }

    const enrolled = Array.isArray(details.enrolledStudents)
      ? details.enrolledStudents.map((row: any) => ({
          EnrollmentID: row.EnrollmentID,
          StudentID: row.StudentID,
          FirstName: row.FirstName || '',
          LastName: row.LastName || '',
          PrimaryEmail: row.PrimaryEmail || '',
          Status: normalizeStatus(row.CompletionStatus || row.Status),
          CompletionStatus: normalizeStatus(row.CompletionStatus || row.Status),
        }))
      : [];

    const attendanceRows = Array.isArray(details.attendanceRecords) ? details.attendanceRecords : [];
    const attendanceRecords = attendanceRows.map((row: any) => ({
      AttendanceID: row.AttendanceID,
      EnrollmentID: Number(row.EnrollmentID),
      ClassDate: String(row.ClassDate || '').split('T')[0],
      AttendanceStatus: row.AttendanceStatus || row.Status || 'Present',
    }));

    const activeCount = enrolled.filter((row: any) => row.Status === 'Active').length;
    const byDateMap = new Map<string, any>();

    for (const row of attendanceRecords) {
      const current = byDateMap.get(row.ClassDate) || {
        ClassDate: row.ClassDate,
        PresentCount: 0,
        LateCount: 0,
        ExcusedCount: 0,
        AbsentCount: 0,
        MarkedCount: 0,
        AttendancePct: 0,
      };

      current.MarkedCount += 1;
      if (row.AttendanceStatus === 'Present') current.PresentCount += 1;
      if (row.AttendanceStatus === 'Late') current.LateCount += 1;
      if (row.AttendanceStatus === 'Excused') current.ExcusedCount += 1;
      if (row.AttendanceStatus === 'Absent') current.AbsentCount += 1;

      byDateMap.set(row.ClassDate, current);
    }

    const attendanceByDate = Array.from(byDateMap.values()).map((day: any) => ({
      ...day,
      AttendancePct: activeCount > 0 ? Math.round(((day.PresentCount + day.LateCount) / activeCount) * 100) : 0,
    }));

    return {
      Enrollments: enrolled,
      AttendanceRecords: attendanceRecords,
      AttendanceByDate: attendanceByDate,
      ClassLevelID: details.classOffering?.ClassLevelID,
      LevelName: details.classOffering?.LevelName,
    };
  };

  const loadEnrolledStudents = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getEnrolledStudents(classOffering.OfferingID);
      if (response.success) {
        setEnrolledStudents(response.data || []);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to load students' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error loading students' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadClassDetails = async () => {
    try {
      const response = await gasService.getClassOfferingDetails(classOffering.OfferingID);
      if (response.success && response.data) {
        setClassDetails(normalizeClassDetails(response.data));
      }

      if (typeof gasService.getClassOfferingStatus === 'function') {
        const statusResponse = await gasService.getClassOfferingStatus(classOffering.OfferingID);
        if (statusResponse.success && statusResponse.data) {
          setOfferingStatus(statusResponse.data);
        }
      } else {
        setOfferingStatus(classOffering?.Status || 'Upcoming');
      }
    } catch {
      setMessage({ type: 'error', text: 'Error loading class details' });
    }
  };

  const loadAvailableStudents = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getAllStudentsWithDetails();
      if (response.success) {
        const enrolledIds = enrolledStudents.map((student) => student.StudentID);
        const available = (response.data || []).filter((student: Student) => !enrolledIds.includes(student.StudentID));
        setAvailableStudents(available);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to load students' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error loading students' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && classOffering) {
      setActiveTab('roster');
      setSessionDate(new Date().toISOString().split('T')[0]);
      setSelectedStudentIds(new Set());
      setAllSkills([]);
      setSkillRatings([]);
      setSelectedEnrollmentId(null);
      setSessionLogs([]);
      setProgressNotes([]);
      loadEnrolledStudents();
      loadClassDetails();
    }
  }, [isOpen, classOffering]);

  const loadSkillsTab = async () => {
    if (allSkills.length === 0) {
      setLoadingSkills(true);
      const response = await gasService.getSkillsWithCategories();
      if (response.success && Array.isArray(response.data)) {
        setAllSkills(response.data);
      }
      setLoadingSkills(false);
    }

    const firstActive = detailEnrollments.find((enrollment: any) => enrollment.Status === 'Active');
    if (firstActive && !selectedEnrollmentId) {
      setSelectedEnrollmentId(firstActive.EnrollmentID);
    }
  };

  const loadSkillRatings = async (enrollmentId: number) => {
    setLoadingSkills(true);
    const response = await gasService.getSkillRatingsForEnrollment(enrollmentId);
    if (response.success && Array.isArray(response.data)) {
      setSkillRatings(response.data);
    } else {
      setSkillRatings([]);
    }
    setLoadingSkills(false);
  };

  const loadNotesTab = async () => {
    const enrollmentIds = detailEnrollments.map((enrollment: any) => enrollment.EnrollmentID).filter(Boolean);
    setLoadingNotes(true);

    const [logsRes, notesRes] = await Promise.all([
      gasService.getSessionLogsForOffering(classOffering.OfferingID),
      gasService.getProgressNotesForOffering(enrollmentIds, classOffering.OfferingID),
    ]);

    if (logsRes.success && Array.isArray(logsRes.data)) {
      setSessionLogs(logsRes.data);
    }

    if (notesRes.success && Array.isArray(notesRes.data)) {
      setProgressNotes(notesRes.data);
    }

    setLoadingNotes(false);
  };

  useEffect(() => {
    if (activeTab === 'add' && availableStudents.length === 0) {
      loadAvailableStudents();
    }

    if (activeTab === 'skills' && isOpen) {
      loadSkillsTab();
    }

    if (activeTab === 'notes' && isOpen) {
      loadNotesTab();
    }

    setSelectedStudentIds(new Set());
  }, [activeTab]);

  useEffect(() => {
    if (selectedEnrollmentId && activeTab === 'skills') {
      loadSkillRatings(selectedEnrollmentId);
    }
  }, [selectedEnrollmentId]);

  const handleAddSelectedStudents = async () => {
    if (selectedStudentIds.size === 0) return;

    setIsLoading(true);
    const ids = Array.from(selectedStudentIds);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const studentId of ids) {
        const response = await gasService.enrollStudent(classOffering.OfferingID, studentId);
        if (response.success) successCount += 1;
        else failCount += 1;
      }

      setSelectedStudentIds(new Set());
      await loadEnrolledStudents();
      await loadAvailableStudents();
      await loadClassDetails();
      onRefresh();

      if (failCount === 0) {
        setMessage({ type: 'success', text: `${successCount} student${successCount !== 1 ? 's' : ''} added successfully` });
      } else {
        setMessage({ type: 'error', text: `${successCount} added, ${failCount} failed` });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error adding students' });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudentIds((previous) => {
      const next = new Set(previous);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const handleRemoveStudent = async (enrollmentId: number) => {
    if (!confirm('Are you sure you want to remove this student from the class?')) return;

    setIsLoading(true);
    try {
      const response = await gasService.removeStudentFromClass(enrollmentId);
      if (response.success) {
        setMessage({ type: 'success', text: 'Student removed successfully' });
        await loadEnrolledStudents();
        await loadAvailableStudents();
        await loadClassDetails();
        onRefresh();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to remove student' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error removing student' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (enrollmentId: number, newStatus: string) => {
    setIsLoading(true);
    try {
      const response = await gasService.updateEnrollmentStatus(enrollmentId, newStatus);
      if (response.success) {
        setMessage({ type: 'success', text: 'Status updated successfully' });
        await loadEnrolledStudents();
        await loadClassDetails();
        onRefresh();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to update status' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error updating status' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttendance = async (enrollmentId: number, status: 'Present' | 'Absent' | 'Late' | 'Excused') => {
    setSavingAttendanceFor(enrollmentId);
    const response = await gasService.updateClassAttendance({
      enrollmentId,
      offeringId: classOffering.OfferingID,
      classDate: sessionDate,
      status,
      notes: status === 'Late' || status === 'Excused' ? status : '',
    });

    if (response.success) {
      setMessage({ type: 'success', text: 'Attendance updated.' });
      await loadClassDetails();
    } else {
      setMessage({ type: 'error', text: response.error || 'Failed to update attendance.' });
    }

    setSavingAttendanceFor(null);
  };

  const handleSaveRating = async () => {
    if (!ratingSkill || !selectedEnrollmentId) return;

    const enrollment = detailEnrollments.find((row: any) => row.EnrollmentID === selectedEnrollmentId);
    if (!enrollment) return;

    setSavingRating(true);

    const response = await gasService.saveStudentCompetency({
      EnrollmentID: selectedEnrollmentId,
      StudentID: enrollment.StudentID,
      SkillID: ratingSkill.SkillID,
      Rating: ratingValue as 1 | 2 | 3 | 4 | 5,
    });

    setSavingRating(false);
    setRatingSkill(null);

    if (response.success) {
      setMessage({ type: 'success', text: 'Skill rating saved.' });
      await loadSkillRatings(selectedEnrollmentId);
    } else {
      setMessage({ type: 'error', text: response.error || 'Failed to save rating.' });
    }
  };

  const handleSaveSessionLog = async () => {
    if (!sessionLogText.trim()) return;

    setSavingNote(true);
    const response = await gasService.saveSessionLog({
      OfferingID: classOffering.OfferingID,
      SessionDate: sessionDate,
      CurriculumNotes: sessionLogText,
    });
    setSavingNote(false);

    if (response.success) {
      setSessionLogText('');
      setAddingSessionLog(false);
      setMessage({ type: 'success', text: 'Session note saved.' });
      await loadNotesTab();
    } else {
      setMessage({ type: 'error', text: response.error || 'Failed to save session note.' });
    }
  };

  const handleSaveProgressNote = async (enrollmentId: number) => {
    if (!newNoteText.trim()) return;

    setSavingNote(true);
    const response = await gasService.addStudentProgressNote({
      EnrollmentID: enrollmentId,
      NoteDate: sessionDate,
      Note: newNoteText,
    });
    setSavingNote(false);

    if (response.success) {
      setNewNoteText('');
      setAddingNoteFor(null);
      setMessage({ type: 'success', text: 'Note saved.' });
      await loadNotesTab();
    } else {
      setMessage({ type: 'error', text: response.error || 'Failed to save note.' });
    }
  };

  const filteredStudents = useMemo(() => {
    let students = activeTab === 'add' ? availableStudents : enrolledStudents;

    if (activeTab === 'roster') {
      students = students.filter((student: Student) => normalizeStatus(student.CompletionStatus) === 'Active');
    }

    if (activeTab === 'enrolled') {
      students = students.filter((student: Student) => normalizeStatus(student.CompletionStatus) !== 'ADMIN');
    }

    if (searchTerm) {
      students = students.filter((student: Student) => {
        const fullName = `${student.FirstName} ${student.LastName}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase()) || student.PrimaryEmail?.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    return students;
  }, [activeTab, availableStudents, enrolledStudents, searchTerm]);

  const detailEnrollments = classDetails?.Enrollments || [];
  const attendanceRecords = classDetails?.AttendanceRecords || [];
  const attendanceByDate = classDetails?.AttendanceByDate || [];
  const activeDetailEnrollments = detailEnrollments.filter((row: any) => row.Status === 'Active');
  const classLevelNorm = normalizeLevel(classDetails?.LevelName || classDetails?.ClassLevelID || classOffering?.LevelName || classOffering?.ClassLevelID);

  const normalizedSkills = allSkills.map((skill: any) => ({
    SkillID: skill.SkillID ?? skill.skill_id,
    SkillName: skill.SkillName ?? skill.skill_name,
    CategoryName: skill.CategoryName ?? skill.skill_categories?.category_name ?? 'General',
    AppliedLevel: skill.AppliedLevel ?? skill.skill_categories?.applied_level,
  }));

  const visibleSkills = normalizedSkills.filter((skill: any) => {
    if (!skill.AppliedLevel) return true;
    return normalizeLevel(skill.AppliedLevel) === classLevelNorm;
  });

  const skillsByCategory = visibleSkills.reduce<Record<string, any[]>>((acc, skill: any) => {
    const category = skill.CategoryName || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {});

  const classDates = Array.from(new Set(attendanceRecords.map((row: any) => String(row.ClassDate || ''))));
  const attendanceForDate = new Map<number, string>(
    attendanceRecords
      .filter((row: any) => String(row.ClassDate || '') === String(sessionDate))
      .map((row: any) => [row.EnrollmentID, row.AttendanceStatus]),
  );

  const studentAttendanceSummary = detailEnrollments
    .map((enrollment: any) => {
      const records = attendanceRecords.filter((row: any) => row.EnrollmentID === enrollment.EnrollmentID);
      const present = records.filter((row: any) => row.AttendanceStatus === 'Present').length;
      const late = records.filter((row: any) => row.AttendanceStatus === 'Late').length;
      const excused = records.filter((row: any) => row.AttendanceStatus === 'Excused').length;
      const absent = records.filter((row: any) => row.AttendanceStatus === 'Absent').length;
      const marked = records.length;

      return {
        enrollmentId: enrollment.EnrollmentID,
        name: `${enrollment.FirstName || ''} ${enrollment.LastName || enrollment.StudentName || ''}`.trim(),
        status: enrollment.Status,
        presentCount: present,
        lateCount: late,
        excusedCount: excused,
        absentCount: absent,
        markedCount: marked,
        attendancePct: marked > 0 ? Math.round(((present + late) / marked) * 100) : 0,
      };
    })
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  const isInProgress = String(offeringStatus || classOffering?.Status || '').toLowerCase() === 'in progress';
  const showSearch = activeTab === 'roster' || activeTab === 'enrolled' || activeTab === 'add';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{classOffering.LevelName || `Level ${classOffering.ClassLevelID}`}</h2>
            <p className="text-sm text-gray-600 mt-1">{classOffering.TeacherName} • {offeringStatus}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEditModal(true)}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1.5"
              title="Edit class details"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Details
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">
              ×
            </button>
          </div>
        </div>

        {message && (
          <div className="px-6 pt-4">
            <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />
          </div>
        )}

        <div className="px-6 pt-4 border-b border-gray-200">
          <div className="flex space-x-4 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 px-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.id === 'roster'
                  ? `${tab.label} (${enrolledStudents.filter((student) => normalizeStatus(student.CompletionStatus) === 'Active').length}/${classOffering.MaxStudents})`
                  : tab.id === 'enrolled'
                    ? `${tab.label} (${enrolledStudents.filter((student) => normalizeStatus(student.CompletionStatus) !== 'ADMIN').length}/${classOffering.MaxStudents})`
                    : tab.label}
              </button>
            ))}
          </div>
        </div>

        {showSearch && (
          <div className="px-6 py-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isLoading ? (
            <Loader text="Loading students..." />
          ) : activeTab === 'attendance' ? (
            <div>
              <div className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                <label className="text-sm font-medium text-gray-700">Session Date:</label>
                <input
                  type="date"
                  title="Session date"
                  value={sessionDate}
                  onChange={(event) => setSessionDate(event.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>

              {activeDetailEnrollments.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No active students enrolled.</p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {activeDetailEnrollments.map((enrollment: any) => (
                      <div key={enrollment.EnrollmentID} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-sm font-medium text-gray-900">{enrollment.FirstName} {enrollment.LastName || enrollment.StudentName}</p>
                          <span className="text-xs text-gray-600">
                            {attendanceForDate.get(enrollment.EnrollmentID)
                              ? `Marked: ${attendanceForDate.get(enrollment.EnrollmentID)}`
                              : 'Not marked'}
                          </span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {(['Present', 'Absent', 'Late', 'Excused'] as const).map((status) => {
                            const isActive = attendanceForDate.get(enrollment.EnrollmentID) === status;
                            return (
                              <button
                                key={status}
                                disabled={savingAttendanceFor === enrollment.EnrollmentID}
                                onClick={() => handleAttendance(enrollment.EnrollmentID, status)}
                                className={`text-xs px-2 py-1 rounded border transition-colors ${
                                  isActive
                                    ? 'bg-primary-600 text-white border-primary-600'
                                    : 'border-gray-300 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700'
                                } ${savingAttendanceFor === enrollment.EnrollmentID ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                {status}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-3">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Student Attendance Summary</h3>
                    {studentAttendanceSummary.length === 0 ? (
                      <p className="text-xs text-gray-500">No attendance data yet.</p>
                    ) : (
                      <>
                        <div className="space-y-2 md:hidden">
                          {studentAttendanceSummary.map((summary: any) => (
                            <article key={summary.enrollmentId} className="rounded-lg border bg-white p-3 text-xs">
                              <div className="mb-2">
                                <p className="font-semibold text-gray-900">{summary.name || 'Unknown'}</p>
                                <p className="text-[11px] text-gray-500">{summary.status}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-700">
                                <p>Present: {summary.presentCount}</p>
                                <p>Late: {summary.lateCount}</p>
                                <p>Excused: {summary.excusedCount}</p>
                                <p>Absent: {summary.absentCount}</p>
                                <p>Marked: {summary.markedCount}/{classDates.length}</p>
                                <p className="font-semibold text-primary-700">Attendance: {summary.attendancePct}%</p>
                              </div>
                            </article>
                          ))}
                        </div>

                        <div className="hidden md:block border rounded-lg overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead className="bg-gray-50 text-gray-600">
                              <tr>
                                <th className="text-left px-2 py-2 font-semibold">Student</th>
                                <th className="text-right px-2 py-2 font-semibold">Present</th>
                                <th className="text-right px-2 py-2 font-semibold">Late</th>
                                <th className="text-right px-2 py-2 font-semibold">Excused</th>
                                <th className="text-right px-2 py-2 font-semibold">Absent</th>
                                <th className="text-right px-2 py-2 font-semibold">Marked</th>
                                <th className="text-right px-2 py-2 font-semibold">Attendance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentAttendanceSummary.map((summary: any) => (
                                <tr key={summary.enrollmentId} className="border-t border-gray-100">
                                  <td className="px-2 py-2">
                                    <div className="font-medium text-gray-900">{summary.name || 'Unknown'}</div>
                                    <div className="text-[11px] text-gray-500">{summary.status}</div>
                                  </td>
                                  <td className="text-right px-2 py-2">{summary.presentCount}</td>
                                  <td className="text-right px-2 py-2">{summary.lateCount}</td>
                                  <td className="text-right px-2 py-2">{summary.excusedCount}</td>
                                  <td className="text-right px-2 py-2">{summary.absentCount}</td>
                                  <td className="text-right px-2 py-2">{summary.markedCount}/{classDates.length}</td>
                                  <td className="text-right px-2 py-2 font-semibold text-primary-700">{summary.attendancePct}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="border-t pt-3">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Overall Class Attendance by Day</h3>
                    {attendanceByDate.length === 0 ? (
                      <p className="text-xs text-gray-500">No attendance recorded yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {attendanceByDate.map((day: any) => (
                          <div key={day.ClassDate} className="bg-white border rounded-lg p-2 text-xs text-gray-700">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{day.ClassDate}</span>
                              <span className="font-semibold text-primary-700">{day.AttendancePct}% present/late</span>
                            </div>
                            <div className="flex gap-3 flex-wrap text-[11px] text-gray-600">
                              <span>Present: {day.PresentCount}</span>
                              <span>Late: {day.LateCount}</span>
                              <span>Excused: {day.ExcusedCount}</span>
                              <span>Absent: {day.AbsentCount}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'skills' ? (
            <div>
              {!isInProgress ? (
                <div className="text-center py-8 px-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Skills can only be edited for ongoing classes.</p>
                  <p className="text-xs text-gray-500">Current status: <span className="font-medium">{offeringStatus}</span></p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Student</label>
                      <select
                        title="Select student"
                        value={selectedEnrollmentId ?? ''}
                        onChange={(event) => {
                          setSelectedEnrollmentId(Number(event.target.value));
                          setRatingSkill(null);
                        }}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-300 outline-none"
                      >
                        {activeDetailEnrollments.length === 0 && <option value="">No active students</option>}
                        {activeDetailEnrollments.map((enrollment: any) => (
                          <option key={enrollment.EnrollmentID} value={enrollment.EnrollmentID}>
                            {enrollment.FirstName} {enrollment.LastName || enrollment.StudentName}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedEnrollmentId && !ratingSkill && visibleSkills.length > 0 && (
                      <button
                        onClick={() => {
                          const firstSkill = visibleSkills[0];
                          setRatingSkill(firstSkill);
                          setRatingValue(skillRatings.find((row: any) => row.SkillID === firstSkill.SkillID)?.Rating ?? 3);
                        }}
                        className="px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
                      >
                        + Rate
                      </button>
                    )}
                  </div>

                  {ratingSkill && (
                    <div className="mb-4 p-4 bg-primary-50 border border-primary-200 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-gray-900">Rate a Skill</p>
                        <button onClick={() => setRatingSkill(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                          x
                        </button>
                      </div>
                      <div className="mb-3">
                        <label className="text-xs text-gray-500 block mb-1">Skill</label>
                        <select
                          title="Select skill"
                          value={ratingSkill.SkillID}
                          onChange={(event) => {
                            const skill = visibleSkills.find((row: any) => row.SkillID === Number(event.target.value));
                            if (!skill) return;
                            setRatingSkill(skill);
                            setRatingValue(skillRatings.find((row: any) => row.SkillID === skill.SkillID)?.Rating ?? 3);
                          }}
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                        >
                          {visibleSkills.map((skill: any) => (
                            <option key={skill.SkillID} value={skill.SkillID}>{skill.SkillName}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="text-xs text-gray-500 block mb-1">Rating (1-5)</label>
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              onClick={() => setRatingValue(rating)}
                              className={`w-9 h-9 rounded-full text-sm font-bold border transition-colors ${
                                ratingValue === rating
                                  ? 'bg-primary-600 text-white border-primary-600'
                                  : 'bg-white border-gray-300 text-gray-600 hover:border-primary-400'
                              }`}
                            >
                              {rating}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          onClick={handleSaveRating}
                          disabled={savingRating}
                          className="w-full px-4 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-60 sm:w-auto"
                        >
                          {savingRating ? 'Saving...' : 'Save Rating'}
                        </button>
                        <button
                          onClick={() => setRatingSkill(null)}
                          className="w-full px-4 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 sm:w-auto"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {loadingSkills ? (
                    <Loader text="Loading skills..." />
                  ) : allSkills.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No skills defined yet.</p>
                  ) : visibleSkills.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No skills configured for this class level.</p>
                  ) : activeDetailEnrollments.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No active students enrolled.</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(skillsByCategory).map(([categoryName, categorySkills]) => (
                        <div key={categoryName}>
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{categoryName}</h4>
                          <div className="flex flex-wrap gap-2">
                            {(categorySkills as any[]).map((skill: any) => {
                              const rating = skillRatings.find((row: any) => row.SkillID === skill.SkillID);
                              return (
                                <button
                                  key={skill.SkillID}
                                  onClick={() => {
                                    setRatingSkill(skill);
                                    setRatingValue(rating?.Rating ?? 3);
                                  }}
                                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                                    rating
                                      ? 'bg-primary-50 border-primary-300 text-primary-800 hover:bg-primary-100'
                                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                  }`}
                                >
                                  <span>{skill.SkillName}</span>
                                  <span className="text-gray-300 mx-0.5">-</span>
                                  <span className={rating ? 'text-primary-600 font-semibold' : 'text-gray-400'}>{rating?.Rating ?? '-'}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : activeTab === 'notes' ? (
            <div className="space-y-4">
              {!isInProgress ? (
                <div className="text-center py-8 px-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Notes can only be edited for ongoing classes.</p>
                  <p className="text-xs text-gray-500">Current status: <span className="font-medium">{offeringStatus}</span></p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-start gap-2 mb-1 sm:flex-row sm:items-center">
                    <label className="text-sm font-medium text-gray-700">Session Date:</label>
                    <input
                      type="date"
                      title="Session date"
                      value={sessionDate}
                      onChange={(event) => setSessionDate(event.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    />
                  </div>

                  {loadingNotes ? (
                    <Loader text="Loading notes..." />
                  ) : (
                    <>
                      <div className="rounded-xl border border-blue-100 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-blue-50">
                          <h3 className="text-sm font-semibold text-blue-800">Session Notes</h3>
                          {!addingSessionLog && (
                            <button
                              onClick={() => setAddingSessionLog(true)}
                              className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
                            >
                              + Add Note
                            </button>
                          )}
                        </div>
                        <div className="p-4">
                          {addingSessionLog && (
                            <div className="mb-3 space-y-2">
                              <textarea
                                value={sessionLogText}
                                onChange={(event) => setSessionLogText(event.target.value)}
                                rows={3}
                                placeholder="What did we cover? Games played, themes, feedback..."
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-300 outline-none"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={handleSaveSessionLog}
                                  disabled={savingNote}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60"
                                >
                                  {savingNote ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  onClick={() => {
                                    setAddingSessionLog(false);
                                    setSessionLogText('');
                                  }}
                                  className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {sessionLogs.filter((log: any) => String(log.SessionDate) === String(sessionDate)).length === 0 && !addingSessionLog ? (
                            <p className="text-sm text-gray-400 text-center py-2">No session notes yet. Click "+Add Note" to start.</p>
                          ) : (
                            <div className="space-y-3 max-h-48 overflow-y-auto">
                              {sessionLogs.map((log: any, index: number) => {
                                const dateMatch = String(log.SessionDate || '').trim() === String(sessionDate).trim();
                                if (!dateMatch) return null;
                                return (
                                  <div key={log.LogID ?? index} className="border-b border-gray-100 pb-2 last:border-0">
                                    <p className="text-xs text-gray-400 mb-0.5">{log.SessionDate}</p>
                                    <p className="text-sm text-gray-800">{log.CurriculumNotes || log.GeneralNotes || 'No notes'}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-green-100 overflow-hidden">
                        <div className="px-4 py-3 bg-green-50">
                          <h3 className="text-sm font-semibold text-green-800">Student Progress Notes</h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {detailEnrollments.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">No students enrolled.</p>
                          ) : (
                            detailEnrollments.map((enrollment: any) => {
                              const studentNotes = progressNotes.filter((note: any) => note.EnrollmentID === enrollment.EnrollmentID);
                              const isAddingForThisStudent = addingNoteFor === enrollment.EnrollmentID;

                              return (
                                <div key={enrollment.EnrollmentID} className="px-4 py-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <p className="text-sm font-semibold text-gray-900">{enrollment.FirstName} {enrollment.LastName || enrollment.StudentName}</p>
                                    {!isAddingForThisStudent && (
                                      <button
                                        onClick={() => {
                                          setAddingNoteFor(enrollment.EnrollmentID);
                                          setNewNoteText('');
                                        }}
                                        className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-lg hover:bg-green-200"
                                      >
                                        + Add Note
                                      </button>
                                    )}
                                  </div>

                                  {isAddingForThisStudent && (
                                    <div className="mt-1 mb-2 space-y-2">
                                      <textarea
                                        value={newNoteText}
                                        onChange={(event) => setNewNoteText(event.target.value)}
                                        rows={2}
                                        placeholder="Feedback, observations, progress..."
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-green-300 outline-none"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleSaveProgressNote(enrollment.EnrollmentID)}
                                          disabled={savingNote}
                                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-60"
                                        >
                                          {savingNote ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                          onClick={() => {
                                            setAddingNoteFor(null);
                                            setNewNoteText('');
                                          }}
                                          className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {studentNotes.length === 0 ? (
                                    <p className="text-xs text-gray-400">No notes yet.</p>
                                  ) : (
                                    <div className="space-y-1 mt-1 max-h-28 overflow-y-auto">
                                      {studentNotes.map((note: any, index: number) => (
                                        <div key={index} className="text-xs">
                                          <span className="text-gray-400">{note.NoteDate}: </span>
                                          <span className="text-gray-700">{note.Note}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          ) : activeTab === 'roster' ? (
            filteredStudents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrolled Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((student: Student) => (
                      <tr key={student.StudentID} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{student.FirstName} {student.LastName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{student.PrimaryEmail}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{student.EnrollmentDate ? new Date(student.EnrollmentDate).toLocaleDateString() : 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={student.CompletionStatus || 'Active'}
                            onChange={(event) => handleStatusChange(student.EnrollmentID!, event.target.value)}
                            className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="Active">Active</option>
                            <option value="Completed">Completed</option>
                            <option value="Dropped">Dropped</option>
                            <option value="Withdrawn">Withdrawn</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleRemoveStudent(student.EnrollmentID!)}
                            className="text-xs px-2 py-1 text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
                            title="Remove student from class"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No students enrolled yet</p>
              </div>
            )
          ) : activeTab === 'add' ? (
            filteredStudents.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={filteredStudents.length > 0 && filteredStudents.every((student) => selectedStudentIds.has(student.StudentID))}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedStudentIds(new Set(filteredStudents.map((student) => student.StudentID)));
                        } else {
                          setSelectedStudentIds(new Set());
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    Select all ({filteredStudents.length})
                  </label>
                  {selectedStudentIds.size > 0 && (
                    <span className="text-sm text-primary-600 font-medium">{selectedStudentIds.size} selected</span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.StudentID}
                      className={`relative cursor-pointer rounded-lg border-2 transition-colors ${
                        selectedStudentIds.has(student.StudentID) ? 'border-primary-500 bg-primary-50' : 'border-transparent'
                      }`}
                    >
                      <StudentCard
                        student={student}
                        isSelected={selectedStudentIds.has(student.StudentID)}
                        onToggle={() => toggleStudentSelection(student.StudentID)}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">{searchTerm ? 'No students found matching your search' : 'No available students to add'}</p>
              </div>
            )
          ) : filteredStudents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStudents.map((student) => (
                <div key={student.StudentID} className="relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="pr-8">
                    <h4 className="text-sm font-semibold text-gray-900">{student.FirstName} {student.LastName}</h4>
                    <p className="text-xs text-gray-600 mt-1">{student.PrimaryEmail || 'No email'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Status: {normalizeStatus(student.CompletionStatus || 'Active')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveStudent(student.EnrollmentID!)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    title="Remove student from class"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {searchTerm
                  ? 'No students found matching your search'
                  : activeTab === 'enrolled'
                    ? 'No students enrolled yet'
                    : 'No available students to add'}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div>
            {activeTab === 'add' && selectedStudentIds.size > 0 && (
              <button
                onClick={handleAddSelectedStudents}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Selected ({selectedStudentIds.size})
              </button>
            )}
          </div>
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
            Close
          </button>
        </div>
      </div>

      <ClassEditModal
        isOpen={showEditModal}
        classOffering={classOffering}
        onClose={() => setShowEditModal(false)}
        onSaved={() => {
          setShowEditModal(false);
          onRefresh();
        }}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { StudentProfileData, ClassLevels } from '../types';
import { gasService } from '../services/googleAppsScript';

interface StudentProfileProps {
  studentId: number;
  onBack: () => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ studentId, onBack }) => {
  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin edit state
  const [classLevels, setClassLevels] = useState<ClassLevels[]>([]);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingLevel, setSavingLevel] = useState(false);

  // Read-only instructor data
  const [notes, setNotes] = useState<any[]>([]);
  const [skillRatings, setSkillRatings] = useState<any[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [skillsLoading, setSkillsLoading] = useState(false);

  useEffect(() => {
    load();
    loadLevels();
  }, [studentId]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await gasService.getStudentProfileData(studentId);
      if (res.success && res.data) {
        setProfile(res.data);
        loadNotes(studentId);
        const activeEnrollId = res.data.Enrollments?.find((e: any) => e.Status === 'Active')?.EnrollmentID;
        if (activeEnrollId) loadSkillRatings(activeEnrollId);
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to load student profile.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadLevels = async () => {
    const res = await gasService.getAllClassLevels();
    if (res.success && res.data) setClassLevels(res.data);
  };

  const loadNotes = async (sid: number) => {
    setNotesLoading(true);
    const res = await gasService.getStudentNotesForStudent(sid);
    if (res.success && Array.isArray(res.data)) setNotes(res.data);
    setNotesLoading(false);
  };

  const loadSkillRatings = async (enrollmentId: number) => {
    setSkillsLoading(true);
    const res = await gasService.getSkillRatingsForEnrollment(enrollmentId);
    if (res.success && Array.isArray(res.data)) setSkillRatings(res.data);
    setSkillsLoading(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!profile) return;
    setSavingStatus(true);
    const res = await gasService.updateStudentStatus(profile.StudentID, newStatus);
    if (res.success) {
      setProfile(prev => prev ? { ...prev, StudentStatus: newStatus as any } : prev);
      setMessage({ type: 'success', text: 'Student status updated.' });
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update status.' });
    }
    setSavingStatus(false);
  };

  const handleLevelChange = async (levelId: number) => {
    if (!profile) return;
    setSavingLevel(true);
    const res = await gasService.updateStudentLevel(profile.StudentID, levelId);
    if (res.success) {
      const level = classLevels.find(l => l.ClassLevelID === levelId);
      setProfile(prev => prev ? { ...prev, CurrentLevel: levelId } : prev);
      setMessage({ type: 'success', text: `Level updated to ${level?.LevelName || levelId}.` });
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update level.' });
    }
    setSavingLevel(false);
  };

  const fmtDate = (d?: Date | string) => {
    if (!d) return '—';
    try {
      return new Date(d as string).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return String(d); }
  };

  const statusBadgeClass = (s: string) => {
    const map: Record<string, string> = {
      Active:        'bg-green-100 text-green-800',
      Completed:     'bg-blue-100 text-blue-800',
      Dropped:       'bg-red-100 text-red-800',
      Withdrawn:     'bg-orange-100 text-orange-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      Graduated:     'bg-purple-100 text-purple-800',
      Inactive:      'bg-gray-100 text-gray-600',
    };
    return map[s] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) return <Loader text="Loading student profile..." />;

  if (!profile) return (
    <div className="p-4 sm:p-6">
      <button onClick={onBack} className="text-primary-600 hover:text-primary-800 mb-4 font-medium">
        ← Back to Students
      </button>
      <p className="text-gray-500">Student not found.</p>
    </div>
  );

  const activeEnrollments    = profile.Enrollments?.filter(e => e.Status === 'Active')    || [];
  const completedEnrollments = profile.Enrollments?.filter(e => e.Status === 'Completed') || [];
  const droppedEnrollments   = profile.Enrollments?.filter(e => e.Status === 'Dropped')   || [];

  // Group skill ratings by category for display
  const skillsByCategory: Record<string, any[]> = {};
  skillRatings.forEach(sr => {
    const cat = sr.CategoryName || 'General';
    if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
    skillsByCategory[cat].push(sr);
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* ── Header ── */}
      <div>
        <button
          onClick={onBack}
          className="text-primary-600 hover:text-primary-800 font-medium text-sm mb-3 flex items-center gap-1"
        >
          ← Back to Students
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {profile.FirstName} {profile.LastName}
            </h1>
            <p className="text-sm text-gray-500">Admin View</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadgeClass(profile.StudentStatus)}`}>
            {profile.StudentStatus}
          </span>
        </div>
      </div>

      {message && <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Personal & Student Information */}
        <div className="lg:col-span-1 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Full Name</label>
                <p className="text-gray-900">{studentProfile.FirstName} {studentProfile.LastName}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{studentProfile.PrimaryEmail}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="text-gray-900">{studentProfile.PrimaryPhone || 'Not provided'}</p>
              </div>
              
              {studentProfile.Birthday && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Birthday</label>
                  <p className="text-gray-900">{formatDate(studentProfile.Birthday)}</p>
                </div>
              )}

              {studentProfile.Instagram && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Instagram</label>
                  <p className="text-gray-900">{studentProfile.Instagram}</p>
                </div>
              )}
            </div>
          </div>

          {/* Student Status Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Status</h2>
            
            <div className="space-y-3">
      </div>

      {message && <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column ── */}
        <div className="space-y-4">

          {/* Contact */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h2>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500">Email: </span><span className="text-gray-900">{profile.PrimaryEmail}</span></div>
              <div><span className="text-gray-500">Phone: </span><span className="text-gray-900">{profile.PrimaryPhone || '—'}</span></div>
              {profile.Instagram && (
                <div><span className="text-gray-500">Instagram: </span><span className="text-gray-900">{profile.Instagram}</span></div>
              )}
              {profile.Birthday && (
                <div><span className="text-gray-500">Birthday: </span><span className="text-gray-900">{fmtDate(profile.Birthday)}</span></div>
              )}
            </div>
          </div>

          {/* Student Info + Admin overrides */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Student Info
              <span className="text-xs font-normal text-primary-600 ml-2">Admin controls</span>
            </h2>
            <div className="space-y-3 text-sm">

              <div>
                <span className="text-gray-500">Enrolled since: </span>
                <span className="text-gray-900">{fmtDate(profile.EnrollmentDate)}</span>
              </div>

              {/* Status override */}
              <div>
                <label className="text-gray-500 block mb-1">Status</label>
                <select
                  value={profile.StudentStatus}
                  onChange={e => handleStatusChange(e.target.value)}
                  disabled={savingStatus}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary-300 outline-none disabled:opacity-50"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Graduated">Graduated</option>
                </select>
                {savingStatus && <p className="text-xs text-gray-400 mt-1">Saving…</p>}
              </div>

              {/* Level override */}
              <div>
                <label className="text-gray-500 block mb-1">Current Level</label>
                <select
                  value={profile.CurrentLevel || ''}
                  onChange={e => handleLevelChange(Number(e.target.value))}
                  disabled={savingLevel || classLevels.length === 0}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary-300 outline-none disabled:opacity-50"
                >
                  <option value="">No level assigned</option>
                  {classLevels.map(l => (
                    <option key={l.ClassLevelID} value={l.ClassLevelID}>{l.LevelName}</option>
                  ))}
                </select>
                {savingLevel && <p className="text-xs text-gray-400 mt-1">Saving…</p>}
              </div>

              {/* Summary counts */}
              <div className="pt-2 border-t border-gray-100 space-y-1.5">
                <div className="flex justify-between text-gray-600">
                  <span>Active enrollments</span>
                  <span className="font-medium">{activeEnrollments.length}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Completed classes</span>
                  <span className="font-medium">{completedEnrollments.length}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Total enrollments</span>
                  <span className="font-medium">{profile.Enrollments?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Level Progression timeline */}
          {profile.Progression && profile.Progression.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Level Progression</h2>
              <div className="space-y-2">
                {profile.Progression.map((p, i) => (
                  <div key={p.ProgressionID ?? i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-800">{p.LevelName || `Level ${p.ClassLevelID}`}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(p.Status)}`}>
                        {p.Status}
                      </span>
                      {p.Status === 'Completed' && (
                        <span className="text-gray-400 text-xs">{fmtDate(p.CompletionDate)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right 2-column span ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Active Enrollments */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Active Enrollments <span className="text-gray-400 font-normal">({activeEnrollments.length})</span>
            </h2>
            {activeEnrollments.length === 0 ? (
              <p className="text-sm text-gray-400">No active enrollments.</p>
            ) : (
              <div className="space-y-3">
                {activeEnrollments.map((e, i) => (
                  <div key={(e as any).EnrollmentID ?? i} className="p-3 bg-green-50 border border-green-100 rounded-lg text-sm">
                    <div className="font-medium text-gray-900">
                      {(e as any).ClassLevelName || (e as any).ClassName || `Class ${(e as any).OfferingID}`}
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      {(e as any).TeacherName && `${(e as any).TeacherName} · `}
                      {fmtDate((e as any).StartDate)} – {fmtDate((e as any).EndDate)}
                      {((e as any).VenueOrRoom || (e as any).RoomName) && ` · ${(e as any).VenueOrRoom || (e as any).RoomName}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Class History */}
          {(completedEnrollments.length > 0 || droppedEnrollments.length > 0) && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Class History</h2>
              <div className="space-y-2">
                {[...completedEnrollments, ...droppedEnrollments].map((e, i) => (
                  <div
                    key={(e as any).EnrollmentID ?? i}
                    className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <span className="text-gray-900 font-medium">
                        {(e as any).ClassLevelName || (e as any).ClassName || `Class ${(e as any).OfferingID}`}
                      </span>
                      {(e as any).TeacherName && (
                        <span className="text-gray-400 text-xs ml-2">{(e as any).TeacherName}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(e.Status)}`}>
                        {e.Status}
                      </span>
                      <span className="text-gray-400 text-xs">{fmtDate((e as any).EndDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Notes — read-only, instructor-entered */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Progress Notes</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Instructor entries · read only</span>
            </div>
            {notesLoading ? (
              <p className="text-sm text-gray-400">Loading notes…</p>
            ) : notes.length === 0 ? (
              <p className="text-sm text-gray-400">No progress notes recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {notes.map((n, i) => (
                  <div key={n.NoteID ?? i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-sm text-gray-800">{n.FeedbackText}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {fmtDate(n.NoteDate)}{n.AuthorName && ` · ${n.AuthorName}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skill Ratings — read-only, active enrollment */}
          {activeEnrollments.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-gray-700">Skill Ratings</h2>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                  Instructor entries · active enrollment · read only
                </span>
              </div>
              {skillsLoading ? (
                <p className="text-sm text-gray-400 mt-3">Loading ratings…</p>
              ) : skillRatings.length === 0 ? (
                <p className="text-sm text-gray-400 mt-3">No skill ratings recorded yet.</p>
              ) : (
                <div className="space-y-5 mt-3">
                  {Object.entries(skillsByCategory).map(([catName, catSkills]) => (
                    <div key={catName}>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        {catName}
                      </h3>
                      <div className="space-y-1.5">
                        {catSkills.map((sk: any) => (
                          <div key={sk.CompetencyID ?? sk.SkillID} className="flex items-center justify-between gap-2">
                            <p className="text-sm text-gray-700 min-w-0 truncate">{sk.SkillName}</p>
                            <div className="flex gap-1 flex-shrink-0">
                              {[1, 2, 3, 4, 5].map(score => (
                                <div
                                  key={score}
                                  title={`${score}/5`}
                                  className={`w-6 h-6 rounded text-xs font-semibold border flex items-center justify-center ${
                                    Number(sk.Rating) >= score
                                      ? 'bg-primary-500 text-white border-primary-500'
                                      : 'bg-white border-gray-200 text-gray-300'
                                  }`}
                                >
                                  {score}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
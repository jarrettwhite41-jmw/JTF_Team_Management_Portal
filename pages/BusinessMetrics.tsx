import React, { useState, useEffect, useMemo } from 'react';
import { gasService } from '../services/googleAppsScript';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';

export const BusinessMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [teachingHistory, setTeachingHistory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Time period filters for instructor teaching & pay-period review
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // first day of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1, 0); // last day of current month
    return d.toISOString().split('T')[0];
  });
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'teaching' | 'overview' | 'stage_analytics'>('teaching');
  const [stageAnalytics, setStageAnalytics] = useState<any>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [metricsRes, teachingRes, stageRes] = await Promise.all([
        gasService.getBusinessMetrics(),
        gasService.getInstructorTeachingHistory(),
        gasService.getStageAnalytics(),
      ]);

      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data);
      } else {
        setMessage({ type: 'error', text: metricsRes.error || 'Failed to load business metrics' });
      }

      if (teachingRes.success && teachingRes.data) {
        setTeachingHistory(teachingRes.data);
      } else {
        setMessage({ type: 'error', text: teachingRes.error || 'Failed to load teaching records' });
      }

      if (stageRes && stageRes.success && stageRes.data) {
        setStageAnalytics(stageRes.data);
      }
    } catch {
      setMessage({ type: 'error', text: 'Error fetching metrics and teaching data' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute instructor teaching log breakdown for the selected pay/time period
  const teachingBreakdown = useMemo(() => {
    if (!teachingHistory) return { instructorSummaries: [], sessionEvents: [], allInstructors: [] };

    const offerings = teachingHistory.offerings || [];
    const substitutes = teachingHistory.substitutes || [];
    const sessionsByOfferingMap = new Map<number, string[]>();
    (teachingHistory.sessionsByOffering || []).forEach((item: any) => {
      sessionsByOfferingMap.set(item.offeringId, item.dates);
    });

    // Map all unique session events occurring in the date window
    // A session event has: date, offeringId, levelName, assignedTeacherId, assignedTeacherName, actualTeacherId, actualTeacherName, isSub, subNotes
    const events: Array<{
      date: string;
      offeringId: number;
      levelName: string;
      primaryTeacherName: string;
      actualTeacherName: string;
      actualPersonnelId: number;
      isSub: boolean;
      subNotes?: string;
    }> = [];

    const instructorMap = new Map<string, {
      name: string;
      regularClassesCount: number;
      subbedClassesCount: number;
      totalTaughtCount: number;
      sessions: Array<{ date: string; levelName: string; isSub: boolean; notes?: string }>;
    }>();

    const getOrInitInstructor = (name: string) => {
      if (!instructorMap.has(name)) {
        instructorMap.set(name, {
          name,
          regularClassesCount: 0,
          subbedClassesCount: 0,
          totalTaughtCount: 0,
          sessions: [],
        });
      }
      return instructorMap.get(name)!;
    };

    // 1. Process all offerings with recorded attendance session dates
    offerings.forEach((off: any) => {
      const offId = off.offering_id;
      const levelName = off.class_levels?.level_name || 'Class';
      const teacherInfo = off.teachers?.personnel;
      const primaryTeacherName = teacherInfo
        ? `${teacherInfo.first_name || ''} ${teacherInfo.last_name || ''}`.trim()
        : 'Unassigned';

      const dates = sessionsByOfferingMap.get(offId) || [];

      // If no explicit attendance rows yet, but class is in range, consider scheduled dates
      const datesToProcess = dates.length > 0 ? dates : (off.start_date ? [String(off.start_date).split('T')[0]] : []);

      datesToProcess.forEach((sessionDate: string) => {
        if (sessionDate >= startDate && sessionDate <= endDate) {
          // Check if there were substitutes on this session date
          const subsOnDate = substitutes.filter(
            (s: any) => s.offering_id === offId && String(s.session_date).split('T')[0] === sessionDate
          );

          if (subsOnDate.length > 0) {
            // Substitutes covered this class
            subsOnDate.forEach((sub: any) => {
              const subName = sub.substitute_name || 'Substitute';
              events.push({
                date: sessionDate,
                offeringId: offId,
                levelName,
                primaryTeacherName,
                actualTeacherName: subName,
                actualPersonnelId: sub.personnel_id,
                isSub: true,
                subNotes: sub.notes,
              });

              const rec = getOrInitInstructor(subName);
              rec.subbedClassesCount += 1;
              rec.totalTaughtCount += 1;
              rec.sessions.push({ date: sessionDate, levelName, isSub: true, notes: sub.notes });
            });
          } else {
            // Regular instructor taught
            events.push({
              date: sessionDate,
              offeringId: offId,
              levelName,
              primaryTeacherName,
              actualTeacherName: primaryTeacherName,
              actualPersonnelId: off.teachers?.personnel_id || 0,
              isSub: false,
            });

            if (primaryTeacherName !== 'Unassigned') {
              const rec = getOrInitInstructor(primaryTeacherName);
              rec.regularClassesCount += 1;
              rec.totalTaughtCount += 1;
              rec.sessions.push({ date: sessionDate, levelName, isSub: false });
            }
          }
        }
      });
    });

    events.sort((a, b) => b.date.localeCompare(a.date));

    const instructorSummaries = Array.from(instructorMap.values()).sort(
      (a, b) => b.totalTaughtCount - a.totalTaughtCount || a.name.localeCompare(b.name)
    );

    const allInstructors = Array.from(instructorMap.keys()).sort((a, b) => a.localeCompare(b));

    return { instructorSummaries, sessionEvents: events, allInstructors };
  }, [teachingHistory, startDate, endDate]);

  const filteredSessionEvents = useMemo(() => {
    if (selectedTeacherFilter === 'all') return teachingBreakdown.sessionEvents;
    return teachingBreakdown.sessionEvents.filter(
      (e) => e.actualTeacherName.toLowerCase() === selectedTeacherFilter.toLowerCase()
    );
  }, [teachingBreakdown, selectedTeacherFilter]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Theater & Business Insights</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
              📊 Executive Suite
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Review instructor class logs & subbing records for pay periods, conservatory enrollment trends, and theater operational health.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex gap-2 self-start bg-gray-100 p-1 rounded-xl border border-gray-200">
          <button
            onClick={() => setActiveTab('teaching')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'teaching'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🧑‍🏫 Instructor Teaching & Sub Logs
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📈 Company Metrics & Health
          </button>
          <button
            onClick={() => setActiveTab('stage_analytics')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'stage_analytics'
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🎭 Stage & Cast Analytics
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4">
          <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />
        </div>
      )}

      {isLoading ? (
        <Loader text="Loading business insights and records..." />
      ) : activeTab === 'teaching' ? (
        /* INSTRUCTOR TEACHING & SUBBING TAB (For Pay Calculations & Verification) */
        <div className="space-y-6">
          {/* Time Window & Pay-Period Filter Bar */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-700">Pay Period Start:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-primary-400 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-gray-700">End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-primary-400 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-gray-700">Instructor:</label>
              <select
                value={selectedTeacherFilter}
                onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 flex-1 bg-white focus:ring-2 focus:ring-primary-400 outline-none"
              >
                <option value="all">All Instructors ({teachingBreakdown.allInstructors.length})</option>
                {teachingBreakdown.allInstructors.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Presets */}
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  const now = new Date();
                  const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                  setStartDate(first);
                  setEndDate(last);
                }}
                className="text-[11px] font-medium px-2 py-1 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100"
              >
                This Month
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
                  const last = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
                  setStartDate(first);
                  setEndDate(last);
                }}
                className="text-[11px] font-medium px-2 py-1 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100"
              >
                Last Month
              </button>
            </div>
          </div>

          {/* Instructor Totals Summary Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                Instructor Totals for Period ({startDate} to {endDate})
              </h2>
              <span className="text-xs text-gray-500">
                {teachingBreakdown.instructorSummaries.length} active teacher(s) in window
              </span>
            </div>

            {teachingBreakdown.instructorSummaries.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
                No classes or substitutes recorded within this date range. Try expanding the start or end dates.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {teachingBreakdown.instructorSummaries.map((inst) => (
                  <div
                    key={inst.name}
                    className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-primary-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-gray-900 text-base">{inst.name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-800">
                          {inst.totalTaughtCount} {inst.totalTaughtCount === 1 ? 'class' : 'classes'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 mb-3">
                        <div className="flex justify-between">
                          <span>Regular Scheduled Classes:</span>
                          <span className="font-semibold text-gray-900">{inst.regularClassesCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Subbed / Covered Classes:</span>
                          <span className="font-semibold text-amber-700">+{inst.subbedClassesCount}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedTeacherFilter(inst.name)}
                      className="w-full text-center py-1.5 text-xs font-semibold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      View Detailed Session Log →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Per-Session Verification Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Individual Session Verification Log ({filteredSessionEvents.length})
                </h3>
                <p className="text-xs text-gray-500">
                  Exact session dates, class levels, primary teachers, and logged subbing covers for pay processing
                </p>
              </div>

              {selectedTeacherFilter !== 'all' && (
                <button
                  onClick={() => setSelectedTeacherFilter('all')}
                  className="text-xs text-primary-600 font-semibold hover:underline"
                >
                  Clear Filter (Show All)
                </button>
              )}
            </div>

            {filteredSessionEvents.length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-400">No session records match the current filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600 uppercase font-semibold">
                    <tr>
                      <th className="text-left px-4 py-2.5">Date</th>
                      <th className="text-left px-4 py-2.5">Class / Level</th>
                      <th className="text-left px-4 py-2.5">Instructor Taught</th>
                      <th className="text-left px-4 py-2.5">Assignment Type</th>
                      <th className="text-left px-4 py-2.5">Notes / Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-800">
                    {filteredSessionEvents.map((evt, idx) => (
                      <tr key={`${evt.offeringId}-${evt.date}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium whitespace-nowrap">{evt.date}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-900">{evt.levelName}</td>
                        <td className="px-4 py-2.5 font-bold text-gray-900">{evt.actualTeacherName}</td>
                        <td className="px-4 py-2.5">
                          {evt.isSub ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              🔄 Substituted (Primary: {evt.primaryTeacherName})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                              Regular Primary
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 italic">{evt.subNotes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'overview' ? (
        /* COMPANY HEALTH & METRICS OVERVIEW TAB */
        <div className="space-y-6">
          {metrics && (
            <>
              {/* Top Key Performance Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-2xl mb-1 block">🎓</span>
                  <div className="text-xs font-semibold text-gray-500 uppercase">Conservatory Students</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{metrics.students?.active || 0}</div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    {metrics.students?.total || 0} total all-time ({metrics.students?.inactive || 0} archived)
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-2xl mb-1 block">📘</span>
                  <div className="text-xs font-semibold text-gray-500 uppercase">Active Enrollments</div>
                  <div className="text-2xl font-bold text-primary-600 mt-1">{metrics.enrollments?.active || 0}</div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    across {metrics.classes?.active || 0} in-progress classes
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-2xl mb-1 block">🎟️</span>
                  <div className="text-xs font-semibold text-gray-500 uppercase">Ticket Revenue</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    ${(metrics.tickets?.revenue || 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    {metrics.tickets?.totalQuantity || 0} tickets sold across {metrics.shows?.total || 0} shows
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <span className="text-2xl mb-1 block">🏢</span>
                  <div className="text-xs font-semibold text-gray-500 uppercase">Corporate Gig Revenue</div>
                  <div className="text-2xl font-bold text-amber-600 mt-1">
                    ${(metrics.corporateGigs?.revenue || 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    {metrics.corporateGigs?.total || 0} private event bookings logged
                  </div>
                </div>
              </div>

              {/* Operational Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span>👥</span> Staffing & Company Roster
                  </h3>
                  <div className="space-y-2.5 text-xs text-gray-700">
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span>Total Registered Personnel</span>
                      <span className="font-bold text-gray-900">{metrics.personnel?.total || 0}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span>Active Company Members</span>
                      <span className="font-bold text-emerald-700">{metrics.personnel?.active || 0}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span>Inactive / Archived</span>
                      <span className="font-semibold text-gray-500">
                        {(metrics.personnel?.total || 0) - (metrics.personnel?.active || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <span>🎬</span> Production & Conservatory Activity
                  </h3>
                  <div className="space-y-2.5 text-xs text-gray-700">
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span>Total Shows on Record</span>
                      <span className="font-bold text-gray-900">{metrics.shows?.total || 0}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span>Class Offerings Total</span>
                      <span className="font-bold text-gray-900">{metrics.classes?.total || 0}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span>Currently Active Classes</span>
                      <span className="font-bold text-primary-700">{metrics.classes?.active || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* STAGE & CAST ANALYTICS TAB (Theater Ensemble, Formats, Directors & Cast Chemistry) */
        <div className="space-y-6">
          {/* Header Summary Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-blue-200">Ensemble Intelligence</div>
              <h2 className="text-xl font-extrabold mt-1">Stage Production & Cast Chemistry</h2>
              <p className="text-xs text-blue-100 mt-1 max-w-xl">
                Ensemble show counts, format distribution, director casting tendencies, and chemistry pairing statistics.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2.5 rounded-xl text-center">
                <div className="text-2xl font-black">{stageAnalytics?.totalShowsCataloged || 0}</div>
                <div className="text-[10px] uppercase font-bold text-blue-200">Cataloged Shows</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2.5 rounded-xl text-center">
                <div className="text-2xl font-black">{stageAnalytics?.totalPerformancesRecorded || 0}</div>
                <div className="text-[10px] uppercase font-bold text-blue-200">Cast Appearances</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top of the Cast Leaderboard (2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900">🏆 Top of the Cast</h3>
                  <p className="text-xs text-gray-500">Performers ranked by total stage appearances and format diversity</p>
                </div>
              </div>

              {stageAnalytics?.leaderboard && stageAnalytics.leaderboard.length > 0 ? (
                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto pr-1">
                  {stageAnalytics.leaderboard.map((performer: any, idx: number) => (
                    <div key={performer.personnel_id} className="py-3 flex items-center justify-between gap-4 hover:bg-gray-50/80 px-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 text-xs font-black ${idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-700' : 'text-gray-400'}`}>
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{performer.full_name}</div>
                          <div className="text-xs text-gray-500 flex flex-wrap gap-2 mt-0.5">
                            {performer.shows_directed > 0 && <span className="bg-purple-50 text-purple-700 font-semibold px-1.5 py-0.5 rounded text-[10px]">{performer.shows_directed} directed</span>}
                            {performer.crew_shifts > 0 && <span className="bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded text-[10px]">{performer.crew_shifts} crew shifts</span>}
                            {performer.top_partner_name && (
                              <span className="text-gray-600">Top partner: <strong className="text-gray-800">{performer.top_partner_name}</strong> ({performer.top_partner_count})</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-base font-black text-primary-700">{performer.total_shows}</span>
                        <span className="text-[10px] uppercase font-bold text-gray-500 block">shows</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400 text-xs">
                  No stage performances recorded yet. Historical email records will populate the ensemble leaderboard.
                </div>
              )}
            </div>

            {/* Directors & Frequent Casts (1 col) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col">
              <div className="mb-4">
                <h3 className="text-base font-bold text-gray-900">🎬 Directors & Call Lists</h3>
                <p className="text-xs text-gray-500">Shows directed and most frequently cast performers</p>
              </div>

              {stageAnalytics?.directors && stageAnalytics.directors.length > 0 ? (
                <div className="space-y-4 overflow-y-auto max-h-[600px] pr-1">
                  {stageAnalytics.directors.map((dir: any) => (
                    <div key={dir.director_id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex justify-between items-baseline mb-2">
                        <div className="text-sm font-bold text-gray-900">{dir.director_name}</div>
                        <div className="text-xs font-bold text-primary-700">{dir.shows_count} directed</div>
                      </div>
                      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cast Most:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {dir.top_cast.map((tc: any) => (
                          <span key={tc.name} className="bg-white border border-gray-200 text-gray-700 text-[11px] px-2 py-0.5 rounded-md shadow-2xs">
                            {tc.name} <strong className="text-gray-900">({tc.count})</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400 text-xs">
                  Director call lists will appear once historical show directors and casts are loaded.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
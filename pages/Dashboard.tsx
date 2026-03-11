import React, { useState, useEffect } from 'react';
import { StatCard } from '../components/common/StatCard';
import { Loader } from '../components/common/Loader';
import { DashboardStats, ClassEnrollmentEntry, NextShowInfo } from '../types';
import { gasService } from '../services/googleAppsScript';

// ── Sub-components ────────────────────────────────────────────────────────────

interface SegmentedBarProps {
  segments: { label: string; count: number; color: string }[];
}
const SegmentedBar: React.FC<SegmentedBarProps> = ({ segments }) => {
  const total = segments.reduce((s, seg) => s + (seg.count || 0), 0);
  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-2.5 mb-2 bg-gray-100">
        {segments.map((seg, i) => {
          const pct = total > 0 ? Math.round((seg.count || 0) / total * 100) : 0;
          return (
            <div
              key={i}
              title={`${seg.label}: ${seg.count}`}
              className={`${seg.color} h-2.5 transition-all`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((seg, i) => {
          const pct = total > 0 ? Math.round((seg.count || 0) / total * 100) : 0;
          return (
            <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${seg.color}`} />
              <span>{seg.label}: </span>
              <span className="font-semibold text-gray-800">{seg.count}</span>
              <span className="text-gray-400">({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface EnrollmentBarProps {
  levelName: string;
  enrolled: number;
  max: number;
  status: string;
}
const EnrollmentBar: React.FC<EnrollmentBarProps> = ({ levelName, enrolled, max, status }) => {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.round(enrolled / safeMax * 100));
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-primary-500';
  const badgeClass = status === 'In Progress'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-emerald-100 text-emerald-700';
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-gray-800 truncate">{levelName}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${badgeClass}`}>{status}</span>
        </div>
        <span className="text-sm text-gray-600 flex-shrink-0 ml-2">{enrolled} / {max}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

interface MetricTileProps {
  value: number;
  label: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}
const MetricTile: React.FC<MetricTileProps> = ({ value, label, color }) => {
  const bgMap = { blue: 'bg-blue-50 border-blue-100', green: 'bg-green-50 border-green-100', purple: 'bg-purple-50 border-purple-100', orange: 'bg-orange-50 border-orange-100' };
  const textMap = { blue: 'text-blue-700', green: 'text-green-700', purple: 'text-purple-700', orange: 'text-orange-700' };
  return (
    <div className={`text-center p-3 rounded-lg border ${bgMap[color]}`}>
      <p className={`text-2xl font-bold ${textMap[color]}`}>{value}</p>
      <p className="text-xs text-gray-600 mt-0.5 leading-tight">{label}</p>
    </div>
  );
};

function formatShowDate(dateStr: Date | string | undefined): string {
  if (!dateStr) return 'TBD';
  try {
    return new Date(dateStr as string).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return String(dateStr); }
}

// ── Main Dashboard component ──────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    try {
      const response = await gasService.getDashboardStats();
      if (response.success && response.data) {
        setStats(response.data);
        setLoadedAt(new Date().toLocaleTimeString());
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <Loader text="Loading dashboard..." />;

  if (!stats) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
        <p className="text-gray-600">Unable to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="p-6">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        {loadedAt && <p className="text-xs text-gray-400">Updated at {loadedAt}</p>}
      </div>

      {/* ROW 1: KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard title="Total Personnel"  value={stats.totalPersonnel}                              icon="👥" color="blue"   />
        <StatCard title="Active Students"  value={stats.studentsActive ?? stats.activeStudents}      icon="🎓" color="green"  />
        <StatCard title="Scheduled Shows"  value={stats.scheduledShows}                             icon="🎪" color="purple" />
        <StatCard title="Active Classes"   value={stats.activeClasses}                              icon="📚" color="orange" />
        <StatCard title="Cast Members"     value={stats.totalCastMembers}                           icon="🎭" color="blue"   />
        <StatCard title="Bartenders"       value={stats.activeBartenders ?? stats.totalBartenders}  icon="🍺" color="green"  />
      </div>

      {/* ROW 2: Status Distribution Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        <div className="bg-white rounded-lg shadow-sm border p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Show Status</h2>
          <p className="text-2xl font-bold text-gray-900 mb-3">{stats.totalShows} Total</p>
          <SegmentedBar segments={[
            { label: 'Scheduled', count: stats.scheduledShows, color: 'bg-purple-500' },
            { label: 'Canceled',  count: stats.canceledShows,  color: 'bg-red-400'   },
          ]} />
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Student Status</h2>
          <p className="text-2xl font-bold text-gray-900 mb-3">{stats.totalStudents} Total</p>
          <SegmentedBar segments={[
            { label: 'Active',    count: stats.studentsActive,    color: 'bg-green-500' },
            { label: 'Inactive',  count: stats.studentsInactive,  color: 'bg-gray-400'  },
            { label: 'Graduated', count: stats.studentsGraduated, color: 'bg-blue-400'  },
          ]} />
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Class Status</h2>
          <p className="text-2xl font-bold text-gray-900 mb-3">{stats.totalClasses} Total</p>
          <SegmentedBar segments={[
            { label: 'Upcoming',    count: stats.upcomingClasses,    color: 'bg-yellow-400' },
            { label: 'In Progress', count: stats.inProgressClasses,  color: 'bg-blue-500'   },
            { label: 'Completed',   count: stats.completedClasses,   color: 'bg-green-400'  },
            { label: 'Cancelled',   count: stats.cancelledClasses,   color: 'bg-red-300'    },
          ]} />
        </div>
      </div>

      {/* ROW 3: Detail Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Class Enrollment */}
        <div className="bg-white rounded-lg shadow-sm border p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Class Enrollment</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{stats.totalEnrollments} enrollments</span>
          </div>
          {stats.classEnrollmentData?.length > 0
            ? stats.classEnrollmentData.map((cls, i) => (
                <EnrollmentBar
                  key={cls.OfferingID ?? i}
                  levelName={cls.LevelName}
                  enrolled={cls.EnrolledCount}
                  max={cls.MaxStudents}
                  status={cls.Status}
                />
              ))
            : <p className="text-sm text-gray-400 text-center py-6">No active classes at this time.</p>
          }
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Next Show */}
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Next Upcoming Show</h2>
            {stats.nextShow
              ? (
                <div>
                  <p className="text-lg font-bold text-gray-900">{formatShowDate(stats.nextShow.ShowDate)}</p>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {stats.nextShow.ShowTime && <span className="text-sm text-gray-600">🕐 {stats.nextShow.ShowTime}</span>}
                    {stats.nextShow.Venue     && <span className="text-sm text-gray-600">📍 {stats.nextShow.Venue}</span>}
                  </div>
                </div>
              )
              : <p className="text-sm text-gray-400">No upcoming shows scheduled.</p>
            }
          </div>

          {/* Personnel Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Personnel Breakdown</h2>
            <div className="grid grid-cols-2 gap-3">
              <MetricTile value={stats.studentsActive ?? stats.activeStudents} label="Active Students" color="green"  />
              <MetricTile value={stats.studentsGraduated}                      label="Graduated"        color="blue"   />
              <MetricTile value={stats.totalCastMembers}                       label="Cast Members"     color="purple" />
              <MetricTile value={stats.totalCrewMembers}                       label="Crew Members"     color="orange" />
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

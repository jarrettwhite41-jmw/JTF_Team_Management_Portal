import React, { useState, useEffect } from 'react';
import { StatCard } from '../components/common/StatCard';
import { Loader } from '../components/common/Loader';
import { DashboardStats, ClassEnrollmentEntry, NextShowInfo, PageType } from '../types';
import { gasService } from '../services/googleAppsScript';
import { crmService } from '../services/crmService';
import { CRMTab } from './OperationsCRM';

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
  const barColor = pct >= 90 ? 'bg-red-700' : pct >= 70 ? 'bg-yellow-500' : 'bg-primary-500';
  const badgeClass = status === 'In Progress'
    ? 'bg-red-100 text-red-700'
    : 'bg-yellow-100 text-yellow-800';
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
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gold';
}
const MetricTile: React.FC<MetricTileProps> = ({ value, label, color }) => {
  const bgMap   = { blue: 'bg-blue-50 border-blue-100', green: 'bg-green-50 border-green-100', purple: 'bg-purple-50 border-purple-100', orange: 'bg-orange-50 border-orange-100', red: 'bg-red-50 border-red-200', gold: 'bg-yellow-50 border-yellow-200' };
  const textMap = { blue: 'text-blue-700', green: 'text-green-700', purple: 'text-purple-700', orange: 'text-orange-700', red: 'text-red-700', gold: 'text-yellow-700' };
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
    const raw = String(dateStr).slice(0, 10);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? new Date(Number(raw.slice(0, 4)), Number(raw.slice(5, 7)) - 1, Number(raw.slice(8, 10)))
      : new Date(dateStr as string);
    return date.toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return String(dateStr); }
}

// ── Main Dashboard component ──────────────────────────────────────────────────

interface DashboardProps {
  onNavigate?: (page: PageType, extra?: { crmTab?: CRMTab }) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [crmOverview, setCrmOverview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    try {
      const [gasRes, crmRes] = await Promise.allSettled([
        gasService.getDashboardStats(),
        crmService.getCrmDashboardOverview(),
      ]);

      if (gasRes.status === 'fulfilled' && gasRes.value.success && gasRes.value.data) {
        setStats(gasRes.value.data);
      }
      if (crmRes.status === 'fulfilled') {
        setCrmOverview(crmRes.value);
      }
      setLoadedAt(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <Loader text="Loading dashboard..." />;

  if (!stats) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
        <p className="text-gray-600">Unable to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">High-level theater operations, live action items, and conservatory statistics.</p>
        </div>
        {loadedAt && <p className="text-xs text-gray-400">Updated at {loadedAt}</p>}
      </div>

      {/* OPERATIONS & ACTION ITEMS BANNER */}
      {crmOverview && (crmOverview.pendingRentalsCount > 0 || crmOverview.openInquiriesCount > 0 || crmOverview.unsignedWelcomePackagesCount > 0 || crmOverview.pendingRefundsCount > 0 || crmOverview.pendingMakeupsCount > 0) && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-4 sm:p-5 mb-6 shadow-md border border-slate-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                Action Required
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white mt-1">Pending Theater Ops & Inquiries</h2>
            </div>
            <button
              onClick={() => onNavigate?.('crm-operations')}
              className="text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              Open Theater CRM &rarr;
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div 
              onClick={() => onNavigate?.('crm-operations', { crmTab: 'rentals' })}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-3 rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">🏢</span>
                <span className="text-xl font-black text-amber-400">{crmOverview.pendingRentalsCount}</span>
              </div>
              <p className="text-xs font-semibold text-slate-200 mt-1">Rental Inquiries</p>
              <p className="text-[11px] text-slate-400">Awaiting quotes / contracts</p>
            </div>

            <div 
              onClick={() => onNavigate?.('crm-operations', { crmTab: 'contact_inquiries' })}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-3 rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">📬</span>
                <span className="text-xl font-black text-blue-400">{crmOverview.openInquiriesCount}</span>
              </div>
              <p className="text-xs font-semibold text-slate-200 mt-1">Contact Messages</p>
              <p className="text-[11px] text-slate-400">Open web inquiries</p>
            </div>

            <div 
              onClick={() => onNavigate?.('crm-operations', { crmTab: 'welcome_packages' })}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-3 rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">✍️</span>
                <span className="text-xl font-black text-purple-400">{crmOverview.unsignedWelcomePackagesCount}</span>
              </div>
              <p className="text-xs font-semibold text-slate-200 mt-1">Welcome Packages</p>
              <p className="text-[11px] text-slate-400">Pending student signature</p>
            </div>

            <div 
              onClick={() => onNavigate?.('crm-operations', { crmTab: 'refunds' })}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-3 rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">🎟️</span>
                <span className="text-xl font-black text-emerald-400">{crmOverview.pendingRefundsCount}</span>
              </div>
              <p className="text-xs font-semibold text-slate-200 mt-1">Refund Requests</p>
              <p className="text-[11px] text-slate-400">{crmOverview.pendingRefundsCount === 0 ? 'All caught up' : 'Pending review'}</p>
            </div>

            <div 
              onClick={() => onNavigate?.('crm-operations', { crmTab: 'makeups' })}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700 p-3 rounded-lg cursor-pointer transition-colors col-span-2 sm:col-span-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">🧑‍🎓</span>
                <span className="text-xl font-black text-teal-400">{crmOverview.pendingMakeupsCount}</span>
              </div>
              <p className="text-xs font-semibold text-slate-200 mt-1">Class Makeups</p>
              <p className="text-[11px] text-slate-400">{crmOverview.pendingMakeupsCount === 0 ? 'All caught up' : 'Pending requests'}</p>
            </div>
          </div>
        </div>
      )}

      {/* ROW 1: KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
        <StatCard title="Total Personnel"  value={stats.totalPersonnel}                              icon="👥" color="red" onClick={() => onNavigate?.('personnel-management')} />
        <StatCard title="Active Students"  value={stats.studentsActive ?? stats.activeStudents}      icon="🎓" color="gold" onClick={() => onNavigate?.('student-directory')} />
        <StatCard title="Scheduled Shows"  value={stats.scheduledShows}                              icon="🎪" color="red" onClick={() => onNavigate?.('show-management')} />
        <StatCard title="Active Classes"   value={stats.activeClasses}                               icon="📚" color="gold" onClick={() => onNavigate?.('class-management')} />
        <StatCard title="Upcoming Workshops" value={stats.upcomingWorkshops}                         icon="🧠" color="red" onClick={() => onNavigate?.('workshops')} />
        <StatCard title="Cast Members"     value={stats.totalCastMembers}                            icon="🎭" color="red" onClick={() => onNavigate?.('cast')} />
        <StatCard title="Bartenders"       value={stats.activeBartenders ?? stats.totalBartenders}   icon="🍺" color="gold" onClick={() => onNavigate?.('bartenders')} />
      </div>

      {/* ROW 2: Status Distribution Panels */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

        <div 
          onClick={() => onNavigate?.('show-management')}
          className="bg-white rounded-lg shadow-sm border p-5 cursor-pointer hover:border-gray-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Show Status</h2>
            <span className="text-[11px] text-blue-600 font-semibold hover:underline">View &rarr;</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-3">{stats.totalShows} Total</p>
          <SegmentedBar segments={[
            { label: 'Scheduled', count: stats.scheduledShows, color: 'bg-red-500'    },
            { label: 'Canceled',  count: stats.canceledShows,  color: 'bg-gray-500'   },
          ]} />
        </div>

        <div 
          onClick={() => onNavigate?.('student-directory')}
          className="bg-white rounded-lg shadow-sm border p-5 cursor-pointer hover:border-gray-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Student Status</h2>
            <span className="text-[11px] text-blue-600 font-semibold hover:underline">View &rarr;</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-3">{stats.totalStudents} Total</p>
          <SegmentedBar segments={[
            { label: 'Active',    count: stats.studentsActive,    color: 'bg-red-500'    },
            { label: 'Inactive',  count: stats.studentsInactive,  color: 'bg-gray-400'   },
            { label: 'Graduated', count: stats.studentsGraduated, color: 'bg-yellow-500' },
          ]} />
        </div>

        <div 
          onClick={() => onNavigate?.('class-management')}
          className="bg-white rounded-lg shadow-sm border p-5 cursor-pointer hover:border-gray-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Class Status</h2>
            <span className="text-[11px] text-blue-600 font-semibold hover:underline">View &rarr;</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-3">{stats.totalClasses} Total</p>
          <SegmentedBar segments={[
            { label: 'Upcoming',    count: stats.upcomingClasses,    color: 'bg-yellow-400' },
            { label: 'In Progress', count: stats.inProgressClasses,  color: 'bg-red-500'    },
            { label: 'Completed',   count: stats.completedClasses,   color: 'bg-zinc-400'   },
            { label: 'Cancelled',   count: stats.cancelledClasses,   color: 'bg-gray-600'   },
          ]} />
        </div>

        <div 
          onClick={() => onNavigate?.('workshops')}
          className="bg-white rounded-lg shadow-sm border p-5 cursor-pointer hover:border-gray-300 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Workshop Status</h2>
            <span className="text-[11px] text-blue-600 font-semibold hover:underline">View &rarr;</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-3">{stats.totalWorkshops} Total</p>
          <SegmentedBar segments={[
            { label: 'Upcoming',    count: stats.upcomingWorkshops,    color: 'bg-blue-500'  },
            { label: 'In Progress', count: stats.inProgressWorkshops,  color: 'bg-red-500'   },
            { label: 'Completed',   count: stats.completedWorkshops,   color: 'bg-zinc-400'  },
            { label: 'Cancelled',   count: stats.cancelledWorkshops,   color: 'bg-gray-600'  },
          ]} />
        </div>
      </div>

      {/* ROW 3: Detail Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Class Enrollment */}
        <div 
          onClick={() => onNavigate?.('class-management')}
          className="bg-white rounded-lg shadow-sm border p-5 cursor-pointer hover:border-gray-300 hover:shadow-md transition-all"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Class Enrollment</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{stats.totalEnrollments} enrollments</span>
              <span className="text-xs text-blue-600 font-semibold hover:underline">Manage &rarr;</span>
            </div>
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
          <div 
            onClick={() => onNavigate?.('show-management')}
            className="bg-white rounded-lg shadow-sm border p-5 cursor-pointer hover:border-gray-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Next Upcoming Show</h2>
              <span className="text-xs text-blue-600 font-semibold hover:underline">View Shows &rarr;</span>
            </div>
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

          {/* Next Workshop */}
          <div 
            onClick={() => onNavigate?.('workshops')}
            className="bg-white rounded-lg shadow-sm border p-5 cursor-pointer hover:border-gray-300 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Next Upcoming Workshop</h2>
              <span className="text-xs text-blue-600 font-semibold hover:underline">View Workshops &rarr;</span>
            </div>
            {stats.nextWorkshop
              ? (
                <div>
                  <p className="text-lg font-bold text-gray-900">{stats.nextWorkshop.Title}</p>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <span className="text-sm text-gray-600">📅 {formatShowDate(stats.nextWorkshop.WorkshopDate)}</span>
                    {stats.nextWorkshop.Venue && <span className="text-sm text-gray-600">📍 {stats.nextWorkshop.Venue}</span>}
                    <span className="text-sm text-gray-600">👤 {stats.totalWorkshopRegistrations} registrations</span>
                  </div>
                </div>
              )
              : <p className="text-sm text-gray-400">No upcoming workshops scheduled.</p>
            }
          </div>

          {/* Personnel Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Personnel Breakdown</h2>
              <span 
                onClick={() => onNavigate?.('personnel-management')}
                className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
              >
                View Roster &rarr;
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div onClick={() => onNavigate?.('student-directory')} className="cursor-pointer">
                <MetricTile value={stats.studentsActive ?? stats.activeStudents} label="Active Students" color="red"  />
              </div>
              <div onClick={() => onNavigate?.('student-directory')} className="cursor-pointer">
                <MetricTile value={stats.studentsGraduated}                      label="Graduated"        color="gold" />
              </div>
              <div onClick={() => onNavigate?.('cast')} className="cursor-pointer">
                <MetricTile value={stats.totalCastMembers}                       label="Cast Members"     color="red"  />
              </div>
              <div onClick={() => onNavigate?.('crew')} className="cursor-pointer">
                <MetricTile value={stats.totalCrewMembers}                       label="Crew Members"     color="gold" />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ROW 4: RECENT INCOMING INQUIRIES & RENTALS ACTIVITY */}
      {crmOverview && (crmOverview.recentRentals?.length > 0 || crmOverview.recentInquiries?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          {/* Latest Rental Inquiries */}
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>🏢</span> Latest Rental Inquiries
              </h2>
              <button
                onClick={() => onNavigate?.('crm-operations', { crmTab: 'rentals' })}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                View all rentals &rarr;
              </button>
            </div>
            {crmOverview.recentRentals?.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {crmOverview.recentRentals.map((r: any) => (
                  <div 
                    key={r.rental_id} 
                    onClick={() => onNavigate?.('crm-operations', { crmTab: 'rentals' })}
                    className="py-2.5 flex items-start justify-between gap-3 text-xs cursor-pointer hover:bg-gray-50/80 px-2 rounded-lg transition-colors"
                  >
                    <div>
                      <p className="font-bold text-gray-900">{r.contact_name}</p>
                      <p className="text-gray-500">{r.organization_name || r.event_type} {r.guest_count ? `• ${r.guest_count} guests` : ''}</p>
                      {r.preferred_date && <p className="text-[11px] text-gray-400 mt-0.5">Pref: {r.preferred_date.slice(0, 15)}</p>}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 whitespace-nowrap">
                      Inquiry
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">No active rental inquiries.</p>
            )}
          </div>

          {/* Latest Contact Form Inquiries */}
          <div className="bg-white rounded-lg shadow-sm border p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>📬</span> Recent Web Contact Inquiries
              </h2>
              <button
                onClick={() => onNavigate?.('crm-operations', { crmTab: 'contact_inquiries' })}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                View all inquiries &rarr;
              </button>
            </div>
            {crmOverview.recentInquiries?.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {crmOverview.recentInquiries.map((inq: any) => (
                  <div 
                    key={inq.log_id} 
                    onClick={() => onNavigate?.('crm-operations', { crmTab: 'contact_inquiries' })}
                    className="py-2.5 flex items-start justify-between gap-3 text-xs cursor-pointer hover:bg-gray-50/80 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 truncate">{inq.sender_name || inq.staff_email}</p>
                        {inq.submitted_at && (
                          <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">
                            {inq.submitted_at.slice(0, 10)}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 font-medium truncate mt-0.5">{inq.subject}</p>
                      <p className="text-gray-400 text-[11px] truncate">{inq.body.replace(/^From: [^\n]+\n\n/, '')}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 whitespace-nowrap">
                      Open
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">No open contact inquiries.</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

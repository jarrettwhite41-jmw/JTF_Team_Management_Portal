import React, { useState, useEffect, useMemo } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import {
  ShowTicketingSummary,
  TicketingIntegration,
  TicketingOverviewStats,
  TicketingPlatform,
} from '../types';
import { ticketingService } from '../services/ticketingService';

type TabView = 'shows' | 'analytics' | 'boxoffice' | 'settings';
type PlatformFilter = 'all' | 'ticketweb' | 'eventbrite' | 'square';

export const TicketingManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabView>('shows');
  const [summaries, setSummaries] = useState<ShowTicketingSummary[]>([]);
  const [integrations, setIntegrations] = useState<TicketingIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'sold_out' | 'paused'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [platformView, setPlatformView] = useState<PlatformFilter>('all');

  // Quick edit modal
  const [editingShow, setEditingShow] = useState<ShowTicketingSummary | null>(null);
  const [editCapacity, setEditCapacity] = useState<number>(100);
  const [editHeld, setEditHeld] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<'open' | 'paused' | 'sold_out' | 'closed'>('open');
  const [editTWUrl, setEditTWUrl] = useState('');
  const [editEBUrl, setEditEBUrl] = useState('');
  const [editSQUrl, setEditSQUrl] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Door Reconcile State
  const [reconcileShow, setReconcileShow] = useState<ShowTicketingSummary | null>(null);
  const [doorWalkups, setDoorWalkups] = useState<number>(0);
  const [doorWalkupPrice, setDoorWalkupPrice] = useState<number>(20);
  const [checkedInCount, setCheckedInCount] = useState<number>(0);
  const [isSavingReconcile, setIsSavingReconcile] = useState(false);

  // Platform Settings State
  const [ebApiKey, setEbApiKey] = useState('');
  const [ebOrgId, setEbOrgId] = useState('');
  const [twApiKey, setTwApiKey] = useState('');
  const [twVenueId, setTwVenueId] = useState('');
  const [sqApiKey, setSqApiKey] = useState('');
  const [sqLocationId, setSqLocationId] = useState('');
  const [sqAppId, setSqAppId] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [sumRes, intRes] = await Promise.all([
        ticketingService.getShowTicketingSummaries(),
        ticketingService.getIntegrations(),
      ]);

      if (sumRes.success && sumRes.data) {
        setSummaries(sumRes.data);
      } else {
        setMessage({ type: 'error', text: sumRes.error || 'Failed to load show ticketing.' });
      }

      if (intRes.success && intRes.data) {
        setIntegrations(intRes.data);
        const eb = intRes.data.find((i) => i.Platform === 'eventbrite');
        const tw = intRes.data.find((i) => i.Platform === 'ticketweb');
        const sq = intRes.data.find((i) => i.Platform === 'square');
        if (eb) {
          setEbApiKey(eb.ApiKey || '');
          setEbOrgId(eb.OrganizationId || '');
        }
        if (tw) {
          setTwApiKey(tw.ApiKey || '');
          setTwVenueId(tw.VenueId || '');
        }
        if (sq) {
          setSqApiKey(sq.ApiKey || '');
          setSqLocationId(sq.LocationId || '');
          setSqAppId(sq.ApplicationId || '');
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Unexpected error loading ticketing data.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const stats: TicketingOverviewStats = useMemo(() => {
    return ticketingService.computeOverviewStats(summaries);
  }, [summaries]);

  const handleSyncAll = async (platform?: TicketingPlatform) => {
    setIsSyncing(true);
    setMessage(null);
    try {
      const res = await ticketingService.triggerPlatformSync(platform);
      if (res.success && res.data) {
        setMessage({ type: 'success', text: res.data.message });
        await loadAllData();
      } else {
        setMessage({ type: 'error', text: res.error || 'Sync failed.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error connecting to ticketing platforms.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveShowEdit = async () => {
    if (!editingShow) return;
    setIsSavingEdit(true);
    try {
      await Promise.all([
        ticketingService.updateShowCapacity(editingShow.ShowID, 'ticketweb', {
          totalCapacity: editCapacity,
          heldCount: editHeld,
          ticketStatus: editStatus,
          externalEventUrl: editTWUrl,
        }),
        ticketingService.updateShowCapacity(editingShow.ShowID, 'eventbrite', {
          totalCapacity: editCapacity,
          heldCount: editHeld,
          ticketStatus: editStatus,
          externalEventUrl: editEBUrl,
        }),
        ticketingService.updateShowCapacity(editingShow.ShowID, 'square', {
          totalCapacity: editCapacity,
          heldCount: editHeld,
          ticketStatus: editStatus,
          externalEventUrl: editSQUrl,
        }),
      ]);

      setMessage({ type: 'success', text: `Capacity & status updated for Show #${editingShow.ShowID}.` });
      setEditingShow(null);
      await loadAllData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update show.' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveDoorReconcile = async () => {
    if (!reconcileShow) return;
    setIsSavingReconcile(true);
    try {
      const walkupRevenue = doorWalkups * doorWalkupPrice;
      const res = await ticketingService.recordDoorReconcile(
        reconcileShow.ShowID,
        doorWalkups,
        walkupRevenue,
        checkedInCount
      );

      if (res.success) {
        setMessage({
          type: 'success',
          text: `Box office door reconcile recorded: ${doorWalkups} walk-ups ($${walkupRevenue}), ${checkedInCount} checked in.`,
        });
        setReconcileShow(null);
        await loadAllData();
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to record door reconcile.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error saving door reconcile.' });
    } finally {
      setIsSavingReconcile(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await Promise.all([
        ticketingService.saveIntegration({
          Platform: 'eventbrite',
          ApiKey: ebApiKey,
          OrganizationId: ebOrgId,
          IsActive: Boolean(ebApiKey),
        }),
        ticketingService.saveIntegration({
          Platform: 'ticketweb',
          ApiKey: twApiKey,
          VenueId: twVenueId,
          IsActive: Boolean(twApiKey),
        }),
        ticketingService.saveIntegration({
          Platform: 'square',
          ApiKey: sqApiKey,
          LocationId: sqLocationId,
          ApplicationId: sqAppId,
          IsActive: Boolean(sqApiKey || sqLocationId),
        }),
      ]);

      setMessage({ type: 'success', text: 'Ticketing API settings saved successfully.' });
      await loadAllData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings.' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const filteredShows = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return summaries.filter((s) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          s.ShowTypeName.toLowerCase().includes(q) ||
          s.Venue.toLowerCase().includes(q) ||
          s.ShowDate.includes(q);
        if (!matches) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && s.TicketStatus !== statusFilter) {
        return false;
      }

      // Time filter
      if (timeFilter === 'upcoming' && s.ShowDate < today) return false;
      if (timeFilter === 'past' && s.ShowDate >= today) return false;

      // Platform isolation filter (when isolating individual platform)
      if (platformView === 'ticketweb' && s.TicketWebSold === 0 && !s.TicketWebEventUrl) return false;
      if (platformView === 'eventbrite' && s.EventbriteSold === 0 && !s.EventbriteEventUrl) return false;
      if (platformView === 'square' && s.SquareSold === 0 && !s.SquareEventUrl) return false;

      return true;
    });
  }, [summaries, searchQuery, statusFilter, timeFilter, platformView]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader text="Loading ticketing and sales data..." />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Global Sync */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎟️</span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ticketing & Sales Management</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time multi-platform sales, inventory capacities, and box-office reconciliation across TicketWeb, Eventbrite, and Square.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-700">TicketWeb, Eventbrite & Square</span>
          </div>

          <button
            type="button"
            onClick={() => handleSyncAll()}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-sm transition-colors disabled:opacity-50"
          >
            <span>{isSyncing ? '🔄' : '⚡'}</span>
            <span>{isSyncing ? 'Syncing...' : 'Sync All Sales'}</span>
          </button>
        </div>
      </div>

      {message && <Message type={message.type} text={message.text} onDismiss={() => setMessage(null)} />}

      {/* KPI Overview Cards with Individual Platform Selectors */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* Total Gross */}
        <div
          onClick={() => {
            setActiveTab('shows');
            setPlatformView('all');
          }}
          className={`cursor-pointer transition-all p-4 rounded-xl border shadow-sm col-span-2 md:col-span-1 ${
            platformView === 'all'
              ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-400'
              : 'bg-white border-slate-200 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-semibold uppercase tracking-wider ${platformView === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
              Total Gross
            </p>
            <span className="text-emerald-400 font-bold">💵</span>
          </div>
          <p className={`text-2xl font-black mt-2 ${platformView === 'all' ? 'text-white' : 'text-slate-900'}`}>
            ${stats.totalGrossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className={`text-xs mt-1.5 ${platformView === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
            {stats.totalTicketsSold.toLocaleString()} total tickets ({stats.overallFillRate}% full)
          </p>
        </div>

        {/* TicketWeb Box */}
        <div
          onClick={() => {
            setActiveTab('shows');
            setPlatformView(platformView === 'ticketweb' ? 'all' : 'ticketweb');
          }}
          className={`cursor-pointer transition-all p-4 rounded-xl border shadow-sm ${
            platformView === 'ticketweb'
              ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-300'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-600 inline-block"></span> TicketWeb
            </p>
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-100/70 px-1.5 py-0.5 rounded">
              {platformView === 'ticketweb' ? 'Viewing' : 'View'}
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">${stats.ticketWebRevenue.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1.5">
            <span className="font-semibold text-slate-700">{stats.ticketWebSold}</span> tickets sold
          </p>
        </div>

        {/* Eventbrite Box */}
        <div
          onClick={() => {
            setActiveTab('shows');
            setPlatformView(platformView === 'eventbrite' ? 'all' : 'eventbrite');
          }}
          className={`cursor-pointer transition-all p-4 rounded-xl border shadow-sm ${
            platformView === 'eventbrite'
              ? 'bg-orange-50/90 border-orange-500 ring-2 ring-orange-300'
              : 'bg-white border-slate-200 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-orange-700 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-500 inline-block"></span> Eventbrite
            </p>
            <span className="text-[10px] font-semibold text-orange-600 bg-orange-100/70 px-1.5 py-0.5 rounded">
              {platformView === 'eventbrite' ? 'Viewing' : 'View'}
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">${stats.eventbriteRevenue.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1.5">
            <span className="font-semibold text-slate-700">{stats.eventbriteSold}</span> tickets sold
          </p>
        </div>

        {/* Square Box */}
        <div
          onClick={() => {
            setActiveTab('shows');
            setPlatformView(platformView === 'square' ? 'all' : 'square');
          }}
          className={`cursor-pointer transition-all p-4 rounded-xl border shadow-sm ${
            platformView === 'square'
              ? 'bg-zinc-100 border-zinc-600 ring-2 ring-zinc-300'
              : 'bg-white border-slate-200 hover:border-zinc-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-900 inline-block"></span> Square
            </p>
            <span className="text-[10px] font-semibold text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded">
              {platformView === 'square' ? 'Viewing' : 'View'}
            </span>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">${stats.squareRevenue.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1.5">
            <span className="font-semibold text-slate-700">{stats.squareSold}</span> tickets sold
          </p>
        </div>

        {/* Box Office / Door */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Door Walk-ups</p>
            <span className="text-purple-600 font-bold">🚪</span>
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">${stats.doorRevenue.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1.5">
            <span className="font-semibold text-slate-700">{stats.doorSold}</span> walk-up tickets
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab('shows')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 ${
              activeTab === 'shows'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🎭</span>
            <span>Shows & Inventory</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
              {summaries.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>📊</span>
            <span>Revenue & Analytics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('boxoffice')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 ${
              activeTab === 'boxoffice'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🚪</span>
            <span>Box Office / Door Reconcile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>⚙️</span>
            <span>API & Platform Settings</span>
          </button>
        </nav>
      </div>

      {/* TAB 1: SHOWS & INVENTORY */}
      {activeTab === 'shows' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <span className="text-slate-400 pl-1">🔍</span>
              <input
                type="text"
                placeholder="Search show title, date, or venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm outline-none bg-transparent placeholder-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Platform view switcher pills */}
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPlatformView('all')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${platformView === 'all' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600'}`}
                >
                  All Platforms
                </button>
                <button
                  type="button"
                  onClick={() => setPlatformView('ticketweb')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${platformView === 'ticketweb' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-600'}`}
                >
                  TicketWeb
                </button>
                <button
                  type="button"
                  onClick={() => setPlatformView('eventbrite')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${platformView === 'eventbrite' ? 'bg-orange-600 text-white font-bold shadow-xs' : 'text-slate-600'}`}
                >
                  Eventbrite
                </button>
                <button
                  type="button"
                  onClick={() => setPlatformView('square')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${platformView === 'square' ? 'bg-slate-900 text-white font-bold shadow-xs' : 'text-slate-600'}`}
                >
                  Square
                </button>
              </div>

              {/* Time filter */}
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTimeFilter('upcoming')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${timeFilter === 'upcoming' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'}`}
                >
                  Upcoming
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('past')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${timeFilter === 'past' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'}`}
                >
                  Past
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${timeFilter === 'all' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'}`}
                >
                  All
                </button>
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium"
              >
                <option value="all">All Ticket Statuses</option>
                <option value="open">Open for Sale</option>
                <option value="sold_out">Sold Out</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>

          {/* Show Inventory Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Show & Venue</th>
                    <th className="py-3 px-4">Sales Progress</th>
                    {(platformView === 'all' || platformView === 'ticketweb') && (
                      <th className="py-3 px-4 text-center bg-blue-50/40">TicketWeb</th>
                    )}
                    {(platformView === 'all' || platformView === 'eventbrite') && (
                      <th className="py-3 px-4 text-center bg-orange-50/40">Eventbrite</th>
                    )}
                    {(platformView === 'all' || platformView === 'square') && (
                      <th className="py-3 px-4 text-center bg-zinc-50/60">Square</th>
                    )}
                    {platformView === 'all' && (
                      <th className="py-3 px-4 text-center">Door Walk-ups</th>
                    )}
                    <th className="py-3 px-4 text-right">
                      {platformView === 'all' ? 'Gross Rev' : `${platformView.toUpperCase()} Rev`}
                    </th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredShows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500">
                        No shows match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredShows.map((show) => {
                      const fillPct = show.TotalCapacity > 0 ? Math.round((show.TotalSold / show.TotalCapacity) * 100) : 0;
                      const displayedRev =
                        platformView === 'ticketweb'
                          ? show.TicketWebRevenue
                          : platformView === 'eventbrite'
                          ? show.EventbriteRevenue
                          : platformView === 'square'
                          ? show.SquareRevenue
                          : show.TotalGrossRevenue;

                      return (
                        <tr key={show.ShowID} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{show.ShowDate}</div>
                            <div className="text-xs text-slate-500">{show.ShowTime.slice(0, 5)}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-900">{show.ShowTypeName}</div>
                            <div className="text-xs text-slate-500">{show.Venue}</div>
                          </td>

                          <td className="py-3.5 px-4 min-w-[170px]">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-slate-800">{show.TotalSold} / {show.TotalCapacity}</span>
                              <span className="text-slate-500">{fillPct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  fillPct >= 95 ? 'bg-red-500' : fillPct >= 75 ? 'bg-amber-500' : 'bg-blue-600'
                                }`}
                                style={{ width: `${Math.min(100, fillPct)}%` }}
                              />
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                              {show.RemainingCapacity} remaining ({show.TotalHeld} held)
                            </div>
                          </td>

                          {/* TicketWeb */}
                          {(platformView === 'all' || platformView === 'ticketweb') && (
                            <td className="py-3.5 px-4 text-center whitespace-nowrap bg-blue-50/20">
                              <div className="font-semibold text-blue-900">{show.TicketWebSold} sold</div>
                              <div className="text-xs text-slate-500">${show.TicketWebRevenue}</div>
                              {show.TicketWebEventUrl && (
                                <a
                                  href={show.TicketWebEventUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-block mt-0.5 text-[11px] text-blue-600 hover:underline font-medium"
                                >
                                  View TW ↗
                                </a>
                              )}
                            </td>
                          )}

                          {/* Eventbrite */}
                          {(platformView === 'all' || platformView === 'eventbrite') && (
                            <td className="py-3.5 px-4 text-center whitespace-nowrap bg-orange-50/20">
                              <div className="font-semibold text-orange-950">{show.EventbriteSold} sold</div>
                              <div className="text-xs text-slate-500">${show.EventbriteRevenue}</div>
                              {show.EventbriteEventUrl && (
                                <a
                                  href={show.EventbriteEventUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-block mt-0.5 text-[11px] text-orange-600 hover:underline font-medium"
                                >
                                  View EB ↗
                                </a>
                              )}
                            </td>
                          )}

                          {/* Square */}
                          {(platformView === 'all' || platformView === 'square') && (
                            <td className="py-3.5 px-4 text-center whitespace-nowrap bg-zinc-50/40">
                              <div className="font-semibold text-slate-900">{show.SquareSold} sold</div>
                              <div className="text-xs text-slate-500">${show.SquareRevenue}</div>
                              {show.SquareEventUrl && (
                                <a
                                  href={show.SquareEventUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-block mt-0.5 text-[11px] text-slate-800 hover:underline font-medium"
                                >
                                  View SQ ↗
                                </a>
                              )}
                            </td>
                          )}

                          {/* Door Walk-up */}
                          {platformView === 'all' && (
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="font-semibold text-purple-700">{show.DoorWalkupCount} sold</div>
                              <div className="text-xs text-slate-500">${show.DoorWalkupRevenue}</div>
                            </td>
                          )}

                          {/* Revenue */}
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                            ${displayedRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                                show.TicketStatus === 'sold_out'
                                  ? 'bg-red-100 text-red-800'
                                  : show.TicketStatus === 'paused'
                                  ? 'bg-amber-100 text-amber-800'
                                  : show.TicketStatus === 'closed'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {show.TicketStatus === 'sold_out'
                                ? 'Sold Out'
                                : show.TicketStatus === 'paused'
                                ? 'Paused'
                                : show.TicketStatus === 'closed'
                                ? 'Closed'
                                : 'Open'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingShow(show);
                                  setEditCapacity(show.TotalCapacity);
                                  setEditHeld(show.TotalHeld);
                                  setEditStatus(show.TicketStatus);
                                  setEditTWUrl(show.TicketWebEventUrl || '');
                                  setEditEBUrl(show.EventbriteEventUrl || '');
                                  setEditSQUrl(show.SquareEventUrl || '');
                                }}
                                className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                              >
                                Manage
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setReconcileShow(show);
                                  setDoorWalkups(show.DoorWalkupCount);
                                  setCheckedInCount(show.CheckedInCount);
                                }}
                                className="px-2.5 py-1 text-xs font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md transition-colors"
                              >
                                Door
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REVENUE & ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Platform Comparison */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Platform Revenue Breakdown</h3>
              <p className="text-xs text-slate-500">Distribution of gross sales between TicketWeb, Eventbrite, and Door sales.</p>

              <div className="space-y-4 pt-2">
                {/* TicketWeb */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1.5 text-blue-700">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-600 inline-block"></span> TicketWeb
                    </span>
                    <span className="text-slate-800">
                      ${stats.ticketWebRevenue.toLocaleString()} ({stats.ticketWebSold} tickets)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{
                        width: `${stats.totalGrossRevenue > 0 ? (stats.ticketWebRevenue / stats.totalGrossRevenue) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Eventbrite */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1.5 text-orange-700">
                      <span className="h-2.5 w-2.5 rounded-full bg-orange-500 inline-block"></span> Eventbrite
                    </span>
                    <span className="text-slate-800">
                      ${stats.eventbriteRevenue.toLocaleString()} ({stats.eventbriteSold} tickets)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full"
                      style={{
                        width: `${stats.totalGrossRevenue > 0 ? (stats.eventbriteRevenue / stats.totalGrossRevenue) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Square */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-900 inline-block"></span> Square
                    </span>
                    <span className="text-slate-800">
                      ${stats.squareRevenue.toLocaleString()} ({stats.squareSold} tickets)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-slate-900 rounded-full"
                      style={{
                        width: `${stats.totalGrossRevenue > 0 ? (stats.squareRevenue / stats.totalGrossRevenue) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Door / Box Office */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="flex items-center gap-1.5 text-purple-700">
                      <span className="h-2.5 w-2.5 rounded-full bg-purple-600 inline-block"></span> Box Office / Door Walk-ups
                    </span>
                    <span className="text-slate-800">
                      ${stats.doorRevenue.toLocaleString()} ({stats.doorSold} tickets)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-purple-600 rounded-full"
                      style={{
                        width: `${stats.totalGrossRevenue > 0 ? (stats.doorRevenue / stats.totalGrossRevenue) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Indicators */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900">Key Sales Metrics</h3>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="text-xs font-medium text-slate-500">Average Ticket Price</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    ${stats.totalTicketsSold > 0 ? (stats.totalGrossRevenue / stats.totalTicketsSold).toFixed(2) : '0.00'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Across all tiers</div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="text-xs font-medium text-slate-500">Sold-Out Shows</div>
                  <div className="text-xl font-bold text-emerald-600 mt-1">{stats.soldOutShowsCount}</div>
                  <div className="text-[11px] text-slate-400 mt-1">At 100% capacity</div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="text-xs font-medium text-slate-500">Upcoming Shows Scheduled</div>
                  <div className="text-xl font-bold text-blue-600 mt-1">{stats.upcomingShowsCount}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Currently open for sales</div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="text-xs font-medium text-slate-500">Door Walk-up Ratio</div>
                  <div className="text-xl font-bold text-purple-600 mt-1">
                    {stats.totalTicketsSold > 0 ? Math.round((stats.doorSold / stats.totalTicketsSold) * 100) : 0}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Of total audience</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BOX OFFICE / DOOR RECONCILE */}
      {activeTab === 'boxoffice' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Box Office & Door Reconcile</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select any upcoming or tonight's show to record walk-up ticket sales, track door check-in counts, and balance tickets against capacity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaries.slice(0, 6).map((show) => (
              <div
                key={show.ShowID}
                className="border border-slate-200 rounded-xl p-4 hover:border-blue-400 transition-colors bg-slate-50/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                    <span>{show.ShowDate}</span>
                    <span>{show.ShowTime.slice(0, 5)}</span>
                  </div>
                  <h4 className="font-bold text-slate-900">{show.ShowTypeName}</h4>
                  <p className="text-xs text-slate-600 mb-3">{show.Venue}</p>

                  <div className="space-y-1 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                    <div className="flex justify-between">
                      <span>Online Presold:</span>
                      <span className="font-semibold">{show.TicketWebSold + show.EventbriteSold + show.SquareSold}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Walk-ups at Door:</span>
                      <span className="font-semibold text-purple-700">{show.DoorWalkupCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Checked-in:</span>
                      <span className="font-semibold text-emerald-700">{show.CheckedInCount}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-1 font-bold text-slate-900">
                      <span>Seats Left:</span>
                      <span className={show.RemainingCapacity <= 5 ? 'text-red-600' : 'text-slate-800'}>
                        {show.RemainingCapacity}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setReconcileShow(show);
                    setDoorWalkups(show.DoorWalkupCount);
                    setCheckedInCount(show.CheckedInCount);
                  }}
                  className="mt-4 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  Reconcile Door Sales
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: API & PLATFORM SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 max-w-3xl">
          <div>
            <h3 className="text-base font-bold text-slate-900">Ticketing API Credentials</h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure private API tokens and organizer identifiers for automatic event synchronization.
            </p>
          </div>

          <div className="space-y-6 divide-y divide-slate-100">
            {/* Eventbrite Credentials */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎟️</span>
                <h4 className="font-bold text-slate-900 text-sm">Eventbrite API (v3)</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Private OAuth Token</label>
                  <input
                    type="password"
                    value={ebApiKey}
                    onChange={(e) => setEbApiKey(e.target.value)}
                    placeholder="e.g. 7XYZABC..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Organization ID</label>
                  <input
                    type="text"
                    value={ebOrgId}
                    onChange={(e) => setEbOrgId(e.target.value)}
                    placeholder="e.g. 1098273645"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* TicketWeb Credentials */}
            <div className="pt-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎫</span>
                <h4 className="font-bold text-slate-900 text-sm">TicketWeb / Ticketmaster Partner Feed</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">API Key / Client ID</label>
                  <input
                    type="password"
                    value={twApiKey}
                    onChange={(e) => setTwApiKey(e.target.value)}
                    placeholder="e.g. tw_partner_api_key..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Venue / Client ID</label>
                  <input
                    type="text"
                    value={twVenueId}
                    onChange={(e) => setTwVenueId(e.target.value)}
                    placeholder="e.g. jtf_stage_1"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Square Credentials */}
            <div className="pt-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🟩</span>
                <h4 className="font-bold text-slate-900 text-sm">Square Payments & Orders API</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Square Access Token</label>
                  <input
                    type="password"
                    value={sqApiKey}
                    onChange={(e) => setSqApiKey(e.target.value)}
                    placeholder="e.g. sq0atp-sample-token..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location ID</label>
                  <input
                    type="text"
                    value={sqLocationId}
                    onChange={(e) => setSqLocationId(e.target.value)}
                    placeholder="e.g. L_JTF_MAINSTAGE"
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Application ID</label>
                  <input
                    type="text"
                    value={sqAppId}
                    onChange={(e) => setSqAppId(e.target.value)}
                    placeholder="e.g. sq0idp-..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSavingSettings}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              {isSavingSettings ? 'Saving...' : 'Save API Settings'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: MANAGE CAPACITY & AVAILABILITY */}
      {editingShow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Manage Ticket Availability</h3>
                <p className="text-xs text-slate-500">
                  {editingShow.ShowTypeName} • {editingShow.ShowDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingShow(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Total Venue Capacity (Seats)</label>
                <input
                  type="number"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reserved / Comp Holdbacks</label>
                <input
                  type="number"
                  value={editHeld}
                  onChange={(e) => setEditHeld(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1">Seats reserved for VIPs, guest list, or crew.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sale Availability Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm font-medium"
                >
                  <option value="open">Open for Public Sales</option>
                  <option value="paused">Paused (Temporarily Hold Sales)</option>
                  <option value="sold_out">Mark Sold Out</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">TicketWeb Link</label>
                  <input
                    type="url"
                    value={editTWUrl}
                    onChange={(e) => setEditTWUrl(e.target.value)}
                    placeholder="https://www.ticketweb.com/..."
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Eventbrite Link</label>
                  <input
                    type="url"
                    value={editEBUrl}
                    onChange={(e) => setEditEBUrl(e.target.value)}
                    placeholder="https://www.eventbrite.com/..."
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Square Link</label>
                  <input
                    type="url"
                    value={editSQUrl}
                    onChange={(e) => setEditSQUrl(e.target.value)}
                    placeholder="https://justthefunny.com/..."
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingShow(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveShowEdit}
                disabled={isSavingEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {isSavingEdit ? 'Saving...' : 'Save Availability Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DOOR & WALK-UP RECONCILIATION */}
      {reconcileShow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Box Office Door Reconcile</h3>
                <p className="text-xs text-slate-500">
                  {reconcileShow.ShowTypeName} • {reconcileShow.ShowDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReconcileShow(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600">Online Presale Total:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {reconcileShow.TicketWebSold + reconcileShow.EventbriteSold + reconcileShow.SquareSold} tickets
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Door Walk-up Admissions (Cash / Card)</label>
                <input
                  type="number"
                  min="0"
                  value={doorWalkups}
                  onChange={(e) => setDoorWalkups(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Walk-up Price per Ticket ($)</label>
                <input
                  type="number"
                  min="0"
                  value={doorWalkupPrice}
                  onChange={(e) => setDoorWalkupPrice(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Estimated Walk-up Intake: <span className="font-bold text-slate-700">${doorWalkups * doorWalkupPrice}</span>
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Actual Checked-In Attendance</label>
                <input
                  type="number"
                  min="0"
                  value={checkedInCount}
                  onChange={(e) => setCheckedInCount(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm font-semibold"
                />
                <p className="text-[11px] text-slate-400 mt-1">Headcount of patrons scanned or checked off at the door.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReconcileShow(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDoorReconcile}
                disabled={isSavingReconcile}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {isSavingReconcile ? 'Saving...' : 'Record Door Reconcile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { ShowCard } from '../components/shows/ShowCard';
import { ShowEditModal } from '../components/shows/ShowEditModal';
import { ShowManagementModal } from '../components/shows/ShowManagementModal';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { PageType, ProgramCategory, JtfPresentsOpenDate, JtfPresentsRequest, ShowWithDetails } from '../types';
import { supabaseService } from '../services/supabaseService';

type FilterType = 'all' | 'next-up' | 'upcoming' | 'completed';
type CategoryFilterType = 'all' | ProgramCategory;

interface ShowsProps {
  onNavigate?: (page: PageType) => void;
}

export const Shows: React.FC<ShowsProps> = ({ onNavigate }) => {
  const [shows, setShows] = useState<ShowWithDetails[]>([]);
  const [filteredShows, setFilteredShows] = useState<ShowWithDetails[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showEditorOpen, setShowEditorOpen] = useState(false);
  const [showManagementOpen, setShowManagementOpen] = useState(false);
  const [selectedShow, setSelectedShow] = useState<ShowWithDetails | null>(null);
  const [jtfRequests, setJtfRequests] = useState<JtfPresentsRequest[]>([]);
  const [jtfOpenDates, setJtfOpenDates] = useState<JtfPresentsOpenDate[]>([]);
  const [jtfWorkflowLoading, setJtfWorkflowLoading] = useState(true);
  const [jtfWorkflowSaving, setJtfWorkflowSaving] = useState(false);
  const [jtfSlotDate, setJtfSlotDate] = useState('');
  const [jtfSlotNote, setJtfSlotNote] = useState('');

  const getComputedStatus = (show: ShowWithDetails): 'Next Up' | 'Upcoming' | 'Completed' => {
    const rawDate = String(show.ShowDate || '').slice(0, 10);
    const showDate = new Date(`${rawDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    if (!Number.isNaN(showDate.getTime())) {
      if (showDate.getTime() < today.getTime()) return 'Completed';
      if (showDate.getTime() <= nextWeek.getTime()) return 'Next Up';
      return 'Upcoming';
    }

    const status = String(show.Status || '').toLowerCase();
    if (status === 'completed') return 'Completed';
    if (status === 'in progress' || status === 'in-progress' || status === 'next up' || status === 'next-up') return 'Next Up';
    return 'Upcoming';
  };

  useEffect(() => {
    loadShows();
    loadJtfWorkflow();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [shows, filter, categoryFilter]);

  const getProgramCategory = (show: ShowWithDetails): ProgramCategory => {
    if (show.ProgramCategory === 'jtf_presents') {
      return 'jtf_presents';
    }

    const typeName = String(show.ShowTypeName || '').trim().toLowerCase();
    if (typeName === 'jtf presents') {
      return 'jtf_presents';
    }

    return 'standard';
  };

  const loadShows = async () => {
    setIsLoading(true);
    try {
      // Try to get enhanced show details first
      let response = await supabaseService.getShowsWithDetails();
      
      // If the enhanced function fails, fall back to basic getAllShows
      if (!response.success || !response.data) {
        console.log('getShowsWithDetails failed, falling back to getAllShows:', response.error);
        response = await supabaseService.getAllShows();
        
        if (response.success && response.data) {
          // Transform basic show data to match ShowWithDetails structure
          const enhancedShows = response.data.map(show => ({
            ...show,
            ShowTypeName: `Type ${show.ShowTypeID}`,
            DirectorName: 'TBD',
            CastMembers: [],
            ProgramCategory: 'standard' as ProgramCategory,
          }));
          setShows(enhancedShows);
        } else {
          setMessage({ type: 'error', text: response.error || 'Failed to load shows' });
        }
      } else {
        setShows(response.data);
      }
    } catch (error) {
      console.error('Error loading shows:', error);
      setMessage({ type: 'error', text: 'Error loading shows data' });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...shows];

    // Apply status filter
    if (filter !== 'all') {
      const statusMap: Record<FilterType, string> = {
        'all': '',
        'next-up': 'Next Up',
        'upcoming': 'Upcoming',
        'completed': 'Completed'
      };
      filtered = filtered.filter(s => getComputedStatus(s) === statusMap[filter]);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(s => getProgramCategory(s) === categoryFilter);
    }

    setFilteredShows(filtered);
  };

  const getFilterCount = (filterType: FilterType): number => {
    if (filterType === 'all') return shows.length;
    const statusMap: Record<FilterType, string> = {
      'all': '',
      'next-up': 'Next Up',
      'upcoming': 'Upcoming',
      'completed': 'Completed'
    };
    return shows.filter(s => getComputedStatus(s) === statusMap[filterType]).length;
  };

  const getCategoryFilterCount = (target: CategoryFilterType): number => {
    if (target === 'all') return shows.length;
    return shows.filter(s => getProgramCategory(s) === target).length;
  };

  const loadJtfWorkflow = async () => {
    setJtfWorkflowLoading(true);
    try {
      const [requestsResponse, openDatesResponse] = await Promise.all([
        supabaseService.getJtfPresentsRequests(),
        supabaseService.getJtfPresentsOpenDates(),
      ]);

      if (requestsResponse.success && requestsResponse.data) {
        setJtfRequests(requestsResponse.data);
      } else {
        setJtfRequests([]);
      }

      if (openDatesResponse.success && openDatesResponse.data) {
        setJtfOpenDates(openDatesResponse.data);
      } else {
        setJtfOpenDates([]);
      }
    } catch (error) {
      console.error('Error loading JTF Presents workflow:', error);
      setMessage({ type: 'error', text: 'Error loading JTF Presents workflow' });
    } finally {
      setJtfWorkflowLoading(false);
    }
  };

  const handleApproveJtfRequest = async (requestId: string) => {
    setJtfWorkflowSaving(true);
    try {
      const response = await supabaseService.approveJtfPresentsRequest(requestId);
      if (!response.success) {
        throw new Error(response.error || 'Unable to approve request');
      }

      setMessage({ type: 'success', text: 'JTF Presents request approved and converted into a show.' });
      await Promise.all([loadShows(), loadJtfWorkflow()]);
    } catch (error) {
      console.error('Error approving JTF Presents request:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to approve request' });
    } finally {
      setJtfWorkflowSaving(false);
    }
  };

  const handleRejectJtfRequest = async (requestId: string) => {
    const rejectionNote = window.prompt('Optional rejection note');
    setJtfWorkflowSaving(true);
    try {
      const response = await supabaseService.rejectJtfPresentsRequest(requestId, null, rejectionNote || undefined);
      if (!response.success) {
        throw new Error(response.error || 'Unable to reject request');
      }

      setMessage({ type: 'success', text: 'JTF Presents request rejected.' });
      await loadJtfWorkflow();
    } catch (error) {
      console.error('Error rejecting JTF Presents request:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to reject request' });
    } finally {
      setJtfWorkflowSaving(false);
    }
  };

  const handleSaveJtfSlot = async (slotDate: string, isOpen: boolean, note?: string | null) => {
    setJtfWorkflowSaving(true);
    try {
      const response = await supabaseService.upsertJtfPresentsOpenDate(slotDate, isOpen, note || null, null);
      if (!response.success) {
        throw new Error(response.error || 'Unable to save slot');
      }

      setMessage({ type: 'success', text: `JTF Presents slot ${isOpen ? 'opened' : 'closed'} for ${slotDate}.` });
      setJtfSlotDate('');
      setJtfSlotNote('');
      await loadJtfWorkflow();
    } catch (error) {
      console.error('Error saving JTF Presents slot:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Unable to save slot' });
    } finally {
      setJtfWorkflowSaving(false);
    }
  };

  const filteredJtfShows = filteredShows.filter(show => getProgramCategory(show) === 'jtf_presents');
  const filteredStandardShows = filteredShows.filter(show => getProgramCategory(show) === 'standard');

  const handleManageCast = (show: ShowWithDetails) => {
    setSelectedShow(show);
    setShowManagementOpen(true);
  };

  const handleAddShow = () => {
    setSelectedShow(null);
    setShowEditorOpen(true);
  };

  if (isLoading) {
    return <Loader text="Loading shows..." />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 sm:mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shows</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate?.('cast')}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Go to Cast Management
          </button>
          <button
            onClick={() => onNavigate?.('crew')}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            View Crew Assignments
          </button>
          <button
            onClick={() => onNavigate?.('bartenders')}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            View Bartenders
          </button>
          <button
            onClick={handleAddShow}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Add New Show
          </button>
        </div>
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

      <section className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">JTF Presents Workflow</h2>
            <p className="text-sm text-gray-600">Review cast requests and manage the Friday slots they can request from.</p>
          </div>
          <span className="text-sm font-medium text-indigo-700">
            {jtfWorkflowLoading ? 'Loading...' : `${jtfRequests.length} requests / ${jtfOpenDates.length} slots`}
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-lg border border-white/70 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="font-semibold text-gray-900">Pending Requests</h3>
              <span className="text-xs font-medium text-gray-500">Cast-submitted proposals</span>
            </div>
            {jtfWorkflowLoading ? (
              <div className="text-sm text-gray-500">Loading requests...</div>
            ) : jtfRequests.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                No pending JTF Presents requests.
              </div>
            ) : (
              <div className="space-y-3 max-h-[28rem] overflow-auto pr-1">
                {jtfRequests.map((request) => (
                  <article key={request.RequestID} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{request.RequestedShowName}</h4>
                        <p className="text-xs text-gray-500">Requested for {request.RequestedShowDate}</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                        {request.RequestStatus}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.RequestedShowDetails}</p>
                    {request.RequestedPerformers && <p className="mt-2 text-xs text-gray-600">Performers: {request.RequestedPerformers}</p>}
                    {request.RequestedTech && <p className="text-xs text-gray-600">Tech: {request.RequestedTech}</p>}
                    {request.RequestedCrewNotes && <p className="text-xs text-gray-600">Crew: {request.RequestedCrewNotes}</p>}
                    <p className="mt-2 text-xs text-gray-500">Submitted {new Date(request.CreatedAt).toLocaleString()}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleApproveJtfRequest(request.RequestID)}
                        disabled={jtfWorkflowSaving}
                        className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRejectJtfRequest(request.RequestID)}
                        disabled={jtfWorkflowSaving}
                        className="px-3 py-2 rounded-lg bg-white text-sm text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-white/70 bg-white p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-gray-900">Friday Slots</h3>
              <span className="text-xs font-medium text-gray-500">Open dates available to request</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className="sm:col-span-1 text-sm font-medium text-gray-700">
                Date
                <input
                  type="date"
                  value={jtfSlotDate}
                  onChange={(event) => setJtfSlotDate(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="sm:col-span-2 text-sm font-medium text-gray-700">
                Note
                <input
                  type="text"
                  value={jtfSlotNote}
                  onChange={(event) => setJtfSlotNote(event.target.value)}
                  placeholder="Optional note about the slot"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleSaveJtfSlot(jtfSlotDate, true, jtfSlotNote)}
                disabled={jtfWorkflowSaving || !jtfSlotDate}
                className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-60"
              >
                Open Slot
              </button>
              <button
                type="button"
                onClick={() => void handleSaveJtfSlot(jtfSlotDate, false, jtfSlotNote)}
                disabled={jtfWorkflowSaving || !jtfSlotDate}
                className="px-3 py-2 rounded-lg bg-white text-sm text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
              >
                Close Slot
              </button>
            </div>

            <div className="space-y-2 max-h-[22rem] overflow-auto pr-1">
              {jtfWorkflowLoading ? (
                <div className="text-sm text-gray-500">Loading slots...</div>
              ) : jtfOpenDates.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                  No Friday slots have been configured yet.
                </div>
              ) : (
                jtfOpenDates.map((slot) => (
                  <div key={slot.SlotDate} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <div>
                      <p className="font-medium text-gray-900">{slot.SlotDate}</p>
                      <p className="text-xs text-gray-500">{slot.Note || 'No note added'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${slot.IsOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'}`}>
                        {slot.IsOpen ? 'Open' : 'Closed'}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleSaveJtfSlot(slot.SlotDate, !slot.IsOpen, slot.Note)}
                        disabled={jtfWorkflowSaving}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-white disabled:opacity-60"
                      >
                        {slot.IsOpen ? 'Close' : 'Reopen'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="mb-4 sm:mb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              categoryFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Programs ({getCategoryFilterCount('all')})
          </button>
          <button
            onClick={() => setCategoryFilter('jtf_presents')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              categoryFilter === 'jtf_presents'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            JTF Presents ({getCategoryFilterCount('jtf_presents')})
          </button>
          <button
            onClick={() => setCategoryFilter('standard')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              categoryFilter === 'standard'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Standard ({getCategoryFilterCount('standard')})
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Shows ({getFilterCount('all')})
          </button>
          <button
            onClick={() => setFilter('next-up')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'next-up'
                ? 'bg-yellow-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Next Up ({getFilterCount('next-up')})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'upcoming'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Upcoming ({getFilterCount('upcoming')})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-gray-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Completed ({getFilterCount('completed')})
          </button>
        </div>
      </div>

      {categoryFilter === 'all' ? (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">JTF Presents</h2>
                <p className="text-sm text-gray-500">Dedicated shows with attendance estimates and notes-first planning.</p>
              </div>
              <span className="text-sm font-medium text-indigo-700">{filteredJtfShows.length} show{filteredJtfShows.length === 1 ? '' : 's'}</span>
            </div>
            {filteredJtfShows.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {filteredJtfShows.map((show) => (
                  <ShowCard
                    key={show.ShowID}
                    show={show}
                    onManageCast={() => handleManageCast(show)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
                No JTF Presents shows found.
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Standard Shows</h2>
                <p className="text-sm text-gray-500">All remaining production and recurring show entries.</p>
              </div>
              <span className="text-sm font-medium text-gray-700">{filteredStandardShows.length} show{filteredStandardShows.length === 1 ? '' : 's'}</span>
            </div>
            {filteredStandardShows.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {filteredStandardShows.map((show) => (
                  <ShowCard
                    key={show.ShowID}
                    show={show}
                    onManageCast={() => handleManageCast(show)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
                No standard shows found.
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {filteredShows.map((show) => (
            <ShowCard
              key={show.ShowID}
              show={show}
              onManageCast={() => handleManageCast(show)}
            />
          ))}
        </div>
      )}

      <ShowEditModal
        isOpen={showEditorOpen}
        show={selectedShow}
        onClose={() => setShowEditorOpen(false)}
        onSaved={() => {
          setShowEditorOpen(false);
          loadShows();
        }}
      />

      {selectedShow && (
        <ShowManagementModal
          isOpen={showManagementOpen}
          show={selectedShow}
          onClose={() => setShowManagementOpen(false)}
          onSaved={() => {
            setShowManagementOpen(false);
            loadShows();
          }}
        />
      )}
    </div>
  );
};

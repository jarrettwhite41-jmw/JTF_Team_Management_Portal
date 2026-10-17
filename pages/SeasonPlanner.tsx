import React, { useState, useEffect, useMemo } from 'react';
import {
  plannerService,
  PlanningSeason,
  PlanningItem,
  ClassInstructorAvailability,
  ConflictCheckResult,
} from '../services/plannerService';
import { supabaseService } from '../services/supabaseService';
import { Personnel, SpecialGuest } from '../types';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';

export const SeasonPlanner: React.FC = () => {
  const [seasons, setSeasons] = useState<PlanningSeason[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<PlanningSeason | null>(null);
  const [items, setItems] = useState<PlanningItem[]>([]);
  const [instructorsAvail, setInstructorsAvail] = useState<ClassInstructorAvailability[]>([]);
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [specialGuests, setSpecialGuests] = useState<SpecialGuest[]>([]);
  const [rooms, setRooms] = useState<Array<{ RoomID: number; RoomName: string }>>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters & State
  const [filterType, setFilterType] = useState<'all' | 'class' | 'show' | 'workshop'>('all');
  const [isNewSeasonModalOpen, setIsNewSeasonModalOpen] = useState(false);
  const [newSeasonForm, setNewSeasonForm] = useState({
    season_name: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    notes: '',
  });

  // Edit / Add Item Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<PlanningItem> | null>(null);
  const [itemConflictAlerts, setItemConflictAlerts] = useState<ConflictCheckResult | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const [seasonList, teachersRes, guestsRes, availList] = await Promise.all([
        plannerService.getSeasons(),
        supabaseService.getAllTeachers(),
        supabaseService.getAllSpecialGuests(),
        plannerService.getInstructorAvailability(),
      ]);

      setSeasons(seasonList);
      if (teachersRes.success && teachersRes.data) {
        setPersonnelList(teachersRes.data as any);
      }
      if (guestsRes.success && guestsRes.data) {
        setSpecialGuests(guestsRes.data);
      }
      setInstructorsAvail(availList);

      // Default rooms
      setRooms([
        { RoomID: 1, RoomName: 'Main Stage' },
        { RoomID: 2, RoomName: 'Second Stage' },
        { RoomID: 3, RoomName: 'Classroom A' },
        { RoomID: 4, RoomName: 'Green Room' },
      ]);

      // Select active or first season
      if (seasonList.length > 0) {
        const active = seasonList.find(s => s.status === 'draft' || s.status === 'review') || seasonList[0];
        setSelectedSeason(active);
        await loadSeasonItems(active.season_id);
      }
    } catch {
      setMessage({ type: 'error', text: 'Error loading season planner data.' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSeasonItems = async (seasonId: string) => {
    const list = await plannerService.getItemsBySeason(seasonId);
    setItems(list);
  };

  const handleSelectSeason = async (season: PlanningSeason) => {
    setSelectedSeason(season);
    setIsLoading(true);
    await loadSeasonItems(season.season_id);
    setIsLoading(false);
  };

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonForm.season_name.trim()) return;

    setIsLoading(true);
    const created = await plannerService.createSeason({
      season_name: newSeasonForm.season_name.trim(),
      start_date: newSeasonForm.start_date,
      end_date: newSeasonForm.end_date,
      status: 'draft',
      notes: newSeasonForm.notes,
    });

    if (created) {
      setSeasons([created, ...seasons]);
      setSelectedSeason(created);
      setItems([]);
      setIsNewSeasonModalOpen(false);
      setMessage({ type: 'success', text: `Created new planning season "${created.season_name}".` });
    } else {
      setMessage({ type: 'error', text: 'Failed to create planning season.' });
    }
    setIsLoading(false);
  };

  // Open item modal for Add or Edit
  const handleOpenItemModal = (item?: PlanningItem) => {
    if (item) {
      setEditingItem({ ...item });
    } else {
      setEditingItem({
        season_id: selectedSeason?.season_id,
        item_type: 'class',
        title: '',
        subtitle_or_level: 'Level 1 (Fundamentals)',
        start_date: selectedSeason?.start_date || new Date().toISOString().slice(0, 10),
        end_date: selectedSeason?.end_date || new Date().toISOString().slice(0, 10),
        start_time: '19:00:00',
        end_time: '21:30:00',
        day_of_week: 'Tuesday',
        room_id: 1,
        venue_name: 'Main Stage',
        capacity: 16,
        ticket_or_tuition_rate: 225,
        is_public_ticketed: true,
        validation_status: 'clean',
      });
    }
    setItemConflictAlerts(null);
    setIsItemModalOpen(true);
  };

  // Validate item before save
  const handleRunValidation = async () => {
    if (!editingItem) return;
    const result = await plannerService.validateDraftItem(editingItem, items, instructorsAvail);
    setItemConflictAlerts(result);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !selectedSeason) return;

    setIsSavingItem(true);
    // Auto-validate
    const conflictRes = await plannerService.validateDraftItem(editingItem, items, instructorsAvail);

    const payload: Partial<PlanningItem> = {
      ...editingItem,
      season_id: selectedSeason.season_id,
      validation_status: conflictRes.severity,
      conflict_details: conflictRes.messages.length > 0 ? { messages: conflictRes.messages } : null,
    };

    const saved = await plannerService.savePlanningItem(payload);
    if (saved) {
      await loadSeasonItems(selectedSeason.season_id);
      setIsItemModalOpen(false);
      setEditingItem(null);
      setMessage({
        type: 'success',
        text: conflictRes.hasConflict
          ? `Saved with warnings: ${conflictRes.messages.join('; ')}`
          : `Item "${saved.title}" saved cleanly to draft plan.`,
      });
    } else {
      setMessage({ type: 'error', text: 'Error saving planning item.' });
    }
    setIsSavingItem(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item from the draft plan?')) return;
    const ok = await plannerService.deletePlanningItem(itemId);
    if (ok && selectedSeason) {
      await loadSeasonItems(selectedSeason.season_id);
      setMessage({ type: 'success', text: 'Draft item removed.' });
    }
  };

  // Batch Accept & Publish to Live
  const handlePublishSeason = async () => {
    if (!selectedSeason) return;
    if (!confirm(`Are you ready to accept and publish "${selectedSeason.season_name}"? This will create live Shows, Classes, and Workshops across the system.`)) return;

    setIsPublishing(true);
    setMessage(null);
    const result = await plannerService.publishSeason(selectedSeason.season_id);
    if (result.success) {
      setMessage({
        type: 'success',
        text: `Successfully published ${result.publishedCount} items to live production tables! Shows and Classes are now active across all portals.`,
      });
      await loadInitialData();
    } else {
      setMessage({
        type: 'error',
        text: `Published ${result.publishedCount} items with some errors: ${result.errors.join(', ')}`,
      });
    }
    setIsPublishing(false);
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    if (filterType === 'all') return items;
    return items.filter(i => i.item_type === filterType);
  }, [items, filterType]);

  const conflictsCount = items.filter(i => i.validation_status === 'conflict').length;
  const warningsCount = items.filter(i => i.validation_status === 'warning').length;

  if (isLoading) {
    return <Loader text="Loading Season & Curriculum Planner..." />;
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🗓️</span>
            <h1 className="text-2xl font-bold text-gray-900">Season & Curriculum Planner</h1>
            <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2.5 py-0.5 rounded-full">
              Staging Sandbox
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Draft, organize, and timeline conservatory classes, shows, and workshops with automated collision detection before committing to live production.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewSeasonModalOpen(true)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
          >
            + New Season
          </button>
          <button
            onClick={handlePublishSeason}
            disabled={isPublishing || !selectedSeason || items.length === 0 || conflictsCount > 0}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors shadow-sm flex items-center gap-1.5"
            title={conflictsCount > 0 ? 'Resolve room or personnel conflicts before publishing' : 'Publish all draft items to live tables'}
          >
            <span>🚀</span>
            <span>{isPublishing ? 'Publishing...' : 'Accept & Publish Season'}</span>
          </button>
        </div>
      </div>

      {message && (
        <Message
          type={message.type}
          message={message.text}
          onClose={() => setMessage(null)}
        />
      )}

      {/* Season Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Active Planning Session:
          </label>
          <select
            value={selectedSeason?.season_id || ''}
            onChange={(e) => {
              const s = seasons.find(x => x.season_id === e.target.value);
              if (s) handleSelectSeason(s);
            }}
            className="text-xs font-semibold bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 text-gray-900 focus:outline-none"
          >
            {seasons.map(s => (
              <option key={s.season_id} value={s.season_id}>
                {s.season_name} ({s.status.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {selectedSeason && (
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>📅 {selectedSeason.start_date} &rarr; {selectedSeason.end_date}</span>
            <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
              selectedSeason.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {selectedSeason.status}
            </span>
          </div>
        )}
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Draft Items Queued
          </span>
          <span className="text-xl font-bold text-gray-900">{items.length}</span>
          <span className="text-[11px] text-gray-400 block mt-0.5">Classes, Shows, Workshops</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">
            Conservatory Classes
          </span>
          <span className="text-xl font-bold text-blue-700">
            {items.filter(i => i.item_type === 'class').length}
          </span>
          <span className="text-[11px] text-blue-400 block mt-0.5">8-week cohorts</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider block">
            Shows & Workshops
          </span>
          <span className="text-xl font-bold text-purple-700">
            {items.filter(i => i.item_type === 'show' || i.item_type === 'workshop').length}
          </span>
          <span className="text-[11px] text-purple-400 block mt-0.5">Production events</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs">
          <span className={`text-[11px] font-semibold uppercase tracking-wider block ${
            conflictsCount > 0 ? 'text-red-600' : warningsCount > 0 ? 'text-amber-600' : 'text-emerald-600'
          }`}>
            Sanity & Conflict Check
          </span>
          <span className={`text-xl font-bold ${
            conflictsCount > 0 ? 'text-red-700' : warningsCount > 0 ? 'text-amber-700' : 'text-emerald-700'
          }`}>
            {conflictsCount > 0 ? `${conflictsCount} Conflicts` : warningsCount > 0 ? `${warningsCount} Warnings` : 'All Clean ✓'}
          </span>
          <span className="text-[11px] text-gray-400 block mt-0.5">
            {conflictsCount > 0 ? 'Blocking publication' : 'Ready for live commit'}
          </span>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-2">
          {(['all', 'class', 'show', 'workshop'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                filterType === type
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'All Types' : `${type}s`}
            </button>
          ))}
        </div>

        <button
          onClick={() => handleOpenItemModal()}
          className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs whitespace-nowrap"
        >
          + Add Draft Item
        </button>
      </div>

      {/* Items Table / Cards */}
      {filteredItems.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-gray-200 text-center text-gray-500 space-y-2">
          <p className="font-semibold text-gray-700">No planning items in this season yet.</p>
          <p className="text-xs">Click "+ Add Draft Item" to start scheduling classes, shows, or workshops.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Title & Subtitle</th>
                  <th className="py-3 px-3">Date / Day</th>
                  <th className="py-3 px-3">Time & Room</th>
                  <th className="py-3 px-3">Assigned Lead</th>
                  <th className="py-3 px-3">Status / Sanity</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.map(item => {
                  const leadPerson = personnelList.find(p => p.PersonnelID === item.primary_personnel_id);
                  const room = rooms.find(r => r.RoomID === item.room_id);

                  return (
                    <tr key={item.item_id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          item.item_type === 'class'
                            ? 'bg-blue-100 text-blue-800'
                            : item.item_type === 'show'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.item_type}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-900">{item.title}</div>
                        {item.subtitle_or_level && (
                          <div className="text-[11px] text-gray-500">{item.subtitle_or_level}</div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-gray-700">
                        {item.item_type === 'class' ? (
                          <div>
                            <span className="font-semibold">{item.day_of_week}s</span>
                            <span className="block text-[11px] text-gray-500">{item.start_date} &rarr; {item.end_date}</span>
                          </div>
                        ) : (
                          <div>{item.start_date}</div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-gray-700">
                        <div>{item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}</div>
                        <div className="text-[11px] text-gray-500 font-medium">📍 {room?.RoomName || item.venue_name || 'Main Stage'}</div>
                      </td>

                      <td className="py-3 px-3">
                        {leadPerson ? (
                          <span className="font-medium text-gray-900">
                            {leadPerson.FirstName} {leadPerson.LastName}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {item.validation_status === 'clean' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            ✓ Clean
                          </span>
                        ) : item.validation_status === 'warning' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200" title={item.conflict_details?.messages?.join('; ')}>
                            ⚠️ Notice
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200" title={item.conflict_details?.messages?.join('; ')}>
                            ✕ Conflict
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenItemModal(item)}
                            className="px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.item_id)}
                            className="px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ITEM ADD/EDIT MODAL */}
      {isItemModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-gray-900">
                {editingItem.item_id ? 'Edit Draft Planning Item' : 'Add Draft Item to Plan'}
              </h3>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Type Selector */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Item Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['class', 'show', 'workshop'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, item_type: t })}
                      className={`py-2 text-xs font-bold rounded-lg capitalize border transition-all ${
                        editingItem.item_type === t
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={editingItem.title || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                    placeholder="e.g. Level 1 Improv, Friday Night Live..."
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Subtitle / Level</label>
                  <input
                    type="text"
                    value={editingItem.subtitle_or_level || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, subtitle_or_level: e.target.value })}
                    placeholder="e.g. Fundamentals, Mainstage, Spanish..."
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 text-gray-900"
                  />
                </div>
              </div>

              {/* Date & Recurrence */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={editingItem.start_date || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, start_date: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">End Date (Class)</label>
                  <input
                    type="date"
                    value={editingItem.end_date || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, end_date: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Day of Week</label>
                  <select
                    value={editingItem.day_of_week || 'Tuesday'}
                    onChange={(e) => setEditingItem({ ...editingItem, day_of_week: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 text-gray-900"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time & Room */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={editingItem.start_time || '19:00'}
                    onChange={(e) => setEditingItem({ ...editingItem, start_time: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={editingItem.end_time || '21:30'}
                    onChange={(e) => setEditingItem({ ...editingItem, end_time: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Room Assignment</label>
                  <select
                    value={editingItem.room_id || 1}
                    onChange={(e) => setEditingItem({ ...editingItem, room_id: Number(e.target.value) })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 text-gray-900"
                  >
                    {rooms.map(r => (
                      <option key={r.RoomID} value={r.RoomID}>{r.RoomName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assigned Lead (Teacher / Director) */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Assigned Lead (Instructor or Director)
                </label>
                <select
                  value={editingItem.primary_personnel_id || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, primary_personnel_id: Number(e.target.value) || null })}
                  className="w-full text-xs border border-gray-300 rounded-lg p-2 text-gray-900"
                >
                  <option value="">-- Select Instructor / Director --</option>
                  {personnelList.map(p => {
                    const avail = instructorsAvail.find(a => a.personnel_id === p.PersonnelID && a.day_of_week === editingItem.day_of_week);
                    const tag = avail ? ` [${avail.availability_status.toUpperCase()}]` : '';
                    return (
                      <option key={p.PersonnelID} value={p.PersonnelID}>
                        {p.FirstName} {p.LastName}{tag}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Conflict Preview & Checker */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRunValidation}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  🔍 Run Real-Time Conflict & Blackout Check
                </button>

                {itemConflictAlerts && (
                  <div className={`mt-2 p-3 rounded-lg border text-xs ${
                    itemConflictAlerts.severity === 'conflict'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : itemConflictAlerts.severity === 'warning'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}>
                    {itemConflictAlerts.messages.length === 0 ? (
                      <div>✓ All timelines, rooms, and instructor preferences are completely clean!</div>
                    ) : (
                      <ul className="list-disc list-inside space-y-0.5">
                        {itemConflictAlerts.messages.map((m, idx) => (
                          <li key={idx}>{m}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingItem}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSavingItem ? 'Saving...' : 'Save Draft Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW SEASON MODAL */}
      {isNewSeasonModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-gray-900">Create New Planning Season</h3>
              <button
                type="button"
                onClick={() => setIsNewSeasonModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSeason} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Season Name</label>
                <input
                  type="text"
                  required
                  value={newSeasonForm.season_name}
                  onChange={(e) => setNewSeasonForm({ ...newSeasonForm, season_name: e.target.value })}
                  placeholder="e.g. Spring 2027 Mainstage & Conservatory"
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newSeasonForm.start_date}
                    onChange={(e) => setNewSeasonForm({ ...newSeasonForm, start_date: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newSeasonForm.end_date}
                    onChange={(e) => setNewSeasonForm({ ...newSeasonForm, end_date: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={newSeasonForm.notes}
                  onChange={(e) => setNewSeasonForm({ ...newSeasonForm, notes: e.target.value })}
                  placeholder="Goals, target student counts, dark weeks..."
                  className="w-full text-xs border border-gray-300 rounded-lg p-2 text-gray-900"
                />
              </div>

              <div className="border-t pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewSeasonModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
                >
                  Create Season
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { gasService } from '../services/googleAppsScript';
import { CorporateGig, CorporateGigPerformer, Personnel } from '../types';
import { Loader } from '../components/common/Loader';

export const CorporateGigs: React.FC = () => {
  const [gigs, setGigs] = useState<CorporateGig[]>([]);
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGig, setEditingGig] = useState<Partial<CorporateGig> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Performer selection within modal
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<number | ''>('');
  const [performerRole, setPerformerRole] = useState('Performer');
  const [performerPay, setPerformerPay] = useState<number | ''>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [gigsRes, personnelRes] = await Promise.all([
        gasService.getCorporateGigs(),
        gasService.getAllPersonnel(),
      ]);

      if (gigsRes.success && Array.isArray(gigsRes.data)) {
        setGigs(gigsRes.data);
      } else {
        setMessage({ type: 'error', text: gigsRes.error || 'Failed to load corporate gigs' });
      }

      if (personnelRes.success && Array.isArray(personnelRes.data)) {
        setPersonnelList(personnelRes.data.filter((p: Personnel) => p.IsActive !== false));
      }
    } catch {
      setMessage({ type: 'error', text: 'Error loading corporate gigs' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setEditingGig({
      ClientName: '',
      GigTitle: '',
      GigDate: new Date().toISOString().split('T')[0],
      GigTime: '',
      Location: '',
      LeadPersonnelID: null,
      Status: 'Confirmed',
      TotalClientFee: 0,
      Performers: [],
      InternalNotes: '',
    });
    setSelectedPersonnelId('');
    setPerformerRole('Performer');
    setPerformerPay('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (gig: CorporateGig) => {
    setEditingGig({ ...gig, Performers: [...(gig.Performers || [])] });
    setSelectedPersonnelId('');
    setPerformerRole('Performer');
    setPerformerPay('');
    setIsModalOpen(true);
  };

  const handleAddPerformer = () => {
    if (!selectedPersonnelId || !editingGig) return;
    const person = personnelList.find((p) => p.PersonnelID === Number(selectedPersonnelId));
    if (!person) return;

    // Check if already in list
    if (editingGig.Performers?.some((p) => p.PersonnelID === person.PersonnelID)) {
      alert('This performer is already added to this gig.');
      return;
    }

    const newPerformer: CorporateGigPerformer = {
      PersonnelID: person.PersonnelID,
      FullName: `${person.FirstName} ${person.LastName}`.trim(),
      Role: performerRole.trim() || 'Performer',
      PayoutAmount: typeof performerPay === 'number' ? performerPay : 0,
      PayoutStatus: 'Pending',
    };

    setEditingGig({
      ...editingGig,
      Performers: [...(editingGig.Performers || []), newPerformer],
    });

    setSelectedPersonnelId('');
    setPerformerRole('Performer');
    setPerformerPay('');
  };

  const handleRemovePerformer = (personnelId: number) => {
    if (!editingGig) return;
    setEditingGig({
      ...editingGig,
      Performers: (editingGig.Performers || []).filter((p) => p.PersonnelID !== personnelId),
    });
  };

  const handleTogglePayout = (personnelId: number) => {
    if (!editingGig) return;
    setEditingGig({
      ...editingGig,
      Performers: (editingGig.Performers || []).map((p) =>
        p.PersonnelID === personnelId
          ? { ...p, PayoutStatus: p.PayoutStatus === 'Paid' ? 'Pending' : 'Paid' }
          : p
      ),
    });
  };

  const handleSaveGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGig?.ClientName || !editingGig?.GigTitle || !editingGig?.GigDate) {
      alert('Please fill in Client Name, Event Title, and Date.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await gasService.saveCorporateGig(editingGig);
      if (res.success) {
        setMessage({ type: 'success', text: 'Corporate gig saved successfully.' });
        setIsModalOpen(false);
        setEditingGig(null);
        await loadData();
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to save corporate gig.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGig = async (gigId: string | number) => {
    if (!window.confirm('Are you sure you want to delete this corporate gig?')) return;
    try {
      const res = await gasService.deleteCorporateGig(Number(gigId));
      if (res.success) {
        setMessage({ type: 'success', text: 'Corporate gig deleted.' });
        setGigs((prev) => prev.filter((g) => g.GigID !== gigId));
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to delete gig.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error deleting corporate gig.' });
    }
  };

  const filteredGigs = gigs.filter((gig) => {
    const matchesSearch =
      gig.ClientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gig.GigTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (gig.Location && gig.Location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (gig.LeadName && gig.LeadName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      gig.Performers.some((p) => p.FullName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || gig.Status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Corporate Gigs & Private Events</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
              🔒 Internal Team Only
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Track private corporate bookings, event leads, cast compensation rates, and payout completion. Never visible in Cast Portal.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm flex items-center gap-2 self-start"
        >
          <span>💼</span>
          <span>+ New Corporate Gig</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm flex items-center justify-between ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by client, title, location, lead, or cast performer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div className="sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="Inquiry">Inquiry</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      {isLoading ? (
        <Loader text="Loading corporate gigs..." />
      ) : filteredGigs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <span className="text-4xl mb-3 block">🏢</span>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No Corporate Gigs Found</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
            {searchTerm || statusFilter !== 'all'
              ? 'No gigs match your search or filter criteria.'
              : 'Add your first corporate gig booking to start tracking performers, client fees, and payouts.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
          >
            + Create Corporate Gig
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredGigs.map((gig) => {
            const totalPerformerCost = gig.Performers.reduce((sum, p) => sum + (p.PayoutAmount || 0), 0);
            const paidCount = gig.Performers.filter((p) => p.PayoutStatus === 'Paid').length;

            return (
              <div
                key={gig.GigID}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-primary-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-semibold text-primary-600 uppercase tracking-wider">
                        {gig.ClientName}
                      </span>
                      <h3 className="text-lg font-bold text-gray-900">{gig.GigTitle}</h3>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        gig.Status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : gig.Status === 'Confirmed'
                          ? 'bg-blue-100 text-blue-800'
                          : gig.Status === 'Inquiry'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {gig.Status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 text-xs text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div>
                      <span className="font-semibold text-gray-700">📅 Date:</span> {gig.GigDate}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">⏰ Time:</span> {gig.GigTime || 'TBD'}
                    </div>
                    <div className="col-span-2">
                      <span className="font-semibold text-gray-700">📍 Venue:</span> {gig.Location || 'Not specified'}
                    </div>
                    <div className="col-span-2">
                      <span className="font-semibold text-gray-700">👑 Event Lead:</span>{' '}
                      <span className="font-medium text-gray-900">{gig.LeadName || 'Unassigned'}</span>
                    </div>
                  </div>

                  {/* Financials Summary */}
                  <div className="flex items-center justify-between text-xs py-2 px-3 bg-amber-50/60 border border-amber-200 rounded-lg mb-4">
                    <div>
                      <span className="text-gray-600">Client Fee: </span>
                      <span className="font-bold text-gray-900">${(gig.TotalClientFee || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Cast Payouts: </span>
                      <span className="font-bold text-gray-900">${totalPerformerCost.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Net: </span>
                      <span className="font-bold text-emerald-700">
                        ${((gig.TotalClientFee || 0) - totalPerformerCost).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Performers List */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                        Performers ({gig.Performers.length})
                      </h4>
                      {gig.Performers.length > 0 && (
                        <span className="text-[11px] text-gray-500">
                          {paidCount}/{gig.Performers.length} Paid
                        </span>
                      )}
                    </div>

                    {gig.Performers.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No performers assigned yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {gig.Performers.map((p) => (
                          <div
                            key={p.PersonnelID}
                            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border ${
                              p.PayoutStatus === 'Paid'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-gray-50 border-gray-200 text-gray-800'
                            }`}
                          >
                            <span className="font-medium">{p.FullName}</span>
                            <span className="text-[10px] text-gray-500">(${p.PayoutAmount || 0})</span>
                            <span
                              className={`text-[10px] px-1 rounded font-semibold ${
                                p.PayoutStatus === 'Paid' ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {p.PayoutStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {gig.InternalNotes && (
                    <div className="text-xs text-gray-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3">
                      <span className="font-semibold text-gray-700">Notes:</span> {gig.InternalNotes}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t pt-3 mt-2">
                  <button
                    onClick={() => handleOpenEdit(gig)}
                    className="px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100"
                  >
                    Edit / Roster
                  </button>
                  <button
                    onClick={() => handleDeleteGig(gig.GigID)}
                    className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && editingGig && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingGig.GigID ? 'Edit Corporate Gig' : 'New Corporate Gig'}
                </h2>
                <p className="text-xs text-gray-500">Internal commercial booking and cast payout management</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGig} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Client / Company Name *</label>
                  <input
                    type="text"
                    required
                    value={editingGig.ClientName || ''}
                    onChange={(e) => setEditingGig({ ...editingGig, ClientName: e.target.value })}
                    placeholder="e.g. Acme Corporation"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Event / Gig Title *</label>
                  <input
                    type="text"
                    required
                    value={editingGig.GigTitle || ''}
                    onChange={(e) => setEditingGig({ ...editingGig, GigTitle: e.target.value })}
                    placeholder="e.g. Annual Holiday Gala Show"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Gig Date *</label>
                  <input
                    type="date"
                    required
                    value={editingGig.GigDate || ''}
                    onChange={(e) => setEditingGig({ ...editingGig, GigDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Time Range</label>
                  <input
                    type="text"
                    value={editingGig.GigTime || ''}
                    onChange={(e) => setEditingGig({ ...editingGig, GigTime: e.target.value })}
                    placeholder="e.g. 6:30 PM - 8:30 PM"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Venue / Location</label>
                  <input
                    type="text"
                    value={editingGig.Location || ''}
                    onChange={(e) => setEditingGig({ ...editingGig, Location: e.target.value })}
                    placeholder="e.g. Downtown Hyatt Regency Ballroom A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Event Lead / Host</label>
                  <select
                    value={editingGig.LeadPersonnelID || ''}
                    onChange={(e) =>
                      setEditingGig({
                        ...editingGig,
                        LeadPersonnelID: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                  >
                    <option value="">Select Event Lead...</option>
                    {personnelList.map((p) => (
                      <option key={p.PersonnelID} value={p.PersonnelID}>
                        {p.FirstName} {p.LastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Booking Status</label>
                  <select
                    value={editingGig.Status || 'Confirmed'}
                    onChange={(e) => setEditingGig({ ...editingGig, Status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                  >
                    <option value="Inquiry">Inquiry</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Total Client Fee ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingGig.TotalClientFee ?? ''}
                    onChange={(e) =>
                      setEditingGig({
                        ...editingGig,
                        TotalClientFee: e.target.value ? parseFloat(e.target.value) : 0,
                      })
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Internal Notes</label>
                  <input
                    type="text"
                    value={editingGig.InternalNotes || ''}
                    onChange={(e) => setEditingGig({ ...editingGig, InternalNotes: e.target.value })}
                    placeholder="Client requirements, A/V, parking..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              {/* Cast & Performers Roster Section */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Assigned Performers & Compensation</h3>
                    <p className="text-xs text-gray-500">Select cast members performing in this gig, specify pay, and mark payout status</p>
                  </div>
                  <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-1 rounded">
                    Total Cast Pay: $
                    {(editingGig.Performers || [])
                      .reduce((sum, p) => sum + (p.PayoutAmount || 0), 0)
                      .toLocaleString()}
                  </span>
                </div>

                {/* Add Performer Row */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 mb-3 space-y-2">
                  <div className="text-xs font-semibold text-gray-700">Add Cast Member to Gig:</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedPersonnelId}
                      onChange={(e) => setSelectedPersonnelId(e.target.value ? Number(e.target.value) : '')}
                      className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg flex-1 min-w-[180px] bg-white outline-none focus:ring-2 focus:ring-primary-400"
                    >
                      <option value="">Select Cast Member...</option>
                      {personnelList.map((p) => (
                        <option key={p.PersonnelID} value={p.PersonnelID}>
                          {p.FirstName} {p.LastName}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={performerRole}
                      onChange={(e) => setPerformerRole(e.target.value)}
                      placeholder="Role (e.g. Performer)"
                      className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg w-28 bg-white outline-none focus:ring-2 focus:ring-primary-400"
                    />

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={performerPay}
                      onChange={(e) => setPerformerPay(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder="Pay Rate ($)"
                      className="text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg w-24 bg-white outline-none focus:ring-2 focus:ring-primary-400"
                    />

                    <button
                      type="button"
                      onClick={handleAddPerformer}
                      disabled={!selectedPersonnelId}
                      className="px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* Assigned List */}
                {(editingGig.Performers || []).length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3 italic">
                    No performers assigned yet. Add cast members above.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {(editingGig.Performers || []).map((p) => (
                      <div
                        key={p.PersonnelID}
                        className="flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-lg text-xs"
                      >
                        <div>
                          <span className="font-semibold text-gray-900">{p.FullName}</span>
                          <span className="text-gray-500 ml-2">({p.Role || 'Performer'})</span>
                          <span className="font-bold text-gray-800 ml-3">${p.PayoutAmount || 0}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePayout(p.PersonnelID)}
                            className={`px-2 py-0.5 rounded font-semibold text-[11px] transition-colors ${
                              p.PayoutStatus === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                          >
                            {p.PayoutStatus === 'Paid' ? '✓ Paid' : 'Pending'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemovePerformer(p.PersonnelID)}
                            className="text-gray-400 hover:text-red-600 font-bold px-1"
                            title="Remove performer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-60 shadow-sm"
                >
                  {isSaving ? 'Saving...' : 'Save Corporate Gig'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
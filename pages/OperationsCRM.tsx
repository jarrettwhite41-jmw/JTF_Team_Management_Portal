import React, { useState, useEffect } from 'react';
import { crmService, SpaceBooking, TicketRefundRequest, StudentCreditItem, ClassMakeupRequest, VenueRental, CommunicationLog } from '../services/crmService';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';

type CRMTab = 'scheduling' | 'refunds' | 'credits' | 'makeups' | 'welcome_packages' | 'rentals' | 'communications';

export const OperationsCRM: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CRMTab>('scheduling');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Scheduling state
  const [bookings, setBookings] = useState<SpaceBooking[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [isAddBookingOpen, setIsAddBookingOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({
    room_id: 1,
    booking_title: '',
    booking_type: 'rehearsal' as SpaceBooking['booking_type'],
    start_time: '',
    end_time: '',
    status: 'confirmed' as SpaceBooking['status'],
    notes: '',
  });

  // Refunds state
  const [refundRequests, setRefundRequests] = useState<TicketRefundRequest[]>([]);

  // Credits state
  const [studentCredits, setStudentCredits] = useState<StudentCreditItem[]>([]);

  // Makeups state
  const [makeupRequests, setMakeupRequests] = useState<ClassMakeupRequest[]>([]);

  // Welcome Package state
  const [welcomePackages, setWelcomePackages] = useState<any[]>([]);
  const [welcomeFilter, setWelcomeFilter] = useState<'all' | 'signed' | 'pending'>('all');

  // Venue Rentals state
  const [rentals, setRentals] = useState<VenueRental[]>([]);
  const [isAddRentalOpen, setIsAddRentalOpen] = useState(false);
  const [newRental, setNewRental] = useState({
    contact_name: '',
    organization_name: '',
    contact_email: '',
    contact_phone: '',
    event_type: 'Corporate Workshop',
    room_id: 1,
    event_start: '',
    event_end: '',
    rental_rate: 500,
    deposit_amount: 150,
    deposit_paid: false,
    insurance_cert_on_file: false,
    tech_requirements: '',
    status: 'inquiry' as VenueRental['status'],
  });

  // Communications state
  const [commLogs, setCommLogs] = useState<CommunicationLog[]>([]);
  const [commFilter, setCommFilter] = useState('all');

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  const loadTabData = async (tab: CRMTab) => {
    setIsLoading(true);
    setMessage(null);
    try {
      if (tab === 'scheduling') {
        const [bData, rData] = await Promise.all([crmService.getSpaceBookings(), crmService.getAllRooms()]);
        setBookings(bData);
        setRooms(rData);
        if (rData.length > 0 && !newBooking.room_id) {
          setNewBooking((prev) => ({ ...prev, room_id: rData[0].room_id }));
        }
      } else if (tab === 'refunds') {
        const rData = await crmService.getRefundRequests();
        setRefundRequests(rData);
      } else if (tab === 'credits') {
        const cData = await crmService.getStudentCredits();
        setStudentCredits(cData);
      } else if (tab === 'makeups') {
        const mData = await crmService.getClassMakeupRequests();
        setMakeupRequests(mData);
      } else if (tab === 'welcome_packages') {
        const wpData = await crmService.getStudentWelcomePackageStatus();
        setWelcomePackages(wpData);
      } else if (tab === 'rentals') {
        const [renData, rData] = await Promise.all([crmService.getVenueRentals(), crmService.getAllRooms()]);
        setRentals(renData);
        setRooms(rData);
        if (rData.length > 0 && !newRental.room_id) {
          setNewRental((prev) => ({ ...prev, room_id: rData[0].room_id }));
        }
      } else if (tab === 'communications') {
        const comData = await crmService.getCommunicationLogs(commFilter);
        setCommLogs(comData);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to load data.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crmService.createSpaceBooking({
        ...newBooking,
        room_id: Number(newBooking.room_id),
      });
      setMessage({ type: 'success', text: 'Space reservation booked successfully!' });
      setIsAddBookingOpen(false);
      loadTabData('scheduling');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to create booking.' });
    }
  };

  const handleApproveRefund = async (reqId: number) => {
    try {
      await crmService.updateRefundRequestStatus(reqId, 'approved', 'manager@justthefunny.com');
      setMessage({ type: 'success', text: 'Refund request approved.' });
      loadTabData('refunds');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error updating refund status.' });
    }
  };

  const handleUpdateMakeupStatus = async (makeupId: number, status: ClassMakeupRequest['status']) => {
    try {
      await crmService.updateMakeupRequestStatus(makeupId, status);
      setMessage({ type: 'success', text: `Makeup request marked as ${status}.` });
      loadTabData('makeups');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error updating makeup request.' });
    }
  };

  const handleToggleWelcomePackage = async (studentId: number, signed: boolean) => {
    try {
      await crmService.updateStudentWelcomePackage(studentId, signed);
      setMessage({
        type: 'success',
        text: signed ? 'Student marked as having signed the welcome package.' : 'Student welcome package status set to pending.',
      });
      loadTabData('welcome_packages');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error updating welcome package status.' });
    }
  };

  const handleUpdateRentalStatus = async (rentalId: number, status: VenueRental['status']) => {
    try {
      await crmService.updateVenueRentalStatus(rentalId, status);
      setMessage({ type: 'success', text: `Rental status updated to ${status}.` });
      loadTabData('rentals');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error updating rental status.' });
    }
  };

  const handleCreateRental = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crmService.createVenueRental({
        ...newRental,
        room_id: Number(newRental.room_id),
        rental_rate: Number(newRental.rental_rate),
        deposit_amount: Number(newRental.deposit_amount),
      });
      setMessage({ type: 'success', text: 'Venue rental booking created successfully!' });
      setIsAddRentalOpen(false);
      loadTabData('rentals');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error creating rental booking.' });
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Theater CRM & Operations</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Centralized room scheduling, ticket refunds, student class credits & makeups, venue rentals, and customer inquiry logs.
          </p>
        </div>
      </div>

      {message && (
        <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 gap-2 pb-px text-sm">
        <button
          onClick={() => setActiveTab('scheduling')}
          className={`px-4 py-2.5 font-semibold whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'scheduling'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          🏛️ Space Scheduling & Conflicts
        </button>
        <button
          onClick={() => setActiveTab('refunds')}
          className={`px-4 py-2.5 font-semibold whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'refunds'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          🎟️ Ticket Refunds & Credits
        </button>
        <button
          onClick={() => setActiveTab('credits')}
          className={`px-4 py-2.5 font-semibold whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'credits'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          💰 Student Tuition Credits
        </button>
        <button
          onClick={() => setActiveTab('makeups')}
          className={`px-4 py-2.5 font-semibold whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'makeups'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          🧑‍🎓 Class Makeups & Transfers
        </button>
        <button
          onClick={() => setActiveTab('welcome_packages')}
          className={`px-4 py-2.5 font-semibold whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'welcome_packages'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          ✍️ Welcome Package Signatures
        </button>
        <button
          onClick={() => setActiveTab('rentals')}
          className={`px-4 py-2.5 font-semibold whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'rentals'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          🏢 Venue Rentals & Events
        </button>
        <button
          onClick={() => setActiveTab('communications')}
          className={`px-4 py-2.5 font-semibold whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'communications'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          💬 Communication Log
        </button>
      </div>

      {isLoading ? (
        <Loader text="Loading CRM records..." />
      ) : (
        <>
          {/* TAB 1: SPACE SCHEDULING */}
          {activeTab === 'scheduling' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Guaranteed conflict prevention across Main Stage, Second Stage, Classroom A, and Green Room.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddBookingOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + Reserve Space
                </button>
              </div>

              {bookings.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                  No upcoming reservations found.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-4">Event Title</th>
                          <th className="py-3 px-4">Space / Room</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Start Time</th>
                          <th className="py-3 px-4">End Time</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bookings.map((b) => (
                          <tr key={b.booking_id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-900">{b.booking_title}</td>
                            <td className="py-3 px-4 text-slate-700 font-medium">🏛️ {b.room_name}</td>
                            <td className="py-3 px-4 capitalize text-xs text-slate-600">{b.booking_type}</td>
                            <td className="py-3 px-4 text-xs text-slate-700">{new Date(b.start_time).toLocaleString()}</td>
                            <td className="py-3 px-4 text-xs text-slate-700">{new Date(b.end_time).toLocaleString()}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  b.status === 'confirmed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : b.status === 'hold'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TICKET REFUNDS */}
          {activeTab === 'refunds' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Process customer refund and store credit requests from Square POS and Eventbrite.
              </p>
              {refundRequests.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                  No ticket refund requests pending.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4">Platform</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Reason</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {refundRequests.map((r) => (
                          <tr key={r.refund_request_id} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{r.customer_name}</div>
                              <div className="text-xs text-slate-500">{r.customer_email}</div>
                            </td>
                            <td className="py-3 px-4 capitalize text-xs font-medium text-slate-700">{r.platform}</td>
                            <td className="py-3 px-4 uppercase text-xs text-slate-600">{r.refund_type}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">${r.refund_amount}</td>
                            <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">{r.reason}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  r.status === 'approved'
                                    ? 'bg-blue-100 text-blue-800'
                                    : r.status === 'processed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : r.status === 'rejected'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {r.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {r.status === 'requested' && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveRefund(r.refund_request_id!)}
                                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100"
                                >
                                  Approve
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STUDENT CREDITS */}
          {activeTab === 'credits' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Track tuition credits, drops, and administrative grants without messy spreadsheet balances.
              </p>
              {studentCredits.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                  No student credit records logged.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Credit Type</th>
                          <th className="py-3 px-4">Amount</th>
                          <th className="py-3 px-4">Description</th>
                          <th className="py-3 px-4">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {studentCredits.map((c) => (
                          <tr key={c.credit_id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-semibold text-slate-900">{c.student_name}</td>
                            <td className="py-3 px-4 capitalize text-xs text-slate-700">{c.credit_type.replace('_', ' ')}</td>
                            <td className="py-3 px-4 font-bold text-emerald-700">${c.amount}</td>
                            <td className="py-3 px-4 text-xs text-slate-600">{c.description}</td>
                            <td className="py-3 px-4 text-xs text-slate-500">{new Date(c.created_at || '').toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CLASS MAKEUPS */}
          {activeTab === 'makeups' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Automated student class makeup requests to fill vacant seats across conservatory sessions.
              </p>
              {makeupRequests.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                  No class makeup requests pending.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Original Class & Date</th>
                          <th className="py-3 px-4">Target Class</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {makeupRequests.map((m) => (
                          <tr key={m.makeup_request_id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-semibold text-slate-900">{m.student_name}</td>
                            <td className="py-3 px-4 text-xs text-slate-700">
                              <div>{m.original_class_name}</div>
                              <div className="text-slate-500">{m.original_session_date}</div>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-700">{m.target_class_name}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  m.status === 'approved'
                                    ? 'bg-blue-100 text-blue-800'
                                    : m.status === 'attended'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {m.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {m.status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateMakeupStatus(m.makeup_request_id!, 'approved')}
                                  className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100"
                                >
                                  Approve
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: WELCOME PACKAGE SIGNATURES */}
          {activeTab === 'welcome_packages' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  Track students who have signed the conservatory welcome packet and code of conduct before classes begin.
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={welcomeFilter}
                    onChange={(e) => setWelcomeFilter(e.target.value as any)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700"
                  >
                    <option value="all">All Students ({welcomePackages.length})</option>
                    <option value="signed">
                      Signed ({welcomePackages.filter((s) => s.welcome_package_signed).length})
                    </option>
                    <option value="pending">
                      Pending ({welcomePackages.filter((s) => !s.welcome_package_signed).length})
                    </option>
                  </select>
                </div>
              </div>

              {welcomePackages.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                  No student records found.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Student Status</th>
                          <th className="py-3 px-4">Welcome Package</th>
                          <th className="py-3 px-4">Date Signed</th>
                          <th className="py-3 px-4 text-right">Quick Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {welcomePackages
                          .filter((s) => {
                            if (welcomeFilter === 'signed') return s.welcome_package_signed;
                            if (welcomeFilter === 'pending') return !s.welcome_package_signed;
                            return true;
                          })
                          .map((student) => (
                            <tr key={student.student_id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-4 font-semibold text-slate-900">{student.student_name}</td>
                              <td className="py-3 px-4 text-xs text-slate-600">{student.student_email}</td>
                              <td className="py-3 px-4 text-xs">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                                  {student.status || 'Active'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {student.welcome_package_signed ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                    ✓ Signed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                    ⏳ Pending Signature
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-xs text-slate-600">
                                {student.welcome_package_signed_at
                                  ? new Date(student.welcome_package_signed_at).toLocaleDateString()
                                  : '—'}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleToggleWelcomePackage(student.student_id, !student.welcome_package_signed)}
                                  className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                                    student.welcome_package_signed
                                      ? 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                                      : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                                  }`}
                                >
                                  {student.welcome_package_signed ? 'Mark Pending' : 'Mark as Signed'}
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: VENUE RENTALS */}
          {activeTab === 'rentals' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  Track external private bookings, corporate workshops, film shoots, performances, and deposit milestones.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddRentalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap self-start sm:self-auto"
                >
                  + Add Rental / Gig
                </button>
              </div>

              {rentals.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                  No venue rentals or private events scheduled.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-4">Client / Org</th>
                          <th className="py-3 px-4">Event Type</th>
                          <th className="py-3 px-4">Space</th>
                          <th className="py-3 px-4">Date / Time</th>
                          <th className="py-3 px-4">Rate & Deposit</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rentals.map((ren) => (
                          <tr key={ren.rental_id} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{ren.contact_name}</div>
                              <div className="text-xs text-slate-500">{ren.organization_name || ren.contact_email}</div>
                              {ren.contact_phone && <div className="text-[11px] text-slate-400">{ren.contact_phone}</div>}
                            </td>
                            <td className="py-3 px-4 text-xs font-medium text-slate-800">
                              <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-slate-800">{ren.event_type}</span>
                              {ren.tech_requirements && (
                                <div className="text-[11px] text-slate-500 mt-1 max-w-xs truncate" title={ren.tech_requirements}>
                                  Tech: {ren.tech_requirements}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-700 font-medium whitespace-nowrap">🏛️ {ren.room_name}</td>
                            <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                              <div>{new Date(ren.event_start).toLocaleDateString()}</div>
                              <div className="text-[11px] text-slate-400">
                                {new Date(ren.event_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(ren.event_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-xs font-semibold text-slate-900 whitespace-nowrap">
                              <div>${ren.rental_rate}</div>
                              <div className="text-[11px] text-slate-500">
                                Deposit: ${ren.deposit_amount} ({ren.deposit_paid ? '✓ Paid' : 'Unpaid'})
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  ren.status === 'confirmed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ren.status === 'contract_signed'
                                    ? 'bg-blue-100 text-blue-800'
                                    : ren.status === 'deposit_received'
                                    ? 'bg-purple-100 text-purple-800'
                                    : ren.status === 'completed'
                                    ? 'bg-slate-100 text-slate-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {ren.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                              {ren.status === 'inquiry' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRentalStatus(ren.rental_id!, 'contract_signed')}
                                  className="px-2 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100"
                                >
                                  Sign Contract
                                </button>
                              )}
                              {ren.status === 'contract_signed' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRentalStatus(ren.rental_id!, 'confirmed')}
                                  className="px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100"
                                >
                                  Confirm
                                </button>
                              )}
                              {ren.status === 'confirmed' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRentalStatus(ren.rental_id!, 'completed')}
                                  className="px-2 py-1 text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 rounded-md hover:bg-slate-100"
                                >
                                  Complete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: COMMUNICATION LOG */}
          {activeTab === 'communications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  Centralized history of customer interactions across Eventbrite, Square, email, and phone inquiries.
                </p>
                <select
                  value={commFilter}
                  onChange={(e) => {
                    setCommFilter(e.target.value);
                    crmService.getCommunicationLogs(e.target.value).then(setCommLogs);
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700"
                >
                  <option value="all">All Categories</option>
                  <option value="ticketing">Ticketing</option>
                  <option value="class_credit">Class Credit</option>
                  <option value="makeup_request">Makeups</option>
                  <option value="venue_rental">Venue Rentals</option>
                  <option value="general">General</option>
                </select>
              </div>

              {commLogs.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                  No communication threads logged.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {commLogs.map((log) => (
                      <div key={log.log_id} className="p-4 hover:bg-slate-50 transition-colors space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900">{log.subject}</span>
                          <span className="text-xs text-slate-500">{new Date(log.created_at || '').toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="font-semibold text-blue-700">👤 {log.customer_name}</span>
                          <span>•</span>
                          <span className="uppercase text-[11px] font-bold tracking-wide text-slate-500">Channel: {log.channel}</span>
                          <span>•</span>
                          <span className="capitalize text-[11px] font-medium text-purple-700">Category: {log.category.replace('_', ' ')}</span>
                        </div>
                        <p className="text-xs text-slate-700 pt-1 leading-relaxed">{log.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal: New Space Reservation */}
      {isAddBookingOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">Reserve Space</h3>
              <button onClick={() => setIsAddBookingOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Space / Room</label>
                <select
                  value={newBooking.room_id}
                  onChange={(e) => setNewBooking((prev) => ({ ...prev, room_id: Number(e.target.value) }))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                >
                  {rooms.map((r) => (
                    <option key={r.room_id} value={r.room_id}>{r.room_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Improv Cast Rehearsal / Level 1 Class"
                  value={newBooking.booking_title}
                  onChange={(e) => setNewBooking((prev) => ({ ...prev, booking_title: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Booking Type</label>
                <select
                  value={newBooking.booking_type}
                  onChange={(e) => setNewBooking((prev) => ({ ...prev, booking_type: e.target.value as any }))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                >
                  <option value="rehearsal">Rehearsal</option>
                  <option value="show">Show</option>
                  <option value="class">Class</option>
                  <option value="workshop">Workshop</option>
                  <option value="rental">Rental</option>
                  <option value="special_event">Special Event</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={newBooking.start_time}
                    onChange={(e) => setNewBooking((prev) => ({ ...prev, start_time: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={newBooking.end_time}
                    onChange={(e) => setNewBooking((prev) => ({ ...prev, end_time: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Lighting cues, sound requirements, or room setup..."
                  value={newBooking.notes}
                  onChange={(e) => setNewBooking((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddBookingOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 rounded-lg text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Confirm Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Venue Rental / Gig */}
      {isAddRentalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">Add Rental / Gig Booking</h3>
              <button
                type="button"
                onClick={() => setIsAddRentalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRental} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={newRental.contact_name}
                    onChange={(e) => setNewRental((prev) => ({ ...prev, contact_name: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Org</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp / Private Party"
                    value={newRental.organization_name}
                    onChange={(e) => setNewRental((prev) => ({ ...prev, organization_name: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="sarah@example.com"
                    value={newRental.contact_email}
                    onChange={(e) => setNewRental((prev) => ({ ...prev, contact_email: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="305-555-0199"
                    value={newRental.contact_phone}
                    onChange={(e) => setNewRental((prev) => ({ ...prev, contact_phone: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Event / Gig Type</label>
                  <select
                    value={newRental.event_type}
                    onChange={(e) => setNewRental((prev) => ({ ...prev, event_type: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  >
                    <option value="Corporate Workshop">Corporate Workshop / Training</option>
                    <option value="Private Improv Show">Private Improv Show (Gig)</option>
                    <option value="Film / Video Shoot">Film / Video Shoot</option>
                    <option value="Stage Rental">Stage / Theater Rental</option>
                    <option value="Birthday / Celebration">Birthday / Celebration</option>
                    <option value="Audition / Rehearsal">Audition / External Rehearsal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Space</label>
                  <select
                    value={newRental.room_id}
                    onChange={(e) => setNewRental((prev) => ({ ...prev, room_id: Number(e.target.value) }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  >
                    {rooms.map((r) => (
                      <option key={r.room_id} value={r.room_id}>
                        {r.room_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Event Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newRental.event_start}
                    onChange={(e) => setNewRental((prev) => ({ ...prev, event_start: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Event End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newRental.event_end}
                    onChange={(e) => setNewRental((prev) => ({ ...prev, event_end: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rental Rate ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newRental.rental_rate}
                    onChange={(e) => setNewRental((prev) => ({ ...prev, rental_rate: Number(e.target.value) }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deposit Amount ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newRental.deposit_amount}
                    onChange={(e) => setNewRental((prev) => ({ ...prev, deposit_amount: Number(e.target.value) }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 py-1 text-xs text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newRental.deposit_paid}
                    onChange={(e) => setNewRental((prev) => ({ ...prev, deposit_paid: e.target.checked }))}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Deposit Paid</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newRental.insurance_cert_on_file}
                    onChange={(e) => setNewRental((prev) => ({ ...prev, insurance_cert_on_file: e.target.checked }))}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Insurance Certificate On File</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tech & Catering Requirements</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Wireless microphones, stage lighting preset, projector, bar service..."
                  value={newRental.tech_requirements}
                  onChange={(e) => setNewRental((prev) => ({ ...prev, tech_requirements: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddRentalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 rounded-lg text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Save Rental Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

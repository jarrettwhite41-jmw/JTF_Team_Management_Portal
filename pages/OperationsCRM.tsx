import React, { useState, useEffect } from 'react';
import { crmService, SpaceBooking, TicketRefundRequest, StudentCreditItem, ClassMakeupRequest, VenueRental, CommunicationLog } from '../services/crmService';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';

export type CRMTab = 'scheduling' | 'refunds' | 'credits' | 'makeups' | 'welcome_packages' | 'rentals' | 'contact_inquiries' | 'communications';

interface OperationsCRMProps {
  initialTab?: CRMTab;
}

export const OperationsCRM: React.FC<OperationsCRMProps> = ({ initialTab = 'scheduling' }) => {
  const [activeTab, setActiveTab] = useState<CRMTab>(initialTab);
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

  // Venue Rentals & Pipeline state
  const [rentals, setRentals] = useState<VenueRental[]>([]);
  const [rentalFilter, setRentalFilter] = useState<string>('all');
  const [rentalSearch, setRentalSearch] = useState<string>('');
  const [selectedRentalDetail, setSelectedRentalDetail] = useState<VenueRental | null>(null);
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

  // Contact Inquiries state
  const [contactInquiries, setContactInquiries] = useState<CommunicationLog[]>([]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

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
      } else if (tab === 'contact_inquiries') {
        const ciData = await crmService.getCommunicationLogs('general');
        setContactInquiries(ciData);
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

  const handleUpdateContactStatus = async (logId: number, status: CommunicationLog['status']) => {
    try {
      await crmService.updateCommunicationLogStatus(logId, status);
      setMessage({ type: 'success', text: `Inquiry status updated to ${status}.` });
      loadTabData('contact_inquiries');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error updating status.' });
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
              ? 'border-indigo-600 text-indigo-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          🏢 Rentals & Deal Pipeline
        </button>
        <button
          onClick={() => setActiveTab('contact_inquiries')}
          className={`px-4 py-2.5 font-semibold whitespace-nowrap rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'contact_inquiries'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          📬 Contact Inquiries
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

          {/* TAB 5: VENUE RENTALS & DEAL PIPELINE */}
          {activeTab === 'rentals' && (() => {
            // Compute financial KPI summaries across pipeline
            const totalQuoted = rentals.reduce((acc, r) => acc + (Number(r.quoted_fee || r.rental_rate) || 0), 0);
            const totalAgreed = rentals.reduce((acc, r) => acc + (Number(r.agreed_fee) || 0), 0);
            const totalPaid = rentals.reduce((acc, r) => acc + (Number(r.paid_to_date) || (r.deposit_paid ? Number(r.deposit_amount) : 0) || 0), 0);
            const totalBalance = rentals.reduce((acc, r) => acc + (Number(r.balance_due) || 0), 0);

            // Filter rentals
            const filteredRentals = rentals.filter((r) => {
              if (rentalFilter !== 'all') {
                const normStatus = (r.status || '').toLowerCase().replace(/\s+/g, '_');
                if (normStatus !== rentalFilter) return false;
              }
              if (rentalSearch.trim()) {
                const q = rentalSearch.toLowerCase().trim();
                const matchClient = (r.opportunity_name || r.organization_name || r.contact_name || '').toLowerCase().includes(q);
                const matchEmail = (r.contact_email || '').toLowerCase().includes(q);
                const matchOwner = (r.lead_owner || '').toLowerCase().includes(q);
                const matchType = (r.event_type || '').toLowerCase().includes(q);
                if (!matchClient && !matchEmail && !matchOwner && !matchType) return false;
              }
              return true;
            });

            return (
              <div className="space-y-4">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Total Quoted Pipeline
                    </span>
                    <span className="text-xl font-bold text-slate-900">${totalQuoted.toLocaleString()}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">{rentals.length} opportunities</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">
                      Agreed Revenue
                    </span>
                    <span className="text-xl font-bold text-indigo-700">${totalAgreed.toLocaleString()}</span>
                    <span className="text-[11px] text-indigo-400 block mt-0.5">Firm bookings</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
                      Collected to Date
                    </span>
                    <span className="text-xl font-bold text-emerald-700">${totalPaid.toLocaleString()}</span>
                    <span className="text-[11px] text-emerald-400 block mt-0.5">Deposits & fees paid</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
                      Outstanding Balance
                    </span>
                    <span className="text-xl font-bold text-amber-700">${totalBalance.toLocaleString()}</span>
                    <span className="text-[11px] text-amber-400 block mt-0.5">Receivables due</span>
                  </div>
                </div>

                {/* Controls Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      placeholder="Search by client, contact, email, owner..."
                      value={rentalSearch}
                      onChange={(e) => setRentalSearch(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-indigo-500 w-full sm:max-w-xs"
                    />
                    <select
                      value={rentalFilter}
                      onChange={(e) => setRentalFilter(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 font-medium focus:outline-none"
                    >
                      <option value="all">All Statuses ({rentals.length})</option>
                      <option value="inquiry">Inquiries</option>
                      <option value="quoted">Quoted</option>
                      <option value="contract_signed">Contract Signed</option>
                      <option value="deposit_received">Deposit Received</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddRentalOpen(true)}
                      className="px-3 py-1.5 bg-indigo-600 text-white font-semibold text-xs rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
                    >
                      + Add Deal / Booking
                    </button>
                  </div>
                </div>

                {filteredRentals.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                    No bookings or opportunities matched your filters.
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            <th className="py-3 px-4">Client / Opportunity</th>
                            <th className="py-3 px-4">Event & Space</th>
                            <th className="py-3 px-4">Date / Time</th>
                            <th className="py-3 px-4">Staffing & Actors</th>
                            <th className="py-3 px-4">Financials</th>
                            <th className="py-3 px-4">Status & Owner</th>
                            <th className="py-3 px-4 text-right">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredRentals.map((ren) => {
                            const clientDisplay = ren.opportunity_name || ren.organization_name || ren.contact_name;
                            const hasSheetData = Boolean(ren.sheet_opportunity_id);

                            return (
                              <tr key={ren.rental_id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-slate-900">{clientDisplay}</span>
                                    {hasSheetData && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                        {ren.sheet_opportunity_id}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-500">{ren.contact_name}</div>
                                  <div className="text-[11px] text-slate-400">
                                    {ren.contact_email} {ren.contact_phone ? `• ${ren.contact_phone}` : ''}
                                  </div>
                                  {ren.client_folder_url && (
                                    <a
                                      href={ren.client_folder_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline pt-0.5"
                                    >
                                      📁 Client Folder &rarr;
                                    </a>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-xs">
                                  <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-medium">
                                    {ren.event_type}
                                  </span>
                                  <div className="text-slate-600 font-medium mt-1">
                                    🏛️ {ren.location_spaces || ren.room_name || 'Unassigned Room'}
                                  </div>
                                  {ren.guest_count ? (
                                    <div className="text-[11px] text-slate-500">👥 {ren.guest_count} guests</div>
                                  ) : null}
                                </td>

                                <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                                  <div>{new Date(ren.event_start).toLocaleDateString()}</div>
                                  <div className="text-[11px] text-slate-400">
                                    {ren.date_time_details || (
                                      <>
                                        {new Date(ren.event_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                                        {new Date(ren.event_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-4 text-xs">
                                  {ren.facilitators_planned ? (
                                    <div className="font-semibold text-indigo-700">
                                      🎭 {ren.facilitators_planned} {ren.facilitators_planned === 1 ? 'Facilitator/Actor' : 'Facilitators/Actors'}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                  {ren.staffing_logistics && (
                                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5" title={ren.staffing_logistics}>
                                      {ren.staffing_logistics}
                                    </p>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-xs whitespace-nowrap">
                                  {ren.agreed_fee ? (
                                    <div className="font-bold text-slate-900">${Number(ren.agreed_fee).toLocaleString()}</div>
                                  ) : ren.quoted_fee ? (
                                    <div className="font-semibold text-slate-700">Quote: ${Number(ren.quoted_fee).toLocaleString()}</div>
                                  ) : (
                                    <div className="font-semibold text-slate-900">${ren.rental_rate}</div>
                                  )}
                                  <div className="text-[11px] text-slate-500">
                                    Paid: ${Number(ren.paid_to_date || 0).toLocaleString()} • Bal: ${Number(ren.balance_due || 0).toLocaleString()}
                                  </div>
                                  {ren.contract_signed && (
                                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded inline-block mt-0.5">
                                      ✓ Contract Signed
                                    </span>
                                  )}
                                </td>

                                <td className="py-3 px-4 whitespace-nowrap">
                                  <div>
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
                                  </div>
                                  {ren.lead_owner && (
                                    <div className="text-[11px] font-medium text-slate-600 mt-1">
                                      👤 {ren.lead_owner}
                                    </div>
                                  )}
                                </td>

                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRentalDetail(ren)}
                                    className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors"
                                  >
                                    View Card
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 6: CONTACT INQUIRIES */}
          {activeTab === 'contact_inquiries' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  Web inquiries submitted via the public contact form, synchronized in real time from your Google Sheet.
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                    {contactInquiries.length} {contactInquiries.length === 1 ? 'Inquiry' : 'Inquiries'}
                  </span>
                </div>
              </div>

              {contactInquiries.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                  No contact inquiries found.
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-4">Submitted On</th>
                          <th className="py-3 px-4">Contact</th>
                          <th className="py-3 px-4">Subject & Message</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {contactInquiries.map((inq) => {
                          const dateDisplay = inq.submitted_at
                            ? inq.submitted_at
                            : inq.created_at
                            ? new Date(inq.created_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—';

                          return (
                            <tr key={inq.log_id} className="hover:bg-slate-50 align-top">
                              <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                                <div>📅 {dateDisplay}</div>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="font-semibold text-slate-900">{inq.customer_name || inq.staff_email || 'Website Visitor'}</div>
                                {inq.staff_email && (
                                  <a
                                    href={`mailto:${inq.staff_email}`}
                                    className="text-xs text-blue-600 hover:underline block"
                                  >
                                    ✉️ {inq.staff_email}
                                  </a>
                                )}
                              </td>
                              <td className="py-3 px-4 max-w-md">
                                <div className="font-semibold text-slate-900 text-xs mb-1">{inq.subject}</div>
                                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-3 hover:line-clamp-none transition-all">
                                  {inq.body.replace(/^From: [^\n]+\n\n/, '')}
                                </p>
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    inq.status === 'open'
                                      ? 'bg-amber-100 text-amber-800'
                                      : inq.status === 'in_progress'
                                      ? 'bg-blue-100 text-blue-800'
                                      : inq.status === 'resolved'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {inq.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                                {inq.status === 'open' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateContactStatus(inq.log_id!, 'in_progress')}
                                    className="px-2 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100"
                                  >
                                    Start
                                  </button>
                                )}
                                {inq.status === 'in_progress' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateContactStatus(inq.log_id!, 'resolved')}
                                    className="px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100"
                                  >
                                    Resolve
                                  </button>
                                )}
                                {inq.status === 'resolved' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateContactStatus(inq.log_id!, 'archived')}
                                    className="px-2 py-1 text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 rounded-md hover:bg-slate-100"
                                  >
                                    Archive
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: COMMUNICATION LOG */}
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

      {/* Modal: View Full Pipeline / Deal Opportunity Card */}
      {selectedRentalDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-900">
                    {selectedRentalDetail.opportunity_name || selectedRentalDetail.organization_name || selectedRentalDetail.contact_name}
                  </h3>
                  {selectedRentalDetail.sheet_opportunity_id && (
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                      {selectedRentalDetail.sheet_opportunity_id}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lead Owner: <strong>{selectedRentalDetail.lead_owner || 'Unassigned'}</strong> • Source: {selectedRentalDetail.lead_source || selectedRentalDetail.referral_source || 'Website'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRentalDetail(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Status & Next Action Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Status: <span className="uppercase text-indigo-700">{selectedRentalDetail.status}</span></span>
                {selectedRentalDetail.follow_up_date && (
                  <span className="text-slate-500 font-medium">Follow-up: 📅 {selectedRentalDetail.follow_up_date}</span>
                )}
              </div>
              {selectedRentalDetail.next_action && (
                <div className="text-slate-800">
                  <strong>Next Action:</strong> {selectedRentalDetail.next_action}
                </div>
              )}
              {selectedRentalDetail.latest_update && (
                <div className="text-slate-600 italic">
                  <strong>Latest Update:</strong> {selectedRentalDetail.latest_update}
                </div>
              )}
            </div>

            {/* Financial Ledger Section */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                💰 Financial Breakdown
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-50 p-2 rounded">
                  <span className="text-slate-500 block text-[11px]">Budget</span>
                  <strong className="text-slate-800">${Number(selectedRentalDetail.budget || 0).toLocaleString()}</strong>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <span className="text-slate-500 block text-[11px]">Quoted Fee</span>
                  <strong className="text-slate-800">${Number(selectedRentalDetail.quoted_fee || 0).toLocaleString()}</strong>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <span className="text-slate-500 block text-[11px]">Agreed Fee</span>
                  <strong className="text-indigo-700">${Number(selectedRentalDetail.agreed_fee || selectedRentalDetail.rental_rate || 0).toLocaleString()}</strong>
                </div>
                <div className="bg-slate-50 p-2 rounded">
                  <span className="text-slate-500 block text-[11px]">Balance Due</span>
                  <strong className="text-amber-700">${Number(selectedRentalDetail.balance_due || 0).toLocaleString()}</strong>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1 border-t border-slate-100">
                <span>Contract: <strong>{selectedRentalDetail.contract_status || (selectedRentalDetail.contract_signed ? 'Signed' : 'Pending')}</strong></span>
                <span>Deposit Status: <strong>{selectedRentalDetail.deposit_status || (selectedRentalDetail.deposit_paid ? 'Paid' : 'Unpaid')}</strong></span>
                <span>Paid to Date: <strong>${Number(selectedRentalDetail.paid_to_date || 0).toLocaleString()}</strong></span>
                {selectedRentalDetail.payment_due_date && <span>Due Date: <strong>{selectedRentalDetail.payment_due_date}</strong></span>}
              </div>
            </div>

            {/* Operations & Staffing Section */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-600 block">
                🎭 Production & Staffing
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block text-[11px]">Planned Facilitators / Actors:</span>
                  <strong className="text-indigo-700 text-sm">
                    {selectedRentalDetail.facilitators_planned ? `${selectedRentalDetail.facilitators_planned} performers` : 'None specified'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Location / Spaces:</span>
                  <strong className="text-slate-800">{selectedRentalDetail.location_spaces || selectedRentalDetail.room_name || 'Main Stage'}</strong>
                </div>
              </div>
              {selectedRentalDetail.staffing_logistics && (
                <div className="bg-slate-50 p-2 rounded">
                  <strong className="block text-slate-700 mb-0.5">Staffing & Logistics:</strong>
                  <p className="text-slate-600 whitespace-pre-wrap">{selectedRentalDetail.staffing_logistics}</p>
                </div>
              )}
              {selectedRentalDetail.open_questions && (
                <div className="bg-amber-50 border border-amber-200 p-2 rounded text-amber-900">
                  <strong className="block mb-0.5">Open Questions:</strong>
                  <p className="whitespace-pre-wrap">{selectedRentalDetail.open_questions}</p>
                </div>
              )}
            </div>

            {/* Contact & Drive Links */}
            <div className="flex items-center justify-between text-xs pt-2 border-t">
              <div className="text-slate-600">
                Contact: <strong>{selectedRentalDetail.contact_name}</strong> ({selectedRentalDetail.contact_email} {selectedRentalDetail.contact_phone ? `• ${selectedRentalDetail.contact_phone}` : ''})
              </div>
              {selectedRentalDetail.client_folder_url && (
                <a
                  href={selectedRentalDetail.client_folder_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-100 transition-colors"
                >
                  📁 Open Client Folder &rarr;
                </a>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setSelectedRentalDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

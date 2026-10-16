import React, { useState, useEffect } from 'react';
import {
  crmService,
  SpaceBooking,
  TicketRefundRequest,
  StudentCreditItem,
  ClassMakeupRequest,
  VenueRental,
  CommunicationLog,
  OutreachLead,
} from '../services/crmService';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';

export type CRMTab =
  | 'scheduling'
  | 'refunds'
  | 'credits'
  | 'makeups'
  | 'welcome_packages'
  | 'rentals'
  | 'outreach_leads'
  | 'contact_inquiries'
  | 'communications';

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
  const [isEditingRental, setIsEditingRental] = useState(false);
  const [editRentalForm, setEditRentalForm] = useState<Partial<VenueRental>>({});
  const [isSavingRentalEdit, setIsSavingRentalEdit] = useState(false);
  const [isDeletingRental, setIsDeletingRental] = useState(false);
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

  // Outreach & Leads state
  const [leads, setLeads] = useState<OutreachLead[]>([]);
  const [leadFilter, setLeadFilter] = useState<string>('all');
  const [leadCategoryFilter, setLeadCategoryFilter] = useState<string>('all');
  const [leadSearch, setLeadSearch] = useState<string>('');
  const [selectedLead, setSelectedLead] = useState<OutreachLead | null>(null);
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [editLeadForm, setEditLeadForm] = useState<Partial<OutreachLead>>({});
  const [isSavingLead, setIsSavingLead] = useState(false);
  const [isDeletingLead, setIsDeletingLead] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isConvertingLead, setIsConvertingLead] = useState(false);
  const [newLead, setNewLead] = useState<Omit<OutreachLead, 'lead_id'>>({
    organization_name: '',
    category: 'Corporate',
    status: 'New',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    offer_purpose: 'Team Building Workshop',
    next_action: '',
    follow_up_date: '',
    last_contact_date: '',
    notes: '',
    website_url: '',
    owner: '',
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
      } else if (tab === 'outreach_leads') {
        const lData = await crmService.getOutreachLeads();
        setLeads(lData);
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
      const rental = await crmService.createVenueRental({
        ...newRental,
        room_id: Number(newRental.room_id) || undefined,
        rental_rate: Number(newRental.rental_rate) || 0,
        deposit_amount: Number(newRental.deposit_amount) || 0,
      });
      setIsAddRentalOpen(false);
      try {
        const sync = await crmService.syncVenueRentalToSheet(rental.rental_id!);
        if (sync.syncedToSheet) {
          setMessage({ type: 'success', text: 'Deal created in the portal and synced to the pipeline sheet.' });
        } else {
          setMessage({ type: 'success', text: 'Deal created successfully in the portal.' });
        }
      } catch {
        setMessage({ type: 'success', text: 'Deal created in the portal.' });
      }
      loadTabData('rentals');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error creating rental booking.' });
    }
  };

  const handleOpenRentalDetail = (ren: VenueRental) => {
    setSelectedRentalDetail(ren);
    setEditRentalForm({ ...ren });
    setIsEditingRental(false);
  };

  const handleSaveRentalEdit = async () => {
    const rentalId = selectedRentalDetail?.rental_id;
    if (rentalId == null) return;
    setIsSavingRentalEdit(true);
    try {
      const updated = await crmService.updateVenueRental(rentalId, editRentalForm);
      setSelectedRentalDetail(updated);
      setEditRentalForm(updated);
      setIsEditingRental(false);
      try {
        const sync = await crmService.syncVenueRentalToSheet(rentalId);
        if (sync.syncedToSheet) {
          setMessage({ type: 'success', text: 'Deal saved in the portal and synced to the pipeline sheet.' });
        } else {
          setMessage({ type: 'success', text: 'Deal saved in the portal.' });
        }
      } catch {
        setMessage({ type: 'success', text: 'Deal saved in the portal.' });
      }
      loadTabData('rentals');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to update deal.' });
    } finally {
      setIsSavingRentalEdit(false);
    }
  };

  const handleRemoveRental = async () => {
    if (!selectedRentalDetail?.rental_id) return;
    const name = selectedRentalDetail.opportunity_name || selectedRentalDetail.organization_name || selectedRentalDetail.contact_name;
    const confirmMessage = selectedRentalDetail.sheet_opportunity_id
      ? `Permanently remove ${name} from the portal and, when write-back is enabled, the pipeline sheet?`
      : `Permanently remove ${name} from the portal?`;
    if (!window.confirm(confirmMessage)) return;

    setIsDeletingRental(true);
    try {
      const result = await crmService.removeVenueRental(selectedRentalDetail.rental_id);
      setSelectedRentalDetail(null);
      setIsEditingRental(false);
      setMessage({
        type: 'success',
        text: result.syncedToSheet
          ? 'Deal removed from the portal and pipeline sheet.'
          : 'Deal removed from the portal.',
      });
      loadTabData('rentals');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to remove deal.' });
    } finally {
      setIsDeletingRental(false);
    }
  };

  // Outreach Lead handlers
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crmService.createOutreachLead(newLead);
      setIsAddLeadOpen(false);
      setNewLead({
        organization_name: '',
        category: 'Corporate',
        status: 'New',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        offer_purpose: 'Team Building Workshop',
        next_action: '',
        follow_up_date: '',
        last_contact_date: '',
        notes: '',
        website_url: '',
        owner: '',
      });
      setMessage({ type: 'success', text: 'Outreach lead created successfully.' });
      loadTabData('outreach_leads');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error creating outreach lead.' });
    }
  };

  const handleOpenLeadDetail = (lead: OutreachLead) => {
    setSelectedLead(lead);
    setEditLeadForm({ ...lead });
    setIsEditingLead(false);
  };

  const handleSaveLeadEdit = async () => {
    if (!selectedLead?.lead_id) return;
    setIsSavingLead(true);
    try {
      const updated = await crmService.updateOutreachLead(selectedLead.lead_id, editLeadForm);
      setSelectedLead(updated);
      setEditLeadForm(updated);
      setIsEditingLead(false);
      setMessage({ type: 'success', text: 'Lead details updated successfully.' });
      loadTabData('outreach_leads');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to save lead updates.' });
    } finally {
      setIsSavingLead(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!selectedLead?.lead_id) return;
    const name = selectedLead.organization_name || 'this lead';
    if (!window.confirm(`Are you sure you want to permanently remove ${name}?`)) return;

    setIsDeletingLead(true);
    try {
      await crmService.deleteOutreachLead(selectedLead.lead_id);
      setSelectedLead(null);
      setIsEditingLead(false);
      setMessage({ type: 'success', text: `Lead ${name} removed.` });
      loadTabData('outreach_leads');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to delete lead.' });
    } finally {
      setIsDeletingLead(false);
    }
  };

  const handleConvertLeadToRental = async () => {
    if (!selectedLead) return;
    if (!window.confirm(`Convert "${selectedLead.organization_name}" to a Venue Rental / Event Deal? This will create an event booking in the Rentals & Deal Pipeline.`)) return;

    setIsConvertingLead(true);
    try {
      const createdRental = await crmService.convertLeadToEventRental(selectedLead);
      setSelectedLead(null);
      setIsEditingLead(false);
      setMessage({
        type: 'success',
        text: `Successfully converted "${selectedLead.organization_name}" to an Event Deal! Switched to Rentals tab.`,
      });
      // Switch tab to rentals and reload
      setActiveTab('rentals');
      loadTabData('rentals');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to convert lead to event deal.' });
    } finally {
      setIsConvertingLead(false);
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

      {/* Redesigned Clean Segmented Navigation (grouped for desktop & responsive scroll for mobile) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 sm:p-2.5 shadow-2xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>CRM Operational Suites</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Direct access to deals, prospects, students & facilities
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2">
          {/* Revenue & Pipeline Group */}
          <button
            onClick={() => setActiveTab('rentals')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'rentals'
                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
            }`}
          >
            <span className="text-base shrink-0">🏢</span>
            <div className="min-w-0">
              <span className="block leading-tight truncate">Rentals & Deals</span>
              <span className={`text-[10px] block font-normal leading-tight ${activeTab === 'rentals' ? 'text-indigo-200' : 'text-slate-400'}`}>
                Bookings & pipeline
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('outreach_leads')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'outreach_leads'
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
            }`}
          >
            <span className="text-base shrink-0">🎯</span>
            <div className="min-w-0">
              <span className="block leading-tight truncate">Outreach & Leads</span>
              <span className={`text-[10px] block font-normal leading-tight ${activeTab === 'outreach_leads' ? 'text-emerald-200' : 'text-slate-400'}`}>
                Accounts & outreach
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('scheduling')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'scheduling'
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
            }`}
          >
            <span className="text-base shrink-0">🏛️</span>
            <div className="min-w-0">
              <span className="block leading-tight truncate">Space Scheduling</span>
              <span className={`text-[10px] block font-normal leading-tight ${activeTab === 'scheduling' ? 'text-blue-200' : 'text-slate-400'}`}>
                Rooms & conflicts
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('contact_inquiries')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'contact_inquiries'
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
            }`}
          >
            <span className="text-base shrink-0">📬</span>
            <div className="min-w-0">
              <span className="block leading-tight truncate">Contact Inquiries</span>
              <span className={`text-[10px] block font-normal leading-tight ${activeTab === 'contact_inquiries' ? 'text-blue-200' : 'text-slate-400'}`}>
                Web submissions
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('refunds')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'refunds'
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
            }`}
          >
            <span className="text-base shrink-0">🎟️</span>
            <div className="min-w-0">
              <span className="block leading-tight truncate">Ticket Refunds</span>
              <span className={`text-[10px] block font-normal leading-tight ${activeTab === 'refunds' ? 'text-blue-200' : 'text-slate-400'}`}>
                Refund & ticket credit
              </span>
            </div>
          </button>

          {/* Student Operations Group */}
          <button
            onClick={() => setActiveTab('credits')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'credits'
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
            }`}
          >
            <span className="text-base shrink-0">💰</span>
            <div className="min-w-0">
              <span className="block leading-tight truncate">Tuition Credits</span>
              <span className={`text-[10px] block font-normal leading-tight ${activeTab === 'credits' ? 'text-blue-200' : 'text-slate-400'}`}>
                Student balances
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('makeups')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'makeups'
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
            }`}
          >
            <span className="text-base shrink-0">🧑‍🎓</span>
            <div className="min-w-0">
              <span className="block leading-tight truncate">Class Makeups</span>
              <span className={`text-[10px] block font-normal leading-tight ${activeTab === 'makeups' ? 'text-blue-200' : 'text-slate-400'}`}>
                Class transfers
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('welcome_packages')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'welcome_packages'
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
            }`}
          >
            <span className="text-base shrink-0">✍️</span>
            <div className="min-w-0">
              <span className="block leading-tight truncate">Welcome Packages</span>
              <span className={`text-[10px] block font-normal leading-tight ${activeTab === 'welcome_packages' ? 'text-blue-200' : 'text-slate-400'}`}>
                L1 student waivers
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('communications')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left ${
              activeTab === 'communications'
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
            }`}
          >
            <span className="text-base shrink-0">💬</span>
            <div className="min-w-0">
              <span className="block leading-tight truncate">Communications</span>
              <span className={`text-[10px] block font-normal leading-tight ${activeTab === 'communications' ? 'text-blue-200' : 'text-slate-400'}`}>
                Inbound touch log
              </span>
            </div>
          </button>
        </div>
      </div>

      {isLoading ? (
        <Loader text="Loading CRM records..." />
      ) : (
        <>
          {/* TAB 1: SPACE SCHEDULING */}
          {activeTab === 'scheduling' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  Guaranteed conflict prevention across Main Stage, Second Stage, Classroom A, and Green Room.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddBookingOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-700 transition-colors self-start sm:self-auto shrink-0 shadow-2xs"
                >
                  + Reserve Space
                </button>
              </div>

              {bookings.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                  No upcoming reservations found.
                </div>
              ) : (
                <>
                  {/* Mobile Card View (< md) */}
                  <div className="md:hidden space-y-3">
                    {bookings.map((b) => (
                      <div key={b.booking_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm leading-snug">{b.booking_title}</h4>
                            <div className="text-xs font-medium text-slate-700 mt-0.5">🏛️ {b.room_name}</div>
                          </div>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                              b.status === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : b.status === 'hold'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Type</span>
                            <span className="capitalize font-medium text-slate-800">{b.booking_type}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Date</span>
                            <span className="font-medium text-slate-800">{new Date(b.start_time).toLocaleDateString()}</span>
                          </div>
                          <div className="col-span-2 text-slate-600 text-[11px]">
                            ⏰ {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View (>= md) */}
                  <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm table-fixed">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            <th className="py-3 px-3 w-[26%]">Event Title</th>
                            <th className="py-3 px-3 w-[20%]">Space / Room</th>
                            <th className="py-3 px-3 w-[14%]">Type</th>
                            <th className="py-3 px-3 w-[15%]">Start Time</th>
                            <th className="py-3 px-3 w-[15%]">End Time</th>
                            <th className="py-3 px-3 w-[10%] text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {bookings.map((b) => (
                            <tr key={b.booking_id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-3 font-semibold text-slate-900 text-xs break-words">{b.booking_title}</td>
                              <td className="py-3 px-3 text-slate-700 font-medium text-xs truncate">🏛️ {b.room_name}</td>
                              <td className="py-3 px-3 capitalize text-xs text-slate-600 truncate">{b.booking_type}</td>
                              <td className="py-3 px-3 text-xs text-slate-700 truncate">{new Date(b.start_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="py-3 px-3 text-xs text-slate-700 truncate">{new Date(b.end_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="py-3 px-3 text-right">
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
                </>
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
                <>
                  {/* Mobile Card View (< md) */}
                  <div className="md:hidden space-y-3">
                    {refundRequests.map((r) => (
                      <div key={r.refund_request_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{r.customer_name}</div>
                            <div className="text-xs text-slate-500">{r.customer_email}</div>
                          </div>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
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
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Platform & Type</span>
                            <span className="capitalize font-medium text-slate-800">{r.platform} • {r.refund_type}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Amount</span>
                            <span className="font-bold text-slate-900 text-sm">${r.refund_amount}</span>
                          </div>
                          {r.reason && (
                            <div className="col-span-2">
                              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Reason</span>
                              <p className="text-slate-600 text-xs">{r.reason}</p>
                            </div>
                          )}
                        </div>
                        {r.status === 'requested' && (
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => handleApproveRefund(r.refund_request_id!)}
                              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                              Approve Refund
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View (>= md) */}
                  <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm table-fixed">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            <th className="py-3 px-3 w-[22%]">Customer</th>
                            <th className="py-3 px-3 w-[12%]">Platform</th>
                            <th className="py-3 px-3 w-[10%]">Type</th>
                            <th className="py-3 px-3 w-[12%]">Amount</th>
                            <th className="py-3 px-3 w-[26%]">Reason</th>
                            <th className="py-3 px-3 w-[10%]">Status</th>
                            <th className="py-3 px-3 w-[8%] text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {refundRequests.map((r) => (
                            <tr key={r.refund_request_id} className="hover:bg-slate-50">
                              <td className="py-3 px-3">
                                <div className="font-semibold text-slate-900 text-xs truncate">{r.customer_name}</div>
                                <div className="text-[11px] text-slate-500 truncate">{r.customer_email}</div>
                              </td>
                              <td className="py-3 px-3 capitalize text-xs font-medium text-slate-700 truncate">{r.platform}</td>
                              <td className="py-3 px-3 uppercase text-xs text-slate-600 truncate">{r.refund_type}</td>
                              <td className="py-3 px-3 font-bold text-slate-900 text-xs">${r.refund_amount}</td>
                              <td className="py-3 px-3 text-xs text-slate-600">
                                <div className="line-clamp-2 leading-tight" title={r.reason || ''}>{r.reason}</div>
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
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
                              <td className="py-3 px-3 text-right">
                                {r.status === 'requested' && (
                                  <button
                                    type="button"
                                    onClick={() => handleApproveRefund(r.refund_request_id!)}
                                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 whitespace-nowrap"
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
                </>
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
                <>
                  {/* Mobile Card View (< md) */}
                  <div className="md:hidden space-y-3">
                    {studentCredits.map((c) => (
                      <div key={c.credit_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{c.student_name}</h4>
                          <span className="font-extrabold text-emerald-700 text-sm bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 shrink-0">
                            ${c.amount}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Credit Type</span>
                            <span className="capitalize font-medium text-slate-800">{c.credit_type.replace('_', ' ')}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Date</span>
                            <span className="font-medium text-slate-800">{new Date(c.created_at || '').toLocaleDateString()}</span>
                          </div>
                          {c.description && (
                            <div className="col-span-2">
                              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Description</span>
                              <p className="text-slate-600 text-xs">{c.description}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View (>= md) */}
                  <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm table-fixed">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            <th className="py-3 px-3 w-[24%]">Student</th>
                            <th className="py-3 px-3 w-[18%]">Credit Type</th>
                            <th className="py-3 px-3 w-[14%]">Amount</th>
                            <th className="py-3 px-3 w-[30%]">Description</th>
                            <th className="py-3 px-3 w-[14%] text-right">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {studentCredits.map((c) => (
                            <tr key={c.credit_id} className="hover:bg-slate-50">
                              <td className="py-3 px-3 font-semibold text-slate-900 text-xs truncate">{c.student_name}</td>
                              <td className="py-3 px-3 capitalize text-xs text-slate-700 truncate">{c.credit_type.replace('_', ' ')}</td>
                              <td className="py-3 px-3 font-bold text-emerald-700 text-xs">${c.amount}</td>
                              <td className="py-3 px-3 text-xs text-slate-600">
                                <div className="line-clamp-2 leading-tight" title={c.description || ''}>{c.description}</div>
                              </td>
                              <td className="py-3 px-3 text-xs text-slate-500 text-right truncate">{new Date(c.created_at || '').toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
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
                <>
                  {/* Mobile Card View (< md) */}
                  <div className="md:hidden space-y-3">
                    {makeupRequests.map((m) => (
                      <div key={m.makeup_request_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{m.student_name}</h4>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                              m.status === 'approved'
                                ? 'bg-blue-100 text-blue-800'
                                : m.status === 'attended'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {m.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Original Class</span>
                            <span className="font-medium text-slate-800 block">{m.original_class_name}</span>
                            <span className="text-[11px] text-slate-500">{m.original_session_date}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Target Class</span>
                            <span className="font-medium text-slate-800 block">{m.target_class_name}</span>
                          </div>
                        </div>
                        {m.status === 'pending' && (
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateMakeupStatus(m.makeup_request_id!, 'approved')}
                              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                              Approve Makeup
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Desktop Table View (>= md) */}
                  <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm table-fixed">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            <th className="py-3 px-3 w-[24%]">Student</th>
                            <th className="py-3 px-3 w-[26%]">Original Class & Date</th>
                            <th className="py-3 px-3 w-[26%]">Target Class</th>
                            <th className="py-3 px-3 w-[12%]">Status</th>
                            <th className="py-3 px-3 w-[12%] text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {makeupRequests.map((m) => (
                            <tr key={m.makeup_request_id} className="hover:bg-slate-50">
                              <td className="py-3 px-3 font-semibold text-slate-900 text-xs truncate">{m.student_name}</td>
                              <td className="py-3 px-3 text-xs text-slate-700">
                                <div className="font-medium truncate">{m.original_class_name}</div>
                                <div className="text-[11px] text-slate-500 truncate">{m.original_session_date}</div>
                              </td>
                              <td className="py-3 px-3 text-xs text-slate-700 font-medium truncate">{m.target_class_name}</td>
                              <td className="py-3 px-3">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
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
                              <td className="py-3 px-3 text-right">
                                {m.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateMakeupStatus(m.makeup_request_id!, 'approved')}
                                    className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 whitespace-nowrap"
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
                </>
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
                <>
                  {/* Mobile Card View (< md) */}
                  <div className="md:hidden space-y-3">
                    {welcomePackages
                      .filter((s) => {
                        if (welcomeFilter === 'signed') return s.welcome_package_signed;
                        if (welcomeFilter === 'pending') return !s.welcome_package_signed;
                        return true;
                      })
                      .map((student) => (
                        <div key={student.student_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">{student.student_name}</h4>
                              <div className="text-xs text-slate-600 truncate">{student.student_email}</div>
                            </div>
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 capitalize shrink-0">
                              {student.status || 'Active'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <div>
                              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Packet Status</span>
                              {student.welcome_package_signed ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 text-xs">
                                  ✓ Signed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-semibold text-amber-800 text-xs">
                                  ⏳ Pending
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Date Signed</span>
                              <span className="font-medium text-slate-800">
                                {student.welcome_package_signed_at
                                  ? new Date(student.welcome_package_signed_at).toLocaleDateString()
                                  : '—'}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => handleToggleWelcomePackage(student.student_id, !student.welcome_package_signed)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                                student.welcome_package_signed
                                  ? 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                                  : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                              }`}
                            >
                              {student.welcome_package_signed ? 'Mark as Pending' : 'Mark as Signed'}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Desktop Table View (>= md) */}
                  <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm table-fixed">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            <th className="py-3 px-3 w-[24%]">Student</th>
                            <th className="py-3 px-3 w-[26%]">Email</th>
                            <th className="py-3 px-3 w-[12%]">Status</th>
                            <th className="py-3 px-3 w-[16%]">Welcome Package</th>
                            <th className="py-3 px-3 w-[10%]">Date Signed</th>
                            <th className="py-3 px-3 w-[12%] text-right">Quick Action</th>
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
                                <td className="py-3 px-3 font-semibold text-slate-900 text-xs truncate">{student.student_name}</td>
                                <td className="py-3 px-3 text-xs text-slate-600 truncate">{student.student_email}</td>
                                <td className="py-3 px-3 text-xs">
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 capitalize">
                                    {student.status || 'Active'}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  {student.welcome_package_signed ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                      ✓ Signed
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                                      ⏳ Pending
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-xs text-slate-600 truncate">
                                  {student.welcome_package_signed_at
                                    ? new Date(student.welcome_package_signed_at).toLocaleDateString()
                                    : '—'}
                                </td>
                                <td className="py-3 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleWelcomePackage(student.student_id, !student.welcome_package_signed)}
                                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                                      student.welcome_package_signed
                                        ? 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                                        : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                                    }`}
                                  >
                                    {student.welcome_package_signed ? 'Mark Pending' : 'Mark Signed'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
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
                  <>
                    {/* Mobile Card View (< md) */}
                    <div className="md:hidden space-y-3">
                      {filteredRentals.map((ren) => {
                        const clientDisplay = ren.opportunity_name || ren.organization_name || ren.contact_name;
                        const hasSheetData = Boolean(ren.sheet_opportunity_id);

                        return (
                          <div key={ren.rental_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-bold text-slate-900 text-sm">{clientDisplay}</h4>
                                  {hasSheetData && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                      {ren.sheet_opportunity_id}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">{ren.contact_name}</div>
                              </div>
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                                  ren.status === 'confirmed' || ren.status === 'booked'
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
                                {ren.status.replace(/_/g, ' ')}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <div>
                                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Event & Space</span>
                                <div className="font-medium text-slate-800 truncate">{ren.event_type}</div>
                                <div className="text-slate-500 text-[11px] truncate">🏛️ {ren.location_spaces || ren.room_name || 'TBD'}</div>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Date & Time</span>
                                <div className="font-medium text-slate-800">{new Date(ren.event_start).toLocaleDateString()}</div>
                                <div className="text-slate-500 text-[11px] truncate">
                                  {ren.date_time_details || `${new Date(ren.event_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(ren.event_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                </div>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Financials</span>
                                <div className="font-bold text-slate-900">
                                  {ren.agreed_fee ? `$${Number(ren.agreed_fee).toLocaleString()}` : ren.quoted_fee ? `Quote: $${Number(ren.quoted_fee).toLocaleString()}` : `$${ren.rental_rate}`}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Bal: ${Number(ren.balance_due || 0).toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Staff / Owner</span>
                                <div className="font-medium text-indigo-700">
                                  {ren.facilitators_planned ? `🎭 ${ren.facilitators_planned} Actor${ren.facilitators_planned > 1 ? 's' : ''}` : 'No actors'}
                                </div>
                                <div className="text-slate-500 text-[11px] truncate">
                                  {ren.lead_owner ? `👤 ${ren.lead_owner}` : 'Unassigned'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              {ren.client_folder_url ? (
                                <a
                                  href={ren.client_folder_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                  📁 Folder &rarr;
                                </a>
                              ) : <span />}
                              <button
                                type="button"
                                onClick={() => handleOpenRentalDetail(ren)}
                                className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                              >
                                View Card &rarr;
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table View (>= md) */}
                    <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm table-fixed">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              <th className="py-3 px-3 w-[22%]">Client / Opportunity</th>
                              <th className="py-3 px-3 w-[16%]">Event & Space</th>
                              <th className="py-3 px-3 w-[15%]">Date / Time</th>
                              <th className="py-3 px-3 w-[15%]">Staffing & Actors</th>
                              <th className="py-3 px-3 w-[14%]">Financials</th>
                              <th className="py-3 px-3 w-[10%]">Status & Owner</th>
                              <th className="py-3 px-3 w-[8%] text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredRentals.map((ren) => {
                              const clientDisplay = ren.opportunity_name || ren.organization_name || ren.contact_name;
                              const hasSheetData = Boolean(ren.sheet_opportunity_id);

                              return (
                                <tr key={ren.rental_id} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-3 px-3 align-top">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-semibold text-slate-900 text-xs break-words">{clientDisplay}</span>
                                      {hasSheetData && (
                                        <span className="text-[10px] font-mono px-1 py-0.2 bg-slate-100 text-slate-600 rounded shrink-0">
                                          {ren.sheet_opportunity_id}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-slate-500 truncate">{ren.contact_name}</div>
                                    <div className="text-[11px] text-slate-400 truncate">
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

                                  <td className="py-3 px-3 text-xs align-top">
                                    <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 font-medium truncate max-w-full">
                                      {ren.event_type}
                                    </span>
                                    <div className="text-slate-600 font-medium mt-1 truncate">
                                      🏛️ {ren.location_spaces || ren.room_name || 'Unassigned Room'}
                                    </div>
                                    {ren.guest_count ? (
                                      <div className="text-[11px] text-slate-500">👥 {ren.guest_count} guests</div>
                                    ) : null}
                                  </td>

                                  <td className="py-3 px-3 text-xs text-slate-600 align-top">
                                    <div className="font-medium text-slate-800">{new Date(ren.event_start).toLocaleDateString()}</div>
                                    <div className="text-[11px] text-slate-500 break-words line-clamp-2 leading-tight mt-0.5" title={ren.date_time_details || ''}>
                                      {ren.date_time_details || (
                                        <>
                                          {new Date(ren.event_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                                          {new Date(ren.event_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-3 px-3 text-xs align-top">
                                    {ren.facilitators_planned ? (
                                      <div className="font-semibold text-indigo-700">
                                        🎭 {ren.facilitators_planned} {ren.facilitators_planned === 1 ? 'Actor' : 'Actors'}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                    {ren.staffing_logistics && (
                                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-tight" title={ren.staffing_logistics}>
                                        {ren.staffing_logistics}
                                      </p>
                                    )}
                                  </td>

                                  <td className="py-3 px-3 text-xs align-top">
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
                                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded inline-block mt-0.5">
                                        ✓ Contract Signed
                                      </span>
                                    )}
                                  </td>

                                  <td className="py-3 px-3 align-top">
                                    <div>
                                      <span
                                        className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold leading-tight ${
                                          ren.status === 'confirmed' || ren.status === 'booked'
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
                                        {ren.status.replace(/_/g, ' ')}
                                      </span>
                                    </div>
                                    {ren.lead_owner && (
                                      <div className="text-[11px] font-medium text-slate-600 mt-1 truncate" title={ren.lead_owner}>
                                        👤 {ren.lead_owner}
                                      </div>
                                    )}
                                  </td>

                                  <td className="py-3 px-3 text-right align-top">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRentalDetail(ren)}
                                      className="px-2 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors whitespace-nowrap"
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
                  </>
                )}
              </div>
            );
          })()}

          {/* TAB 6: OUTREACH & LEADS PIPELINE */}
          {activeTab === 'outreach_leads' && (() => {
            const categories = Array.from(new Set(leads.map((l) => l.category).filter(Boolean)));
            const statuses = Array.from(new Set(leads.map((l) => l.status).filter(Boolean)));

            const filteredLeads = leads.filter((l) => {
              if (leadFilter !== 'all' && l.status !== leadFilter) return false;
              if (leadCategoryFilter !== 'all' && l.category !== leadCategoryFilter) return false;
              if (leadSearch.trim()) {
                const q = leadSearch.toLowerCase().trim();
                const matchOrg = (l.organization_name || '').toLowerCase().includes(q);
                const matchContact = (l.contact_name || '').toLowerCase().includes(q);
                const matchEmail = (l.contact_email || '').toLowerCase().includes(q);
                const matchOwner = (l.owner || '').toLowerCase().includes(q);
                const matchOffer = (l.offer_purpose || '').toLowerCase().includes(q);
                if (!matchOrg && !matchContact && !matchEmail && !matchOwner && !matchOffer) return false;
              }
              return true;
            });

            return (
              <div className="space-y-4">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Total Prospects
                    </span>
                    <span className="text-xl font-bold text-slate-900">{leads.length}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Active pipeline</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
                      Organizations
                    </span>
                    <span className="text-xl font-bold text-emerald-700">
                      {new Set(leads.map((l) => l.organization_name)).size}
                    </span>
                    <span className="text-[11px] text-emerald-400 block mt-0.5">Unique accounts</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">
                      In Progress / Pitched
                    </span>
                    <span className="text-xl font-bold text-blue-700">
                      {leads.filter((l) => !['New', 'Closed', 'Inactive'].includes(l.status)).length}
                    </span>
                    <span className="text-[11px] text-blue-400 block mt-0.5">Active negotiations</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                    <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">
                      Upcoming Follow-ups
                    </span>
                    <span className="text-xl font-bold text-indigo-700">
                      {leads.filter((l) => Boolean(l.follow_up_date)).length}
                    </span>
                    <span className="text-[11px] text-indigo-400 block mt-0.5">Scheduled touches</span>
                  </div>
                </div>

                {/* Controls Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <input
                      type="text"
                      placeholder="Search accounts, contacts, emails, offer..."
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 focus:outline-none focus:border-emerald-500 w-full sm:max-w-xs"
                    />
                    <select
                      value={leadFilter}
                      onChange={(e) => setLeadFilter(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 font-medium focus:outline-none"
                    >
                      <option value="all">All Stages ({leads.length})</option>
                      {statuses.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    <select
                      value={leadCategoryFilter}
                      onChange={(e) => setLeadCategoryFilter(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 font-medium focus:outline-none"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddLeadOpen(true)}
                      className="px-3 py-1.5 bg-emerald-600 text-white font-semibold text-xs rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap shadow-2xs"
                    >
                      + Add Outreach Lead
                    </button>
                  </div>
                </div>

                {filteredLeads.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                    No outreach leads matched your filters.
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View (< md) */}
                    <div className="md:hidden space-y-3">
                      {filteredLeads.map((lead) => (
                        <div key={lead.lead_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-bold text-slate-900 text-sm">{lead.organization_name}</h4>
                                {lead.sheet_lead_id && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                    {lead.sheet_lead_id}
                                  </span>
                                )}
                              </div>
                              {lead.website_url && (
                                <a
                                  href={lead.website_url.startsWith('http') ? lead.website_url : `https://${lead.website_url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-emerald-600 hover:underline block pt-0.5 truncate max-w-[200px]"
                                >
                                  🌐 {lead.website_url.replace(/^https?:\/\//, '')}
                                </a>
                              )}
                            </div>
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                                lead.status.toLowerCase().includes('won') || lead.status.toLowerCase().includes('converted')
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : lead.status.toLowerCase().includes('contacted') || lead.status.toLowerCase().includes('pitch')
                                  ? 'bg-blue-100 text-blue-800'
                                  : lead.status.toLowerCase().includes('inactive') || lead.status.toLowerCase().includes('lost')
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {lead.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <div>
                              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Category</span>
                              <span className="inline-block px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-medium text-[11px] mt-0.5">
                                {lead.category || 'General'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Contact</span>
                              <div className="font-semibold text-slate-900 truncate">{lead.contact_name || '—'}</div>
                              {lead.contact_email && (
                                <a href={`mailto:${lead.contact_email}`} className="text-blue-600 hover:underline text-[11px] truncate block">
                                  ✉️ {lead.contact_email}
                                </a>
                              )}
                            </div>
                            <div className="col-span-2">
                              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Offer / Purpose</span>
                              <div className="font-medium text-slate-800 text-xs">{lead.offer_purpose || 'General Outreach'}</div>
                            </div>
                            {lead.next_action && (
                              <div className="col-span-2 pt-1 border-t border-slate-200">
                                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Next Action</span>
                                <div className="text-slate-700 text-xs">{lead.next_action}</div>
                                {lead.follow_up_date && (
                                  <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                                    ⏰ Follow-up: {lead.follow_up_date}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <div className="text-xs text-slate-500">
                              {lead.owner ? `👤 ${lead.owner}` : 'Unassigned'}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenLeadDetail(lead)}
                              className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                              View / Edit &rarr;
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table View (>= md) */}
                    <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm table-fixed">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                              <th className="py-3 px-3 w-[24%]">Organization / Prospect</th>
                              <th className="py-3 px-3 w-[18%]">Category & Purpose</th>
                              <th className="py-3 px-3 w-[18%]">Primary Contact</th>
                              <th className="py-3 px-3 w-[14%]">Status & Owner</th>
                              <th className="py-3 px-3 w-[16%]">Next Action / Follow-Up</th>
                              <th className="py-3 px-3 w-[10%] text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredLeads.map((lead) => (
                              <tr key={lead.lead_id} className="hover:bg-slate-50 transition-colors align-top">
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900 text-xs break-words">{lead.organization_name}</span>
                                    {lead.sheet_lead_id && (
                                      <span className="text-[10px] font-mono px-1 py-0.2 bg-slate-100 text-slate-600 rounded shrink-0">
                                        {lead.sheet_lead_id}
                                      </span>
                                    )}
                                  </div>
                                  {lead.website_url && (
                                    <a
                                      href={lead.website_url.startsWith('http') ? lead.website_url : `https://${lead.website_url}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[11px] text-emerald-600 hover:underline block pt-0.5 truncate max-w-full"
                                    >
                                      🌐 {lead.website_url.replace(/^https?:\/\//, '')}
                                    </a>
                                  )}
                                </td>

                                <td className="py-3 px-3 text-xs">
                                  {lead.category && (
                                    <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-semibold text-[11px] mb-1 truncate max-w-full">
                                      {lead.category}
                                    </span>
                                  )}
                                  <div className="text-slate-800 font-medium text-xs break-words line-clamp-2">
                                    {lead.offer_purpose || 'General Outreach'}
                                  </div>
                                </td>

                                <td className="py-3 px-3 text-xs">
                                  <div className="font-semibold text-slate-900 truncate">{lead.contact_name || '—'}</div>
                                  {lead.contact_email && (
                                    <a href={`mailto:${lead.contact_email}`} className="text-blue-600 hover:underline block text-[11px] truncate">
                                      ✉️ {lead.contact_email}
                                    </a>
                                  )}
                                  {lead.contact_phone && (
                                    <div className="text-slate-500 text-[11px] truncate">📞 {lead.contact_phone}</div>
                                  )}
                                </td>

                                <td className="py-3 px-3 text-xs">
                                  <div>
                                    <span
                                      className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold leading-tight ${
                                        lead.status.toLowerCase().includes('won') || lead.status.toLowerCase().includes('converted')
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : lead.status.toLowerCase().includes('contacted') || lead.status.toLowerCase().includes('pitch')
                                          ? 'bg-blue-100 text-blue-800'
                                          : lead.status.toLowerCase().includes('inactive') || lead.status.toLowerCase().includes('lost')
                                          ? 'bg-slate-100 text-slate-700'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {lead.status}
                                    </span>
                                  </div>
                                  {lead.owner && (
                                    <div className="text-[11px] font-medium text-slate-600 mt-1 truncate" title={lead.owner}>
                                      👤 {lead.owner}
                                    </div>
                                  )}
                                </td>

                                <td className="py-3 px-3 text-xs">
                                  {lead.next_action ? (
                                    <div className="font-medium text-slate-800 text-[11px] line-clamp-2 leading-tight" title={lead.next_action}>
                                      {lead.next_action}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">No next action set</span>
                                  )}
                                  {lead.follow_up_date && (
                                    <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                                      ⏰ Follow-up: {lead.follow_up_date}
                                    </div>
                                  )}
                                </td>

                                <td className="py-3 px-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenLeadDetail(lead)}
                                    className="px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors whitespace-nowrap"
                                  >
                                    View / Edit
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* TAB 7: CONTACT INQUIRIES */}
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
                <>
                  {/* Mobile Card View (< md) */}
                  <div className="md:hidden space-y-3">
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
                        <div key={inq.log_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">{inq.customer_name || inq.staff_email || 'Website Visitor'}</h4>
                              {inq.staff_email && (
                                <a href={`mailto:${inq.staff_email}`} className="text-xs text-blue-600 hover:underline block truncate">
                                  ✉️ {inq.staff_email}
                                </a>
                              )}
                            </div>
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
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
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>📅 {dateDisplay}</span>
                            </div>
                            <div className="font-semibold text-slate-900 text-xs">{inq.subject}</div>
                            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-4">
                              {inq.body.replace(/^From: [^\n]+\n\n/, '')}
                            </p>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            {inq.status === 'open' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateContactStatus(inq.log_id!, 'in_progress')}
                                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Mark In Progress
                              </button>
                            )}
                            {inq.status === 'in_progress' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateContactStatus(inq.log_id!, 'resolved')}
                                className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                              >
                                Mark Resolved
                              </button>
                            )}
                            {inq.status === 'resolved' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateContactStatus(inq.log_id!, 'archived')}
                                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors"
                              >
                                Archive
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table View (>= md) */}
                  <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm table-fixed">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                            <th className="py-3 px-3 w-[16%]">Submitted On</th>
                            <th className="py-3 px-3 w-[20%]">Contact</th>
                            <th className="py-3 px-3 w-[40%]">Subject & Message</th>
                            <th className="py-3 px-3 w-[12%]">Status</th>
                            <th className="py-3 px-3 w-[12%] text-right">Actions</th>
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
                                <td className="py-3 px-3 text-xs text-slate-600 font-medium">
                                  <div className="truncate">📅 {dateDisplay}</div>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-slate-900 text-xs truncate">{inq.customer_name || inq.staff_email || 'Website Visitor'}</div>
                                  {inq.staff_email && (
                                    <a
                                      href={`mailto:${inq.staff_email}`}
                                      className="text-[11px] text-blue-600 hover:underline block truncate"
                                    >
                                      ✉️ {inq.staff_email}
                                    </a>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-slate-900 text-xs mb-1 line-clamp-1">{inq.subject}</div>
                                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-3 hover:line-clamp-none transition-all">
                                    {inq.body.replace(/^From: [^\n]+\n\n/, '')}
                                  </p>
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
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
                                <td className="py-3 px-3 text-right space-x-1">
                                  {inq.status === 'open' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateContactStatus(inq.log_id!, 'in_progress')}
                                      className="px-2 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 whitespace-nowrap"
                                    >
                                      Start
                                    </button>
                                  )}
                                  {inq.status === 'in_progress' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateContactStatus(inq.log_id!, 'resolved')}
                                      className="px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 whitespace-nowrap"
                                    >
                                      Resolve
                                    </button>
                                  )}
                                  {inq.status === 'resolved' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateContactStatus(inq.log_id!, 'archived')}
                                      className="px-2 py-1 text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 rounded-md hover:bg-slate-100 whitespace-nowrap"
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
                </>
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

      {/* Modal: View & Edit Full Pipeline / Deal Opportunity Card */}
      {selectedRentalDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b pb-4 gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight break-words">
                    {selectedRentalDetail.opportunity_name || selectedRentalDetail.organization_name || selectedRentalDetail.contact_name}
                  </h3>
                  {selectedRentalDetail.sheet_opportunity_id && (
                    <span className="text-[11px] sm:text-xs font-mono font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md shrink-0">
                      {selectedRentalDetail.sheet_opportunity_id}
                    </span>
                  )}
                  <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md shrink-0">
                    {selectedRentalDetail.event_type || 'Event / Gig'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Lead Owner: <strong className="text-slate-800">{selectedRentalDetail.lead_owner || 'Unassigned'}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>Source: <span className="font-medium text-slate-700">{selectedRentalDetail.lead_source || selectedRentalDetail.referral_source || 'Direct Inquiry'}</span></span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={isDeletingRental || isSavingRentalEdit}
                    onClick={handleRemoveRental}
                    className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50"
                  >
                    {isDeletingRental ? 'Removing...' : 'Remove Deal'}
                  </button>
                  {!isEditingRental ? (
                    <button
                      type="button"
                      disabled={isDeletingRental}
                      onClick={() => setIsEditingRental(true)}
                      className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs"
                    >
                      ✏️ Edit Deal Details
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isSavingRentalEdit || isDeletingRental}
                        onClick={handleSaveRentalEdit}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-2xs"
                      >
                        {isSavingRentalEdit ? 'Saving...' : '💾 Save Changes'}
                      </button>
                      <button
                        type="button"
                        disabled={isSavingRentalEdit || isDeletingRental}
                        onClick={() => {
                          setIsEditingRental(false);
                          setEditRentalForm({ ...selectedRentalDetail });
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRentalDetail(null);
                    setIsEditingRental(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 ml-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Actions & Client Drive Folder bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-slate-700">
                <span>👤 Contact: <strong>{selectedRentalDetail.contact_name}</strong></span>
                {selectedRentalDetail.contact_email && (
                  <a href={`mailto:${selectedRentalDetail.contact_email}`} className="text-indigo-600 hover:underline break-all">
                    ✉️ {selectedRentalDetail.contact_email}
                  </a>
                )}
                {selectedRentalDetail.contact_phone && (
                  <a href={`tel:${selectedRentalDetail.contact_phone}`} className="text-slate-700 hover:underline whitespace-nowrap">
                    📞 {selectedRentalDetail.contact_phone}
                  </a>
                )}
              </div>

              {selectedRentalDetail.client_folder_url ? (
                <a
                  href={
                    selectedRentalDetail.client_folder_url.startsWith('http')
                      ? selectedRentalDetail.client_folder_url
                      : `https://drive.google.com/drive/search?q=${encodeURIComponent(selectedRentalDetail.client_folder_url)}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs self-start sm:self-auto"
                >
                  <span>📁 Open Client Folder</span>
                  <span>&rarr;</span>
                </a>
              ) : (
                <span className="text-slate-400 italic text-[11px]">No Drive folder attached</span>
              )}
            </div>

            {/* Edit Mode Form vs View Mode Layout */}
            {isEditingRental ? (
              <div className="space-y-4">
                {/* Core Pipeline Status & Next Step */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Pipeline Stage & Follow-Up</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Status / Stage</label>
                      <select
                        value={editRentalForm.status || 'inquiry'}
                        onChange={(e) => setEditRentalForm((prev) => ({ ...prev, status: e.target.value as any }))}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium text-slate-800"
                      >
                        <option value="inquiry">Inquiry</option>
                        <option value="quoted">Quoted</option>
                        <option value="contract_signed">Contract Signed</option>
                        <option value="deposit_received">Deposit Received</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="canceled">Canceled</option>
                        <option value="awaiting_response">Awaiting Response</option>
                        <option value="proposal_in_development">Proposal In Development</option>
                        <option value="scoping">Scoping</option>
                        <option value="booked">Booked</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Lead Owner</label>
                      <input
                        type="text"
                        value={editRentalForm.lead_owner || ''}
                        onChange={(e) => setEditRentalForm((prev) => ({ ...prev, lead_owner: e.target.value }))}
                        placeholder="Owner name..."
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Follow-up Date</label>
                      <input
                        type="date"
                        value={editRentalForm.follow_up_date || ''}
                        onChange={(e) => setEditRentalForm((prev) => ({ ...prev, follow_up_date: e.target.value }))}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Next Action Required</label>
                      <input
                        type="text"
                        value={editRentalForm.next_action || ''}
                        onChange={(e) => setEditRentalForm((prev) => ({ ...prev, next_action: e.target.value }))}
                        placeholder="e.g. Send revised scope of work and quote"
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Latest Update / Notes</label>
                      <input
                        type="text"
                        value={editRentalForm.latest_update || ''}
                        onChange={(e) => setEditRentalForm((prev) => ({ ...prev, latest_update: e.target.value }))}
                        placeholder="e.g. Spoke on phone, client loves the 2-facilitator plan"
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Ledger Edit */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">💰 Financials & Billing</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Budget ($)</label>
                      <input
                        type="number"
                        min="0"
                        value={editRentalForm.budget ?? ''}
                        onChange={(e) => setEditRentalForm((prev) => ({ ...prev, budget: Number(e.target.value) }))}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Quoted Fee ($)</label>
                      <input
                        type="number"
                        min="0"
                        value={editRentalForm.quoted_fee ?? ''}
                        onChange={(e) => setEditRentalForm((prev) => ({ ...prev, quoted_fee: Number(e.target.value) }))}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Agreed Fee ($)</label>
                      <input
                        type="number"
                        min="0"
                        value={editRentalForm.agreed_fee ?? ''}
                        onChange={(e) => setEditRentalForm((prev) => ({ ...prev, agreed_fee: Number(e.target.value) }))}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-indigo-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Paid to Date ($)</label>
                      <input
                        type="number"
                        min="0"
                        value={editRentalForm.paid_to_date ?? ''}
                        onChange={(e) => setEditRentalForm((prev) => ({ ...prev, paid_to_date: Number(e.target.value) }))}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Contract Status</label>
                      <input
                        type="text"
                        value={editRentalForm.contract_status || ''}
                        onChange={(e) => setEditRentalForm((prev) => ({ ...prev, contract_status: e.target.value }))}
                        placeholder="e.g. Sent / Signed"
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Deposit Status</label>
                      <input
                        type="text"
                        value={editRentalForm.deposit_status || ''}
                        onChange={(e) => setEditRentalForm((prev) => ({ ...prev, deposit_status: e.target.value }))}
                        placeholder="e.g. Paid / Invoiced"
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Payment Due Date</label>
                      <input
                        type="date"
                        value={editRentalForm.payment_due_date || ''}
                        onChange={(e) => setEditRentalForm((prev) => ({ ...prev, payment_due_date: e.target.value }))}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Operations & Logistics Edit */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">🎭 Facilitators, Performers & Spaces</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1"># Facilitators / Actors</label>
                      <input
                        type="number"
                        min="0"
                        value={editRentalForm.facilitators_planned ?? ''}
                        onChange={(e) => setEditRentalForm((prev) => ({ ...prev, facilitators_planned: Number(e.target.value) || null }))}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Location / Spaces Booked</label>
                      <input
                        type="text"
                        value={editRentalForm.location_spaces || ''}
                        onChange={(e) => setEditRentalForm((prev) => ({ ...prev, location_spaces: e.target.value }))}
                        placeholder="e.g. Main Stage + Green Room"
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Staffing & Logistics Details</label>
                    <textarea
                      rows={2}
                      value={editRentalForm.staffing_logistics || ''}
                      onChange={(e) => setEditRentalForm((prev) => ({ ...prev, staffing_logistics: e.target.value }))}
                      placeholder="Tech crew needs, facilitator assignments, run of show..."
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Open Questions & Action Items</label>
                    <textarea
                      rows={2}
                      value={editRentalForm.open_questions || ''}
                      onChange={(e) => setEditRentalForm((prev) => ({ ...prev, open_questions: e.target.value }))}
                      placeholder="Items pending clarification from the client or venue..."
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Client Drive Folder URL / Name</label>
                    <input
                      type="text"
                      value={editRentalForm.client_folder_url || ''}
                      onChange={(e) => setEditRentalForm((prev) => ({ ...prev, client_folder_url: e.target.value }))}
                      placeholder="https://drive.google.com/... or folder name"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* View Mode Presentation */
              <div className="space-y-4">
                {/* Status & Next Action Banner */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-500">Pipeline Status:</span>
                      <span className="font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full text-[11px] bg-indigo-100 text-indigo-800">
                        {selectedRentalDetail.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {selectedRentalDetail.follow_up_date && (
                      <span className="text-slate-600 font-medium bg-white px-2.5 py-1 rounded-md border border-slate-200">
                        📅 Follow-up: <strong>{selectedRentalDetail.follow_up_date}</strong>
                      </span>
                    )}
                  </div>
                  {selectedRentalDetail.next_action && (
                    <div className="text-slate-800 pt-0.5">
                      <span className="font-bold text-slate-900">Next Action:</span> {selectedRentalDetail.next_action}
                    </div>
                  )}
                  {selectedRentalDetail.latest_update && (
                    <div className="text-slate-600 italic">
                      <span className="font-semibold text-slate-700 not-italic">Latest Note:</span> {selectedRentalDetail.latest_update}
                    </div>
                  )}
                </div>

                {/* Financial Ledger Section */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                    💰 Financial Breakdown & Status
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-slate-500 block text-[11px]">Budget</span>
                      <strong className="text-slate-900 text-base">${Number(selectedRentalDetail.budget || 0).toLocaleString()}</strong>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-slate-500 block text-[11px]">Quoted Fee</span>
                      <strong className="text-slate-900 text-base">${Number(selectedRentalDetail.quoted_fee || 0).toLocaleString()}</strong>
                    </div>
                    <div className="bg-indigo-50/70 p-3 rounded-lg border border-indigo-100">
                      <span className="text-indigo-600 block text-[11px] font-semibold">Agreed Fee</span>
                      <strong className="text-indigo-900 text-base">${Number(selectedRentalDetail.agreed_fee || selectedRentalDetail.rental_rate || 0).toLocaleString()}</strong>
                    </div>
                    <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-100">
                      <span className="text-amber-700 block text-[11px] font-semibold">Balance Due</span>
                      <strong className="text-amber-900 text-base">${Number(selectedRentalDetail.balance_due || 0).toLocaleString()}</strong>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <span>Contract: <strong className="text-slate-800">{selectedRentalDetail.contract_status || (selectedRentalDetail.contract_signed ? 'Signed' : 'Pending')}</strong></span>
                    <span>Deposit Status: <strong className="text-slate-800">{selectedRentalDetail.deposit_status || (selectedRentalDetail.deposit_paid ? 'Paid' : 'Unpaid')}</strong></span>
                    <span>Paid to Date: <strong className="text-emerald-700">${Number(selectedRentalDetail.paid_to_date || 0).toLocaleString()}</strong></span>
                    {selectedRentalDetail.payment_due_date && <span>Due Date: <strong className="text-slate-800">{selectedRentalDetail.payment_due_date}</strong></span>}
                  </div>
                </div>

                {/* Operations & Staffing Section */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                  <span className="font-bold uppercase tracking-wider text-slate-600 block">
                    🎭 Production, Actors & Logistics
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-slate-500 block text-[11px]">Planned Facilitators / Performers:</span>
                      <strong className="text-indigo-700 text-sm">
                        {selectedRentalDetail.facilitators_planned ? `🎭 ${selectedRentalDetail.facilitators_planned} performers` : 'None specified'}
                      </strong>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-slate-500 block text-[11px]">Spaces Booked:</span>
                      <strong className="text-slate-800 text-sm">🏛️ {selectedRentalDetail.location_spaces || selectedRentalDetail.room_name || 'Main Stage'}</strong>
                    </div>
                  </div>
                  {selectedRentalDetail.staffing_logistics && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <strong className="block text-slate-700 mb-1">Staffing & Logistics:</strong>
                      <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{selectedRentalDetail.staffing_logistics}</p>
                    </div>
                  )}
                  {selectedRentalDetail.open_questions && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900">
                      <strong className="block mb-1">⚠️ Open Questions:</strong>
                      <p className="whitespace-pre-wrap leading-relaxed">{selectedRentalDetail.open_questions}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  setSelectedRentalDetail(null);
                  setIsEditingRental(false);
                }}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Outreach Lead */}
      {isAddLeadOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">Add Outreach Prospect / Lead</h3>
              <button
                type="button"
                onClick={() => setIsAddLeadOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Organization / Prospect Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. University of Miami / Baptist Health"
                  value={newLead.organization_name}
                  onChange={(e) => setNewLead((prev) => ({ ...prev, organization_name: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newLead.category || 'Corporate'}
                    onChange={(e) => setNewLead((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  >
                    <option value="Corporate">Corporate</option>
                    <option value="Education">Education / University</option>
                    <option value="Non-profit">Non-profit / Community</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Private Client">Private Client</option>
                    <option value="Sponsorship">Sponsorship / Partner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status / Stage</label>
                  <select
                    value={newLead.status}
                    onChange={(e) => setNewLead((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Pitch Sent">Pitch Sent</option>
                    <option value="In Discussion">In Discussion</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Closed / Won">Closed / Won</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    placeholder="Contact person..."
                    value={newLead.contact_name || ''}
                    onChange={(e) => setNewLead((prev) => ({ ...prev, contact_name: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="email@company.com"
                    value={newLead.contact_email || ''}
                    onChange={(e) => setNewLead((prev) => ({ ...prev, contact_email: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="305-555-0100"
                    value={newLead.contact_phone || ''}
                    onChange={(e) => setNewLead((prev) => ({ ...prev, contact_phone: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Offer / Purpose</label>
                  <input
                    type="text"
                    placeholder="e.g. Improv Team Building / Executive Retreat"
                    value={newLead.offer_purpose || ''}
                    onChange={(e) => setNewLead((prev) => ({ ...prev, offer_purpose: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Website or Deck Link</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={newLead.website_url || ''}
                    onChange={(e) => setNewLead((prev) => ({ ...prev, website_url: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Owner</label>
                  <input
                    type="text"
                    placeholder="e.g. Michael / Sarah"
                    value={newLead.owner || ''}
                    onChange={(e) => setNewLead((prev) => ({ ...prev, owner: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Next Action</label>
                  <input
                    type="text"
                    placeholder="e.g. Follow up with deck"
                    value={newLead.next_action || ''}
                    onChange={(e) => setNewLead((prev) => ({ ...prev, next_action: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Follow-up Date</label>
                  <input
                    type="date"
                    value={newLead.follow_up_date || ''}
                    onChange={(e) => setNewLead((prev) => ({ ...prev, follow_up_date: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prospect Notes</label>
                <textarea
                  rows={2}
                  placeholder="Key background context, meeting notes..."
                  value={newLead.notes || ''}
                  onChange={(e) => setNewLead((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddLeadOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 rounded-lg text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Save Outreach Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View & Edit Outreach Lead Detail Card */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b pb-4 gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight break-words">
                    {selectedLead.organization_name}
                  </h3>
                  {selectedLead.sheet_lead_id && (
                    <span className="text-[11px] sm:text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md shrink-0">
                      {selectedLead.sheet_lead_id}
                    </span>
                  )}
                  {selectedLead.category && (
                    <span className="text-[11px] sm:text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md shrink-0">
                      {selectedLead.category}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Lead Owner: <strong className="text-slate-800">{selectedLead.owner || 'Unassigned'}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>Status: <span className="font-semibold text-slate-800">{selectedLead.status}</span></span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={isConvertingLead || isDeletingLead}
                    onClick={handleConvertLeadToRental}
                    className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs"
                    title="Creates a booked/deal record in Rentals & Deal Pipeline"
                  >
                    {isConvertingLead ? 'Converting...' : '🎯 Convert to Event Deal'}
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingLead || isSavingLead}
                    onClick={handleDeleteLead}
                    className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50"
                  >
                    {isDeletingLead ? 'Removing...' : 'Remove Lead'}
                  </button>
                  {!isEditingLead ? (
                    <button
                      type="button"
                      disabled={isDeletingLead}
                      onClick={() => setIsEditingLead(true)}
                      className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-2xs"
                    >
                      ✏️ Edit Lead
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isSavingLead || isDeletingLead}
                        onClick={handleSaveLeadEdit}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-2xs"
                      >
                        {isSavingLead ? 'Saving...' : '💾 Save'}
                      </button>
                      <button
                        type="button"
                        disabled={isSavingLead || isDeletingLead}
                        onClick={() => {
                          setIsEditingLead(false);
                          setEditLeadForm({ ...selectedLead });
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLead(null);
                    setIsEditingLead(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold ml-1 p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* View or Edit mode */}
            {isEditingLead ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Organization / Prospect *</label>
                    <input
                      type="text"
                      value={editLeadForm.organization_name || ''}
                      onChange={(e) => setEditLeadForm((prev) => ({ ...prev, organization_name: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={editLeadForm.category || 'Corporate'}
                      onChange={(e) => setEditLeadForm((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    >
                      <option value="Corporate">Corporate</option>
                      <option value="Education">Education / University</option>
                      <option value="Non-profit">Non-profit / Community</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Private Client">Private Client</option>
                      <option value="Sponsorship">Sponsorship / Partner</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Status / Stage</label>
                    <input
                      type="text"
                      value={editLeadForm.status || 'New'}
                      onChange={(e) => setEditLeadForm((prev) => ({ ...prev, status: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={editLeadForm.contact_name || ''}
                      onChange={(e) => setEditLeadForm((prev) => ({ ...prev, contact_name: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={editLeadForm.contact_email || ''}
                      onChange={(e) => setEditLeadForm((prev) => ({ ...prev, contact_email: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={editLeadForm.contact_phone || ''}
                      onChange={(e) => setEditLeadForm((prev) => ({ ...prev, contact_phone: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Offer / Purpose</label>
                    <input
                      type="text"
                      value={editLeadForm.offer_purpose || ''}
                      onChange={(e) => setEditLeadForm((prev) => ({ ...prev, offer_purpose: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Website or Deck Link</label>
                    <input
                      type="text"
                      value={editLeadForm.website_url || ''}
                      onChange={(e) => setEditLeadForm((prev) => ({ ...prev, website_url: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Account Owner</label>
                    <input
                      type="text"
                      value={editLeadForm.owner || ''}
                      onChange={(e) => setEditLeadForm((prev) => ({ ...prev, owner: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Next Action</label>
                    <input
                      type="text"
                      value={editLeadForm.next_action || ''}
                      onChange={(e) => setEditLeadForm((prev) => ({ ...prev, next_action: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Follow-up Date</label>
                    <input
                      type="date"
                      value={editLeadForm.follow_up_date || ''}
                      onChange={(e) => setEditLeadForm((prev) => ({ ...prev, follow_up_date: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Notes</label>
                  <textarea
                    rows={3}
                    value={editLeadForm.notes || ''}
                    onChange={(e) => setEditLeadForm((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Contact and Account Summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Primary Contact</span>
                    <strong className="text-slate-900 text-sm">{selectedLead.contact_name || '—'}</strong>
                    {selectedLead.contact_email && (
                      <a href={`mailto:${selectedLead.contact_email}`} className="text-blue-600 hover:underline block mt-0.5">
                        ✉️ {selectedLead.contact_email}
                      </a>
                    )}
                    {selectedLead.contact_phone && (
                      <span className="text-slate-600 block mt-0.5">📞 {selectedLead.contact_phone}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Offer / Purpose</span>
                    <strong className="text-slate-900 text-sm">{selectedLead.offer_purpose || 'General Outreach'}</strong>
                    {selectedLead.category && (
                      <span className="text-slate-600 block mt-0.5">Category: {selectedLead.category}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Online Presence / Deck</span>
                    {selectedLead.website_url ? (
                      <a
                        href={selectedLead.website_url.startsWith('http') ? selectedLead.website_url : `https://${selectedLead.website_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-600 font-semibold hover:underline mt-1"
                      >
                        🌐 Visit Website / Deck &rarr;
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">No website attached</span>
                    )}
                  </div>
                </div>

                {/* Cadence & Next Action */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                  <span className="font-bold uppercase tracking-wider text-slate-700 block">
                    Cadence & Follow-Up
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-100">
                      <span className="text-emerald-800 font-semibold block text-[11px]">Next Action:</span>
                      <strong className="text-emerald-950 text-sm">
                        {selectedLead.next_action || 'No next action specified'}
                      </strong>
                    </div>
                    <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-100">
                      <span className="text-amber-800 font-semibold block text-[11px]">Scheduled Follow-Up:</span>
                      <strong className="text-amber-950 text-sm">
                        {selectedLead.follow_up_date || 'No follow-up date'}
                      </strong>
                    </div>
                  </div>
                  {selectedLead.notes && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <strong className="block text-slate-700 mb-1">Notes:</strong>
                      <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{selectedLead.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t">
              <button
                type="button"
                onClick={() => {
                  setSelectedLead(null);
                  setIsEditingLead(false);
                }}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-colors"
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

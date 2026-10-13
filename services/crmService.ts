import { supabase } from './supabaseClient';

export interface SpaceBooking {
  booking_id?: number;
  room_id: number;
  room_name?: string;
  booking_title: string;
  booking_type: 'show' | 'rehearsal' | 'class' | 'workshop' | 'rental' | 'maintenance' | 'special_event';
  start_time: string;
  end_time: string;
  status: 'draft' | 'hold' | 'confirmed' | 'completed' | 'canceled';
  show_id?: number | null;
  offering_id?: number | null;
  notes?: string;
  created_at?: string;
}

export interface TicketRefundRequest {
  refund_request_id?: number;
  order_id: number;
  show_id: number;
  show_name?: string;
  patron_id?: number | null;
  refund_type: 'full' | 'partial' | 'store_credit';
  refund_amount: number;
  reason: string;
  status: 'requested' | 'approved' | 'processed' | 'rejected';
  customer_name?: string;
  customer_email?: string;
  platform?: string;
  requested_by_email?: string;
  approved_by_email?: string;
  gateway_refund_id?: string;
  created_at?: string;
}

export interface StudentCreditItem {
  credit_id?: number;
  student_id: number;
  student_name?: string;
  amount: number;
  credit_type: 'prorated_drop' | 'class_cancellation' | 'administrative_grant' | 'redemption' | 'refund_to_card';
  description: string;
  offering_id?: number | null;
  created_by_email?: string;
  created_at?: string;
}

export interface ClassMakeupRequest {
  makeup_request_id?: number;
  student_id: number;
  student_name?: string;
  original_offering_id: number;
  original_class_name?: string;
  original_session_date: string;
  target_offering_id?: number | null;
  target_class_name?: string;
  target_session_date?: string | null;
  status: 'pending' | 'approved' | 'attended' | 'canceled' | 'rejected';
  reason?: string;
  created_at?: string;
}

export interface VenueRental {
  rental_id?: number;
  organization_name?: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  event_type: string;
  room_id?: number | null;
  room_name?: string;
  event_start: string;
  event_end: string;
  rental_rate: number;
  deposit_amount: number;
  deposit_paid: boolean;
  insurance_cert_on_file: boolean;
  tech_requirements?: string;
  guest_count?: number | null;
  preferred_date?: string | null;
  start_time_estimate?: string | null;
  referral_source?: string | null;
  notes?: string | null;
  status: 'inquiry' | 'quoted' | 'contract_signed' | 'deposit_received' | 'confirmed' | 'completed' | 'canceled';
  created_at?: string;
}

export interface CommunicationLog {
  log_id?: number;
  patron_id?: number | null;
  personnel_id?: number | null;
  customer_name?: string;
  channel: 'email' | 'phone' | 'square' | 'eventbrite' | 'in_person' | 'chat';
  category: 'ticketing' | 'class_credit' | 'makeup_request' | 'venue_rental' | 'complaint' | 'general';
  direction: 'inbound' | 'outbound';
  subject: string;
  body: string;
  staff_email?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'archived';
  submitted_at?: string | null;
  created_at?: string;
}

export const crmService = {
  // ── Space Bookings & Conflict Prevention ──────────────────────────────
  async getAllRooms() {
    const { data, error } = await supabase.from('rooms').select('*').order('room_id', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getSpaceBookings(startDate?: string, endDate?: string) {
    let query = supabase
      .from('space_bookings')
      .select('*, rooms(room_name)')
      .order('start_time', { ascending: true });

    if (startDate) query = query.gte('start_time', startDate);
    if (endDate) query = query.lte('end_time', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((b: any) => ({
      ...b,
      room_name: b.rooms?.room_name || `Room #${b.room_id}`,
    }));
  },

  async createSpaceBooking(booking: Omit<SpaceBooking, 'booking_id'>) {
    const { data, error } = await supabase
      .from('space_bookings')
      .insert([booking])
      .select('*, rooms(room_name)')
      .single();

    if (error) {
      if (error.message?.includes('exclude_room_time_overlap') || error.code === '23P01') {
        throw new Error('Scheduling conflict! This space is already reserved for an overlapping event.');
      }
      throw error;
    }
    return data;
  },

  async updateSpaceBookingStatus(bookingId: number, status: SpaceBooking['status']) {
    const { data, error } = await supabase
      .from('space_bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('booking_id', bookingId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Ticket Refund Requests & Orders ───────────────────────────────────
  async getRefundRequests() {
    const { data, error } = await supabase
      .from('ticket_refund_requests')
      .select('*, ticket_orders(customer_name, customer_email, platform), show_information(venue)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((r: any) => ({
      ...r,
      customer_name: r.ticket_orders?.customer_name || 'Patron',
      customer_email: r.ticket_orders?.customer_email || '—',
      platform: r.ticket_orders?.platform || 'Direct',
    }));
  },

  async createRefundRequest(request: Omit<TicketRefundRequest, 'refund_request_id'>) {
    const { data, error } = await supabase
      .from('ticket_refund_requests')
      .insert([request])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateRefundRequestStatus(
    refundRequestId: number,
    status: 'approved' | 'processed' | 'rejected',
    approvedByEmail: string,
    gatewayRefundId?: string
  ) {
    const updates: any = {
      status,
      approved_by_email: approvedByEmail,
      updated_at: new Date().toISOString(),
    };
    if (status === 'approved') updates.approved_at = new Date().toISOString();
    if (status === 'processed') {
      updates.processed_at = new Date().toISOString();
      if (gatewayRefundId) updates.gateway_refund_id = gatewayRefundId;
    }

    const { data, error } = await supabase
      .from('ticket_refund_requests')
      .update(updates)
      .eq('refund_request_id', refundRequestId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Student Tuition Credits ───────────────────────────────────────────
  async getStudentCredits(studentId?: number) {
    let query = supabase
      .from('student_credit_ledger')
      .select('*, student_info(student_id, personnel(first_name, last_name))')
      .order('created_at', { ascending: false });

    if (studentId) query = query.eq('student_id', studentId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((c: any) => {
      const studentPersonnel = c.student_info?.personnel;
      const studentName = studentPersonnel
        ? `${studentPersonnel.first_name || ''} ${studentPersonnel.last_name || ''}`.trim()
        : `Student #${c.student_id}`;
      return {
        ...c,
        student_name: studentName,
      };
    });
  },

  async addStudentCredit(credit: Omit<StudentCreditItem, 'credit_id'>) {
    const { data, error } = await supabase
      .from('student_credit_ledger')
      .insert([credit])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Class Makeups ─────────────────────────────────────────────────────
  async getClassMakeupRequests() {
    const { data, error } = await supabase
      .from('class_makeup_requests')
      .select(`
        *,
        student_info(
          student_id,
          personnel(first_name, last_name)
        ),
        orig:original_offering_id(
          offering_id,
          class_levels(level_name)
        ),
        target:target_offering_id(
          offering_id,
          class_levels(level_name)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((m: any) => {
      const studentPersonnel = m.student_info?.personnel;
      const studentName = studentPersonnel
        ? `${studentPersonnel.first_name || ''} ${studentPersonnel.last_name || ''}`.trim()
        : `Student #${m.student_id}`;
      return {
        ...m,
        student_name: studentName,
        original_class_name: m.orig?.class_levels?.level_name || `Class #${m.original_offering_id}`,
        target_class_name: m.target?.class_levels?.level_name || 'To Be Assigned',
      };
    });
  },

  async updateMakeupRequestStatus(makeupId: number, status: ClassMakeupRequest['status']) {
    const { data, error } = await supabase
      .from('class_makeup_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('makeup_request_id', makeupId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Welcome Package Signatures ────────────────────────────────────────
  async getStudentWelcomePackageStatus() {
    const { data, error } = await supabase
      .from('student_info')
      .select('student_id, status, welcome_package_signed, welcome_package_signed_at, personnel(first_name, last_name, primary_email)')
      .order('student_id', { ascending: true });

    if (error) throw error;
    return (data || []).map((s: any) => ({
      student_id: s.student_id,
      student_name: s.personnel ? `${s.personnel.first_name || ''} ${s.personnel.last_name || ''}`.trim() : `Student #${s.student_id}`,
      student_email: s.personnel?.primary_email || '—',
      status: s.status,
      welcome_package_signed: Boolean(s.welcome_package_signed),
      welcome_package_signed_at: s.welcome_package_signed_at,
    }));
  },

  async updateStudentWelcomePackage(studentId: number, signed: boolean) {
    const { data, error } = await supabase
      .from('student_info')
      .update({
        welcome_package_signed: signed,
        welcome_package_signed_at: signed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('student_id', studentId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Venue Rentals & Private Events ────────────────────────────────────
  async getVenueRentals() {
    const { data, error } = await supabase
      .from('venue_rentals')
      .select('*, rooms(room_name)')
      .order('event_start', { ascending: true });

    if (error) throw error;
    return (data || []).map((r: any) => ({
      ...r,
      room_name: r.rooms?.room_name || 'Unassigned Stage',
    }));
  },

  async createVenueRental(rental: Omit<VenueRental, 'rental_id'>) {
    const { data, error } = await supabase
      .from('venue_rentals')
      .insert([rental])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateVenueRentalStatus(rentalId: number, status: VenueRental['status']) {
    const { data, error } = await supabase
      .from('venue_rentals')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('rental_id', rentalId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // ── Centralized Customer Communications Log ───────────────────────────
  async getCommunicationLogs(category?: string) {
    let query = supabase
      .from('communication_logs')
      .select('*, patrons(first_name, last_name, email), personnel(first_name, last_name, primary_email)')
      .order('created_at', { ascending: false });

    if (category && category !== 'all') query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((log: any) => {
      const patronName = log.patrons ? `${log.patrons.first_name || ''} ${log.patrons.last_name || ''}`.trim() : null;
      const personnelName = log.personnel ? `${log.personnel.first_name || ''} ${log.personnel.last_name || ''}`.trim() : null;
      return {
        ...log,
        customer_name: patronName || personnelName || 'Anonymous Customer',
      };
    });
  },

  async updateCommunicationLogStatus(logId: number, status: CommunicationLog['status']) {
    const { data, error } = await supabase
      .from('communication_logs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('log_id', logId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createCommunicationLog(log: Omit<CommunicationLog, 'log_id'>) {
    const { data, error } = await supabase
      .from('communication_logs')
      .insert([log])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

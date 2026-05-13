import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Personnel,
  ShowInformation,
  ClassOfferings,
  ShowPerformances,
  StudentEnrollments,
  CrewDuties,
  Inventory,
  ShowTypes,
  ClassLevels,
  CrewDutyTypes,
  DashboardStats,
  ApiResponse,
  CastMemberWithDetails,
  CrewMemberWithDetails,
  BartenderWithDetails,
  ShowWithDetails,
  StudentInfo,
  ClassLevelProgression,
  Bartender,
} from '../types';

// Initialize Supabase client
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;

const getSupabaseClient = () => {
  if (!supabase) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('Supabase credentials not configured in environment variables');
      throw new Error('Missing Supabase configuration');
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabase;
};

class SupabaseService {
  private client: SupabaseClient;

  private toPersonnel(row: any): Personnel {
    return {
      PersonnelID: row.personnel_id,
      FirstName: row.first_name || '',
      LastName: row.last_name || '',
      PrimaryEmail: row.primary_email || '',
      PrimaryPhone: row.primary_phone || '',
      Instagram: row.instagram || '',
      Birthday: row.birthday || '',
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return String(error);
  }

  constructor() {
    try {
      this.client = getSupabaseClient();
    } catch (error) {
      console.error('Supabase client initialization failed:', error);
      this.client = null as any;
    }
  }

  // ========================================================================
  // PERSONNEL
  // ========================================================================

  async getAllPersonnel(): Promise<ApiResponse<Personnel[]>> {
    try {
      const { data, error } = await this.client
        .from('personnel')
        .select('*')
        .order('last_name', { ascending: true });

      if (error) throw error;
      return { success: true, data: (data || []).map((row) => this.toPersonnel(row)) };
    } catch (error) {
      console.error('Error fetching personnel:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getAllTeachers(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('teachers')
        .select(`
          teacher_id,
          personnel_id,
          personnel(
            personnel_id,
            first_name,
            last_name,
            primary_email,
            primary_phone,
            instagram,
            birthday
          )
        `)
        .order('teacher_id', { ascending: true });

      if (error) throw error;

      const transformed = (data || []).map((row: any) => ({
        TeacherID: row.teacher_id,
        PersonnelID: row.personnel_id,
        FirstName: row.personnel?.first_name || '',
        LastName: row.personnel?.last_name || '',
        PrimaryEmail: row.personnel?.primary_email || '',
      }));

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching teachers:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getPersonnelById(personnelId: number): Promise<ApiResponse<Personnel>> {
    try {
      const { data, error } = await this.client
        .from('personnel')
        .select('*')
        .eq('personnel_id', personnelId)
        .single();

      if (error) throw error;
      return { success: true, data: this.toPersonnel(data) };
    } catch (error) {
      console.error('Error fetching personnel:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async createPersonnel(personnel: Omit<Personnel, 'PersonnelID'>): Promise<ApiResponse<Personnel>> {
    try {
      const { data, error } = await this.client
        .from('personnel')
        .insert([
          {
            first_name: personnel.FirstName,
            last_name: personnel.LastName,
            primary_email: personnel.PrimaryEmail,
            primary_phone: personnel.PrimaryPhone || null,
            instagram: personnel.Instagram || null,
            birthday: personnel.Birthday || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: this.toPersonnel(data) };
    } catch (error) {
      console.error('Error creating personnel:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async updatePersonnel(personnelOrId: number | Personnel, personnelMaybe?: Partial<Personnel>): Promise<ApiResponse<Personnel>> {
    try {
      const personnelId = typeof personnelOrId === 'number' ? personnelOrId : personnelOrId.PersonnelID;
      const personnel = (typeof personnelOrId === 'number' ? personnelMaybe : personnelOrId) || {};
      const updates: Record<string, any> = {};
      if (personnel.FirstName !== undefined) updates.first_name = personnel.FirstName;
      if (personnel.LastName !== undefined) updates.last_name = personnel.LastName;
      if (personnel.PrimaryEmail !== undefined) updates.primary_email = personnel.PrimaryEmail;
      if (personnel.PrimaryPhone !== undefined) updates.primary_phone = personnel.PrimaryPhone || null;
      if (personnel.Instagram !== undefined) updates.instagram = personnel.Instagram || null;
      if (personnel.Birthday !== undefined) updates.birthday = personnel.Birthday || null;

      const { data, error } = await this.client
        .from('personnel')
        .update(updates)
        .eq('personnel_id', personnelId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: this.toPersonnel(data) };
    } catch (error) {
      console.error('Error updating personnel:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async deletePersonnel(personnelId: number): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      const { error } = await this.client
        .from('personnel')
        .delete()
        .eq('personnel_id', personnelId);

      if (error) throw error;
      return { success: true, data: { deleted: true } };
    } catch (error) {
      console.error('Error deleting personnel:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // ========================================================================
  // SHOWS
  // ========================================================================

  async getAllShows(): Promise<ApiResponse<ShowInformation[]>> {
    try {
      const { data, error } = await this.client
        .from('show_information')
        .select('*')
        .order('show_date', { ascending: false });

      if (error) throw error;

      // Transform snake_case to camelCase
      const transformed = data?.map(show => ({
        ShowID: show.show_id,
        ShowDate: show.show_date,
        ShowTime: show.show_time,
        ShowTypeID: show.show_type_id,
        DirectorID: show.director_id,
        Venue: show.venue,
        Status: show.status,
      })) || [];

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching shows:', error);
      return { success: false, error: error.toString() };
    }
  }

  async getShowsWithDetails(): Promise<ApiResponse<ShowWithDetails[]>> {
    try {
      const { data, error } = await this.client
        .from('show_information')
        .select(
          `
          *,
          show_types(show_type_name),
          directors(personnel_id, personnel(first_name, last_name)),
          show_performances(*, personnel(*)),
          crew_duties(*, personnel(*))
        `
        )
        .order('show_date', { ascending: false });

      if (error) throw error;

      const transformed = data?.map((show: any) => ({
        ShowID: show.show_id,
        ShowDate: show.show_date,
        ShowTime: show.show_time,
        ShowTypeID: show.show_type_id,
        DirectorID: show.director_id,
        Venue: show.venue,
        Status: show.status,
        ShowTypeName: show.show_types?.show_type_name || '',
        DirectorName: show.directors?.personnel
          ? `${show.directors.personnel.first_name || ''} ${show.directors.personnel.last_name || ''}`.trim()
          : '',
        CastMembers: show.show_performances?.map((perf: any) => perf.personnel) || [],
        CrewMembers: show.crew_duties?.map((crew: any) => crew.personnel) || [],
      })) || [];

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching shows with details:', error);
      return { success: false, error: error.toString() };
    }
  }

  async createShow(show: Omit<ShowInformation, 'ShowID'>): Promise<ApiResponse<ShowInformation>> {
    try {
      const { data, error } = await this.client
        .from('show_information')
        .insert([
          {
            show_date: show.ShowDate,
            show_time: show.ShowTime,
            show_type_id: show.ShowTypeID,
            director_id: show.DirectorID,
            venue: show.Venue,
            status: show.Status,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating show:', error);
      return { success: false, error: error.toString() };
    }
  }

  async deleteShow(showId: number): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      const { error: performancesError } = await this.client
        .from('show_performances')
        .delete()
        .eq('show_id', showId);
      if (performancesError) throw performancesError;

      const { error: crewError } = await this.client
        .from('crew_duties')
        .delete()
        .eq('show_id', showId);
      if (crewError) throw crewError;

      const { error: showError } = await this.client
        .from('show_information')
        .delete()
        .eq('show_id', showId);
      if (showError) throw showError;

      return { success: true, data: { deleted: true } };
    } catch (error) {
      console.error('Error deleting show:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getAllDirectors(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('directors')
        .select(`
          director_id,
          personnel_id,
          personnel(first_name, last_name, primary_email)
        `)
        .order('director_id', { ascending: true });

      if (error) throw error;

      const transformed = (data || []).map((director: any) => ({
        DirectorID: director.director_id,
        PersonnelID: director.personnel_id,
        FirstName: director.personnel?.first_name || '',
        LastName: director.personnel?.last_name || '',
        PrimaryEmail: director.personnel?.primary_email || '',
      }));

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching directors:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getShowPerformances(showId: number): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('show_performances')
        .select('performance_id, show_id, personnel_id, role, personnel(first_name, last_name, primary_email)')
        .eq('show_id', showId)
        .order('performance_id', { ascending: true });

      if (error) throw error;

      const castMembers = await this.getAllCastMembers();
      const castMembersData = castMembers.success ? ((castMembers.data as any)?.data || castMembers.data || []) : [];
      const castMapByPersonnel = new Map(castMembersData.map((member: any) => [member.PersonnelID, member]));

      const transformed = (data || []).map((row: any) => {
        const p = row.personnel || {};
        const castMember = castMapByPersonnel.get(row.personnel_id);
        return {
          PerformanceID: row.performance_id,
          ShowID: row.show_id,
          PersonnelID: row.personnel_id,
          CastMemberID: castMember?.CastMemberID || null,
          Role: row.role || 'Cast Member',
          FirstName: p.first_name || castMember?.FirstName || '',
          LastName: p.last_name || castMember?.LastName || '',
          PrimaryEmail: p.primary_email || castMember?.PrimaryEmail || '',
          FullName: `${p.first_name || ''} ${p.last_name || ''}`.trim() || castMember?.FullName || '',
        };
      });

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching show performances:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getShowCrew(showId: number): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('crew_duties')
        .select(`
          duty_id,
          show_id,
          personnel_id,
          crew_duty_type_id,
          personnel(first_name, last_name, primary_email),
          crew_duty_types(duty_name)
        `)
        .eq('show_id', showId)
        .order('duty_id', { ascending: true });

      if (error) throw error;

      const transformed = (data || []).map((row: any) => ({
        DutyID: row.duty_id,
        ShowID: row.show_id,
        CrewMemberID: row.personnel_id,
        CrewDutyTypeID: row.crew_duty_type_id,
        PersonnelID: row.personnel_id,
        FirstName: row.personnel?.first_name || '',
        LastName: row.personnel?.last_name || '',
        Lastname: row.personnel?.last_name || '',
        FullName: `${row.personnel?.first_name || ''} ${row.personnel?.last_name || ''}`.trim(),
        PrimaryEmail: row.personnel?.primary_email || '',
        DutyName: row.crew_duty_types?.duty_name || '',
        Status: 'Active',
      }));

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching show crew:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async updateShowCast(showId: number, castMembers: ShowPerformances[]): Promise<ApiResponse<boolean>> {
    try {
      const { error: deleteError } = await this.client
        .from('show_performances')
        .delete()
        .eq('show_id', showId);

      if (deleteError) throw deleteError;

      if (castMembers.length > 0) {
        const insertRows = castMembers.map(member => ({
          show_id: showId,
          personnel_id: (member as any).PersonnelID,
          role: member.Role || 'Cast Member',
        }));

        const { error: insertError } = await this.client
          .from('show_performances')
          .insert(insertRows);

        if (insertError) throw insertError;
      }

      return { success: true, data: true };
    } catch (error) {
      console.error('Error updating show cast:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async updateShow(showId: number, show: Partial<ShowInformation>): Promise<ApiResponse<ShowInformation>> {
    try {
      const updates: Record<string, any> = {};
      if (show.ShowDate) updates.show_date = show.ShowDate;
      if (show.ShowTime) updates.show_time = show.ShowTime;
      if (show.ShowTypeID) updates.show_type_id = show.ShowTypeID;
      if (show.DirectorID) updates.director_id = show.DirectorID;
      if (show.Venue) updates.venue = show.Venue;
      if (show.Status) updates.status = show.Status;

      const { data, error } = await this.client
        .from('show_information')
        .update(updates)
        .eq('show_id', showId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating show:', error);
      return { success: false, error: error.toString() };
    }
  }

  // ========================================================================
  // CAST MEMBERS  (source of truth: cast_member_info)
  // ========================================================================

  async addPersonAsCastMember(personnelId: number): Promise<ApiResponse<CastMemberWithDetails>> {
    try {
      // Prevent duplicates
      const { data: existing } = await this.client
        .from('cast_member_info')
        .select('"CastMemberID"')
        .eq('PersonnelID', personnelId)
        .maybeSingle();

      const { data: personnel, error: personnelError } = await this.client
        .from('personnel')
        .select('*')
        .eq('personnel_id', personnelId)
        .single();

      if (personnelError) throw personnelError;

      let castMemberId: number;
      if (existing) {
        castMemberId = existing['CastMemberID'];
      } else {
        const { data: newRow, error: insertError } = await this.client
          .from('cast_member_info')
          .insert([{ PersonnelID: personnelId }])
          .select()
          .single();
        if (insertError) throw insertError;
        castMemberId = newRow['CastMemberID'];
      }

      return {
        success: true,
        data: {
          CastMemberID: castMemberId,
          PerformanceID: castMemberId,
          ShowID: 0,
          Role: 'Cast Member',
          PersonnelID: personnelId,
          FirstName: personnel.first_name || '',
          Lastname: personnel.last_name || '',
          LastName: personnel.last_name || '',
          FullName: `${personnel.first_name || ''} ${personnel.last_name || ''}`.trim(),
          PrimaryEmail: personnel.primary_email || '',
          PrimaryPhone: personnel.primary_phone || '',
          Birthday: personnel.birthday || '',
          Status: 'Active',
        } as any,
      };
    } catch (error) {
      console.error('Error adding cast member:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async removeCastMember(castMemberId: number): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      const { error } = await this.client
        .from('cast_member_info')
        .delete()
        .eq('CastMemberID', castMemberId);

      if (error) throw error;
      return { success: true, data: { deleted: true } };
    } catch (error) {
      console.error('Error removing cast member:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // ========================================================================
  // CLASSES
  // ========================================================================

  async getAllClasses(): Promise<ApiResponse<ClassOfferings[]>> {
    try {
      const { data, error } = await this.client
        .from('class_offerings')
        .select(`
          *,
          class_levels(level_name),
          teachers(personnel_id),
          rooms(room_name)
        `)
        .order('start_date', { ascending: false });

      if (error) throw error;

      const transformed = data?.map((cls: any) => ({
        OfferingID: cls.offering_id,
        ClassLevelID: cls.class_level_id,
        StartDate: cls.start_date,
        EndDate: cls.end_date,
        TeacherPersonnelID: cls.teachers?.personnel_id,
        RoomID: cls.room_id,
        RoomName: cls.rooms?.room_name || '',
        MaxStudents: cls.max_students,
        Status: cls.status,
      })) || [];

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching classes:', error);
      return { success: false, error: error.toString() };
    }
  }

  async getAllClassOfferings(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('class_offerings')
        .select(`
          *,
          class_levels(level_name),
          teachers(personnel_id, personnel(first_name, last_name)),
          rooms(room_name),
          student_enrollments(enrollment_id)
        `)
        .order('start_date', { ascending: false });

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const rows = (data || []).map((cls: any) => {
        const start = cls.start_date ? new Date(cls.start_date) : null;
        const end = cls.end_date ? new Date(cls.end_date) : null;
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(0, 0, 0, 0);

        let computedStatus: string;
        if (end && end < today) {
          computedStatus = 'Completed';
        } else if (start && start <= today && (!end || end >= today)) {
          computedStatus = 'In Progress';
        } else {
          computedStatus = 'Upcoming';
        }

        const enrollments = Array.isArray(cls.student_enrollments) ? cls.student_enrollments : [];
        const activeCount = enrollments.filter((e: any) => e.status !== 'ADMIN').length;

        return {
          OfferingID: cls.offering_id,
          ClassLevelID: cls.class_level_id,
          LevelName: cls.class_levels?.level_name || '',
          TeacherPersonnelID: cls.teachers?.personnel_id || null,
          TeacherName: cls.teachers?.personnel
            ? `${cls.teachers.personnel.first_name || ''} ${cls.teachers.personnel.last_name || ''}`.trim()
            : '',
          StartDate: cls.start_date,
          EndDate: cls.end_date,
          MaxStudents: cls.max_students || 0,
          EnrolledCount: activeCount,
          Status: computedStatus,
          Location: cls.rooms?.room_name || '',
          MeetingDays: cls.notes || '',
        };
      });

      return { success: true, data: rows };
    } catch (error) {
      console.error('Error fetching class offerings:', error);
      return { success: false, error: error.toString() };
    }
  }

  async createClassOffering(classOffering: Omit<ClassOfferings, 'OfferingID'>): Promise<ApiResponse<ClassOfferings>> {
    try {
      const { data, error } = await this.client
        .from('class_offerings')
        .insert([
          {
            class_level_id: classOffering.ClassLevelID,
            start_date: classOffering.StartDate,
            end_date: classOffering.EndDate,
            teacher_id: classOffering.TeacherID ?? classOffering.TeacherPersonnelID,
            room_id: classOffering.RoomID,
            max_students: classOffering.MaxStudents,
            status: classOffering.Status,
            notes: (classOffering as any).MeetingDays || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating class:', error);
      return { success: false, error: error.toString() };
    }
  }

  async updateClassOffering(offeringOrPayload: number | any, classOfferingMaybe?: Partial<ClassOfferings>): Promise<ApiResponse<ClassOfferings>> {
    try {
      const offeringId = typeof offeringOrPayload === 'number' ? offeringOrPayload : Number(offeringOrPayload.OfferingID);
      const classOffering = (typeof offeringOrPayload === 'number' ? classOfferingMaybe : offeringOrPayload) || {};
      const updates: Record<string, any> = {};
      if (classOffering.ClassLevelID !== undefined) updates.class_level_id = classOffering.ClassLevelID;
      if (classOffering.StartDate !== undefined) updates.start_date = classOffering.StartDate;
      if (classOffering.EndDate !== undefined) updates.end_date = classOffering.EndDate;
      if ((classOffering as any).TeacherID !== undefined) updates.teacher_id = (classOffering as any).TeacherID;
      else if (classOffering.TeacherPersonnelID !== undefined) updates.teacher_id = classOffering.TeacherPersonnelID;
      if ((classOffering as any).RoomID !== undefined) updates.room_id = (classOffering as any).RoomID;
      if (classOffering.MaxStudents !== undefined) updates.max_students = classOffering.MaxStudents;
      if (classOffering.Status !== undefined) updates.status = classOffering.Status;
      if ((classOffering as any).MeetingDays !== undefined) updates.notes = (classOffering as any).MeetingDays;

      const { data, error } = await this.client
        .from('class_offerings')
        .update(updates)
        .eq('offering_id', offeringId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating class:', error);
      return { success: false, error: error.toString() };
    }
  }

  async getEnrolledStudents(offeringId: number): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('student_enrollments')
        .select(`
          enrollment_id,
          student_id,
          enrollment_date,
          status,
          student_info(
            personnel_id,
            personnel(
              first_name,
              last_name,
              primary_email,
              primary_phone
            )
          )
        `)
        .eq('offering_id', offeringId)
        .order('enrollment_date', { ascending: true });

      if (error) throw error;

      const rows = (data || []).map((row: any) => ({
        EnrollmentID: row.enrollment_id,
        StudentID: row.student_id,
        PersonnelID: row.student_info?.personnel_id || null,
        FirstName: row.student_info?.personnel?.first_name || '',
        LastName: row.student_info?.personnel?.last_name || '',
        PrimaryEmail: row.student_info?.personnel?.primary_email || '',
        PrimaryPhone: row.student_info?.personnel?.primary_phone || '',
        EnrollmentDate: row.enrollment_date,
        CompletionStatus: row.status || 'Active',
      }));

      return { success: true, data: rows };
    } catch (error) {
      console.error('Error fetching enrolled students:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async enrollStudent(offeringId: number, studentId: number): Promise<ApiResponse<boolean>> {
    try {
      const existing = await this.client
        .from('student_enrollments')
        .select('enrollment_id, status')
        .eq('offering_id', offeringId)
        .eq('student_id', studentId)
        .order('enrollment_id', { ascending: false })
        .limit(1);

      if (existing.error) throw existing.error;

      const latest = existing.data?.[0];
      if (latest && latest.status !== 'ADMIN') {
        return { success: false, error: 'Student is already enrolled in this class.' };
      }

      if (latest && latest.status === 'ADMIN') {
        const { error: restoreError } = await this.client
          .from('student_enrollments')
          .update({
            status: 'Active',
            enrollment_date: new Date().toISOString().split('T')[0],
          })
          .eq('enrollment_id', latest.enrollment_id);

        if (restoreError) throw restoreError;
        return { success: true, data: true };
      }

      const { error: insertError } = await this.client
        .from('student_enrollments')
        .insert([
          {
            offering_id: offeringId,
            student_id: studentId,
            enrollment_date: new Date().toISOString().split('T')[0],
            status: 'Active',
          },
        ]);

      if (insertError) throw insertError;
      return { success: true, data: true };
    } catch (error) {
      console.error('Error enrolling student:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async removeStudentFromClass(enrollmentId: number): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      const { error } = await this.client
        .from('student_enrollments')
        .update({ status: 'ADMIN' })
        .eq('enrollment_id', enrollmentId);

      if (error) throw error;
      return { success: true, data: { deleted: true } };
    } catch (error) {
      console.error('Error removing student from class:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async updateEnrollmentStatus(enrollmentId: number, status: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const { error } = await this.client
        .from('student_enrollments')
        .update({ status })
        .eq('enrollment_id', enrollmentId);

      if (error) throw error;
      return { success: true, data: { success: true } };
    } catch (error) {
      console.error('Error updating enrollment status:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // ========================================================================
  // LOOKUP TABLES / REFERENCE DATA
  // ========================================================================

  async getAllShowTypes(): Promise<ApiResponse<ShowTypes[]>> {
    try {
      const { data, error } = await this.client
        .from('show_types')
        .select('*')
        .order('show_type_name');

      if (error) throw error;

      const transformed = data?.map(type => ({
        ShowTypeID: type.show_type_id,
        ShowTypeName: type.show_type_name,
      })) || [];

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching show types:', error);
      return { success: false, error: error.toString() };
    }
  }

  async getAllClassLevels(): Promise<ApiResponse<ClassLevels[]>> {
    try {
      const { data, error } = await this.client
        .from('class_levels')
        .select('*')
        .order('class_level_id');

      if (error) throw error;

      const transformed = data?.map(level => ({
        ClassLevelID: level.class_level_id,
        LevelName: level.level_name,
        Description: level.description,
      })) || [];

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching class levels:', error);
      return { success: false, error: error.toString() };
    }
  }

  async getAllCrewDutyTypes(): Promise<ApiResponse<CrewDutyTypes[]>> {
    try {
      const { data, error } = await this.client
        .from('crew_duty_types')
        .select('*')
        .order('duty_name');

      if (error) throw error;

      const transformed = data?.map(type => ({
        CrewDutyTypeID: type.crew_duty_type_id,
        DutyName: type.duty_name,
      })) || [];

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching crew duty types:', error);
      return { success: false, error: error.toString() };
    }
  }

  async getAllRooms() {
    try {
      const { data, error } = await this.client
        .from('rooms')
        .select('*')
        .order('room_name');

      if (error) throw error;

      const transformed = data?.map(room => ({
        RoomID: room.room_id,
        RoomName: room.room_name,
      })) || [];

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching rooms:', error);
      return { success: false, error: error.toString() };
    }
  }

  // ========================================================================
  // INVENTORY
  // ========================================================================

  async getAllInventory(): Promise<ApiResponse<Inventory[]>> {
    try {
      const { data, error } = await this.client
        .from('inventory_items')
        .select(`
          *,
          inventory_categories(category_name),
          storage_locations(location_name)
        `)
        .order('item_name');

      if (error) throw error;

      const transformed = data?.map(item => ({
        ItemID: item.item_id,
        ItemName: item.item_name,
        Category: item.inventory_categories?.category_name || '',
        Quantity: item.current_quantity,
        Location: item.storage_locations?.location_name || '',
        Notes: item.notes,
      })) || [];

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching inventory:', error);
      return { success: false, error: error.toString() };
    }
  }

  async createInventoryItem(item: Omit<Inventory, 'ItemID'>): Promise<ApiResponse<Inventory>> {
    try {
      const { data: category } = await this.client
        .from('inventory_categories')
        .select('category_id')
        .eq('category_name', item.Category)
        .maybeSingle();
      const { data: location } = await this.client
        .from('storage_locations')
        .select('location_id')
        .eq('location_name', item.Location)
        .maybeSingle();

      const insert = await this.client
        .from('inventory_items')
        .insert([{
          item_name: item.ItemName,
          category_id: category?.category_id || 1,
          current_quantity: item.Quantity || 0,
          min_quantity: 0,
          location_id: location?.location_id || null,
          notes: item.Notes || null,
        }])
        .select('*, inventory_categories(category_name), storage_locations(location_name)')
        .single();

      if (insert.error) throw insert.error;

      return {
        success: true,
        data: {
          ItemID: insert.data.item_id,
          ItemName: insert.data.item_name,
          Category: insert.data.inventory_categories?.category_name || '',
          Quantity: insert.data.current_quantity || 0,
          Location: insert.data.storage_locations?.location_name || '',
          Notes: insert.data.notes || '',
        },
      };
    } catch (error) {
      console.error('Error creating inventory item:', error);
      return { success: false, error: error.toString() };
    }
  }

  async updateInventoryItem(item: Inventory): Promise<ApiResponse<Inventory>> {
    try {
      const { data: category } = await this.client
        .from('inventory_categories')
        .select('category_id')
        .eq('category_name', item.Category)
        .maybeSingle();
      const { data: location } = await this.client
        .from('storage_locations')
        .select('location_id')
        .eq('location_name', item.Location)
        .maybeSingle();

      const update = await this.client
        .from('inventory_items')
        .update({
          item_name: item.ItemName,
          category_id: category?.category_id || 1,
          current_quantity: item.Quantity || 0,
          location_id: location?.location_id || null,
          notes: item.Notes || null,
        })
        .eq('item_id', item.ItemID)
        .select('*, inventory_categories(category_name), storage_locations(location_name)')
        .single();

      if (update.error) throw update.error;

      return {
        success: true,
        data: {
          ItemID: update.data.item_id,
          ItemName: update.data.item_name,
          Category: update.data.inventory_categories?.category_name || '',
          Quantity: update.data.current_quantity || 0,
          Location: update.data.storage_locations?.location_name || '',
          Notes: update.data.notes || '',
        },
      };
    } catch (error) {
      console.error('Error updating inventory item:', error);
      return { success: false, error: error.toString() };
    }
  }

  async deleteInventoryItem(itemId: number): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.client.from('inventory_items').delete().eq('item_id', itemId);
      if (error) throw error;
      return { success: true, data: true };
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      return { success: false, error: error.toString() };
    }
  }

  // ========================================================================
  // CREW MEMBERS
  // ========================================================================

  async getAllCrewMembers(): Promise<ApiResponse<CrewMemberWithDetails[]>> {
    try {
      const { data, error } = await this.client
        .from('crew_duties')
        .select(`
          *,
          personnel(*),
          crew_duty_types(duty_name),
          show_information(show_date, venue)
        `)
        .order('duty_id');

      if (error) throw error;

      const transformed = data?.map((crew: any) => ({
        DutyID: crew.duty_id,
        ShowID: crew.show_id,
        CrewMemberID: crew.personnel_id,
        CrewDutyTypeID: crew.crew_duty_type_id,
        FirstName: crew.personnel?.first_name || '',
        LastName: crew.personnel?.last_name || '',
        Lastname: crew.personnel?.last_name || '',
        PrimaryEmail: crew.personnel?.primary_email || '',
        PrimaryPhone: crew.personnel?.primary_phone || '',
        PersonnelID: crew.personnel_id,
        Birthday: crew.personnel?.birthday || '',
        DutyName: crew.crew_duty_types?.duty_name || '',
        ShowName: crew.show_information?.venue || '',
        ShowDate: crew.show_information?.show_date || '',
        LastShowDate: crew.show_information?.show_date || '',
        Status: 'Active',
      })) || [];

      return { success: true, data: { data: transformed } as any };
    } catch (error) {
      console.error('Error fetching crew members:', error);
      return { success: false, error: error.toString() };
    }
  }

  async getAllCastMembers(): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await this.client
        .from('cast_member_info')
        .select(`
          "CastMemberID",
          "PersonnelID",
          "YearJoined",
          "OutOfTown",
          "Limited/Inactive",
          "ImageURL",
          personnel!CastMemberInfo_PersonnelID_fkey(
            personnel_id, first_name, last_name, primary_email, primary_phone, birthday
          )
        `)
        .order('"CastMemberID"', { ascending: true });

      if (error) throw error;

      const transformed = (data || []).map((row: any) => {
        const p = row.personnel || {};
        let status = 'Active';
        if (row['Limited/Inactive']) status = 'Limited/Inactive';
        if (row['OutOfTown']) status = 'Out of Town';
        return {
          CastMemberID: row['CastMemberID'],
          PerformanceID: row['CastMemberID'],
          ShowID: 0,
          Role: 'Cast Member',
          PersonnelID: row['PersonnelID'],
          FirstName: p.first_name || '',
          Lastname: p.last_name || '',
          LastName: p.last_name || '',
          FullName: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          PrimaryEmail: p.primary_email || '',
          PrimaryPhone: p.primary_phone || '',
          Birthday: p.birthday || '',
          YearJoined: row['YearJoined'],
          OutOfTown: row['OutOfTown'],
          LimitedInactive: row['Limited/Inactive'],
          ImageURL: row['ImageURL'],
          LastShowDate: '',
          Status: status,
        };
      });

      return { success: true, data: { data: transformed } };
    } catch (error) {
      console.error('Error fetching cast members:', error);
      return { success: false, error: error.toString() };
    }
  }

  async addPersonAsCrewMember(personnelId: number, showId: number, dutyTypeId: number): Promise<ApiResponse<CrewMemberWithDetails>> {
    try {
      const { data, error } = await this.client
        .from('crew_duties')
        .insert([
          {
            personnel_id: personnelId,
            show_id: showId,
            crew_duty_type_id: dutyTypeId,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: { CrewMemberID: data.duty_id, PersonnelID: personnelId } as CrewMemberWithDetails };
    } catch (error) {
      console.error('Error adding crew member:', error);
      return { success: false, error: error.toString() };
    }
  }

  async removeCrewMember(dutyId: number): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      const { error } = await this.client
        .from('crew_duties')
        .delete()
        .eq('duty_id', dutyId);

      if (error) throw error;
      return { success: true, data: { deleted: true } };
    } catch (error) {
      console.error('Error removing crew member:', error);
      return { success: false, error: error.toString() };
    }
  }

  // ========================================================================
  // BARTENDERS
  // ========================================================================

  async getBartendersWithDetails(): Promise<ApiResponse<BartenderWithDetails[]>> {
    try {
      const { data, error } = await this.client
        .from('bartenders')
        .select(`
          *,
          personnel(*)
        `)
        .order('bartender_id');

      if (error) throw error;

      const transformed = data?.map(bartender => ({
        BartenderID: bartender.bartender_id,
        PersonnelID: bartender.personnel_id,
        FirstName: bartender.personnel?.first_name || '',
        LastName: bartender.personnel?.last_name || '',
        FullName: `${bartender.personnel?.first_name || ''} ${bartender.personnel?.last_name || ''}`,
        PrimaryEmail: bartender.personnel?.primary_email || '',
        PrimaryPhone: bartender.personnel?.primary_phone || '',
        Birthday: bartender.personnel?.birthday || '',
        Trained: bartender.trained,
        Status: bartender.status,
        Active: bartender.active,
      })) || [];

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching bartenders:', error);
      return { success: false, error: error.toString() };
    }
  }

  async addPersonAsBartender(personnelId: number, trained: boolean = false, status: string = 'Active'): Promise<ApiResponse<BartenderWithDetails>> {
    try {
      const { data, error } = await this.client
        .from('bartenders')
        .insert([
          {
            personnel_id: personnelId,
            trained,
            status,
            active: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          BartenderID: data.bartender_id,
          PersonnelID: personnelId,
          Trained: trained,
          Status: status,
          Active: true,
        } as BartenderWithDetails,
      };
    } catch (error) {
      console.error('Error adding bartender:', error);
      return { success: false, error: error.toString() };
    }
  }

  async removeBartender(bartenderId: number): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      const { error } = await this.client
        .from('bartenders')
        .delete()
        .eq('bartender_id', bartenderId);

      if (error) throw error;
      return { success: true, data: { deleted: true } };
    } catch (error) {
      console.error('Error removing bartender:', error);
      return { success: false, error: error.toString() };
    }
  }

  // ========================================================================
  // STUDENTS & ENROLLMENT
  // ========================================================================

  async updateStudentStatus(studentId: number, status: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const { error } = await this.client
        .from('student_info')
        .update({ status })
        .eq('student_id', studentId);

      if (error) throw error;
      return { success: true, data: { success: true } };
    } catch (error) {
      console.error('Error updating student status:', error);
      return { success: false, error: error.toString() };
    }
  }

  async updateStudentLevel(studentId: number, levelId: number): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const { error } = await this.client
        .from('student_info')
        .update({ current_level_id: levelId })
        .eq('student_id', studentId);

      if (error) throw error;
      return { success: true, data: { success: true } };
    } catch (error) {
      console.error('Error updating student level:', error);
      return { success: false, error: error.toString() };
    }
  }

  // ========================================================================
  // DASHBOARD
  // ========================================================================

  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    try {
      const [personnel, students, shows, classes, castRows, crewRows, bartenderRows, enrollRows] = await Promise.all([
        this.client.from('personnel').select('count', { count: 'exact' }),
        this.client.from('student_info').select('count', { count: 'exact' }),
        this.client.from('show_information').select('count', { count: 'exact' }),
        this.client.from('class_offerings').select('count', { count: 'exact' }),
        this.client.from('cast_member_info').select('CastMemberID', { count: 'exact' }),
        this.client.from('crew_duties').select('personnel_id'),
        this.client.from('bartenders').select('active'),
        this.client.from('student_enrollments').select('enrollment_id, status'),
      ]);

      const totalShows = shows.count || 0;
      const totalClasses = classes.count || 0;
      const totalStudents = students.count || 0;
      const totalPersonnel = personnel.count || 0;
      const totalCastMembers = castRows.count || (castRows.data || []).length;
      const totalCrewMembers = new Set((crewRows.data || []).map((r: any) => r.personnel_id)).size;
      const totalBartenders = (bartenderRows.data || []).length;
      const activeBartenders = (bartenderRows.data || []).filter((b: any) => b.active).length;
      const totalEnrollments = (enrollRows.data || []).length;

      return {
        success: true,
        data: {
          totalPersonnel,
          activeStudents: totalStudents,
          totalStudents,
          studentsActive: totalStudents,
          studentsInactive: 0,
          studentsGraduated: 0,
          scheduledShows: totalShows,
          canceledShows: 0,
          totalShows,
          nextShow: null,
          activeClasses: totalClasses,
          upcomingClasses: totalClasses,
          inProgressClasses: 0,
          completedClasses: 0,
          cancelledClasses: 0,
          totalClasses,
          totalEnrollments,
          classEnrollmentData: [],
          totalCastMembers,
          totalCrewMembers,
          totalBartenders,
          activeBartenders,
        },
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return { success: false, error: error.toString() };
    }
  }

  // ========================================================================
  // NOTES & PROGRESS
  // ========================================================================

  async getStudentNotesForStudent(studentId: number): Promise<ApiResponse<any[]>> {
    try {
      const enr = await this.client
        .from('student_enrollments')
        .select('enrollment_id')
        .eq('student_id', studentId);
      if (enr.error) throw enr.error;
      const enrollmentIds = (enr.data || []).map((r: any) => r.enrollment_id);
      if (enrollmentIds.length === 0) return { success: true, data: [] };

      const { data, error } = await this.client
        .from('student_progress_notes')
        .select('*')
        .in('enrollment_id', enrollmentIds)
        .order('note_date', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching student notes:', error);
      return { success: false, error: error.toString() };
    }
  }

  async getSkillRatingsForEnrollment(enrollmentId: number): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('student_competencies')
        .select(`
          *,
          skills(skill_name, skill_category_id),
          skill_categories!skills_skill_category_id_fkey(category_name)
        `)
        .eq('enrollment_id', enrollmentId);

      if (error) throw error;
      const transformed = (data || []).map((row: any) => ({
        ...row,
        SkillName: row.skills?.skill_name,
        CategoryName: row.skill_categories?.category_name,
      }));
      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching skill ratings:', error);
      return { success: false, error: error.toString() };
    }
  }

  async getSkillsWithCategories(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('skills')
        .select(`
          *,
          skill_categories(*)
        `)
        .order('skill_name');

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching skills:', error);
      return { success: false, error: error.toString() };
    }
  }

  async getAllStudentsWithDetails(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('student_info')
        .select(`
          student_id,
          personnel_id,
          enrollment_date,
          status,
          current_level_id,
          personnel(*),
          class_levels(level_name),
          student_enrollments(enrollment_id)
        `)
        .order('student_id', { ascending: true });

      if (error) throw error;

      const rows = (data || []).map((s: any) => ({
        StudentID: s.student_id,
        PersonnelID: s.personnel_id,
        FirstName: s.personnel?.first_name || '',
        LastName: s.personnel?.last_name || '',
        PrimaryEmail: s.personnel?.primary_email || '',
        PrimaryPhone: s.personnel?.primary_phone || '',
        Instagram: s.personnel?.instagram || '',
        Birthday: s.personnel?.birthday || '',
        EnrollmentDate: s.enrollment_date,
        StudentStatus: s.status || 'Active',
        CurrentLevel: s.current_level_id,
        CurrentLevelName: s.class_levels?.level_name || '',
        ClassesCompleted: 0,
        ActiveEnrollments: Array.isArray(s.student_enrollments) ? s.student_enrollments.length : 0,
      }));

      return { success: true, data: rows };
    } catch (error) {
      console.error('Error fetching students with details:', error);
      return { success: false, error: error.toString() };
    }
  }

  async getStudentProfileData(studentId: number): Promise<ApiResponse<any>> {
    try {
      const studentRes = await this.client
        .from('student_info')
        .select(`
          *,
          personnel(*)
        `)
        .eq('student_id', studentId)
        .single();

      if (studentRes.error) throw studentRes.error;
      const s = studentRes.data;

      const enrollmentsRes = await this.client
        .from('student_enrollments')
        .select('enrollment_id, offering_id, student_id, enrollment_date, status')
        .eq('student_id', studentId)
        .order('enrollment_date', { ascending: false });

      if (enrollmentsRes.error) throw enrollmentsRes.error;

      const offeringIds = Array.from(
        new Set((enrollmentsRes.data || []).map((row: any) => row.offering_id).filter(Boolean))
      );

      let offeringsMap = new Map<number, any>();
      if (offeringIds.length > 0) {
        const offeringsRes = await this.client
          .from('class_offerings')
          .select(`
            offering_id,
            start_date,
            end_date,
            class_levels(level_name),
            teachers(personnel_id, personnel(first_name, last_name)),
            rooms(room_name)
          `)
          .in('offering_id', offeringIds);

        if (offeringsRes.error) throw offeringsRes.error;

        offeringsMap = new Map(
          (offeringsRes.data || []).map((offering: any) => [offering.offering_id, offering])
        );
      }

      const progressionRes = await this.client
        .from('class_level_progression')
        .select(`
          progression_id,
          student_id,
          class_level_id,
          completion_date,
          status,
          class_levels(level_name, description)
        `)
        .eq('student_id', studentId)
        .order('completion_date', { ascending: false });

      const enrollments = (enrollmentsRes.data || []).map((e: any) => {
        const offering = offeringsMap.get(e.offering_id);
        const teacherName = offering?.teachers?.personnel
          ? `${offering.teachers.personnel.first_name || ''} ${offering.teachers.personnel.last_name || ''}`.trim()
          : '';

        return {
          EnrollmentID: e.enrollment_id,
          OfferingID: e.offering_id,
          StudentID: e.student_id,
          StudentPersonnelID: s.personnel_id,
          EnrollmentDate: e.enrollment_date,
          Status: e.status,
          ClassLevelName: offering?.class_levels?.level_name || '',
          TeacherName: teacherName,
          StartDate: offering?.start_date || '',
          EndDate: offering?.end_date || '',
          VenueOrRoom: offering?.rooms?.room_name || '',
        };
      });

      const progression = progressionRes.error
        ? []
        : (progressionRes.data || []).map((row: any) => ({
            ProgressionID: row.progression_id,
            StudentID: row.student_id,
            ClassLevelID: row.class_level_id,
            CompletionDate: row.completion_date,
            Status: row.status,
            LevelName: row.class_levels?.level_name || '',
            Description: row.class_levels?.description || '',
          }));

      return {
        success: true,
        data: {
          PersonnelID: s.personnel_id,
          FirstName: s.personnel?.first_name || '',
          LastName: s.personnel?.last_name || '',
          PrimaryEmail: s.personnel?.primary_email || '',
          PrimaryPhone: s.personnel?.primary_phone || '',
          Instagram: s.personnel?.instagram || '',
          Birthday: s.personnel?.birthday || '',
          StudentID: s.student_id,
          EnrollmentDate: s.enrollment_date,
          StudentStatus: s.status || 'Active',
          CurrentLevel: s.current_level_id,
          Enrollments: enrollments,
          Progression: progression,
        },
      };
    } catch (error) {
      console.error('Error fetching student profile data:', error);
      return { success: false, error: error.toString() };
    }
  }
}

export const supabaseService = new SupabaseService();

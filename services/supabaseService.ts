import { SupabaseClient } from '@supabase/supabase-js';
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
  MasterGame,
  MasterGameInput,
  ShowGame,
  Workshop,
  SpecialGuest,
  WorkshopRegistration,
  StudentInfo,
  ClassLevelProgression,
  Bartender,
  AppSetting,
  CrewAvailability,
  CrewShowAvailability,
  BartenderSlot,
  PerformerSelectionAvailability,
  PersonnelDeletionDependencies,
  PortalName,
  PortalAccessRole,
  PortalUserAccess,
  PortalCredentialProvisionInput,
  PortalCredentialProvisionResult,
} from '../types';
import { isSupabaseConfigured, supabase as sharedSupabaseClient } from './supabaseClient';

const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) {
    console.error('Supabase credentials not configured in environment variables');
    throw new Error('Missing Supabase configuration');
  }
  return sharedSupabaseClient;
};

class SupabaseService {
  private client: SupabaseClient;

  private getPortalResetRedirectUrl(portalName?: PortalName): { url?: string; error?: string } {
    if (!portalName) {
      return { url: window.location.origin };
    }

    const env = import.meta.env as Record<string, string | undefined>;
    const configuredUrls: Record<PortalName, string | undefined> = {
      team: env.VITE_TEAM_PORTAL_URL?.trim(),
      instructor: env.VITE_INSTRUCTOR_PORTAL_URL?.trim(),
      director: env.VITE_DIRECTOR_PORTAL_URL?.trim(),
      cast: env.VITE_CAST_PORTAL_URL?.trim(),
      student: env.VITE_STUDENT_PORTAL_URL?.trim(),
      crew: env.VITE_CREW_PORTAL_URL?.trim(),
    };

    const url = configuredUrls[portalName];

    if (url) {
      return { url };
    }

    if (portalName === 'team') {
      return { url: window.location.origin };
    }

    return {
      error: `Missing redirect URL for ${portalName} portal. Set VITE_${portalName.toUpperCase()}_PORTAL_URL.`,
    };
  }

  private toPersonnel(row: any): Personnel {
    return {
      PersonnelID: row.personnel_id,
      FirstName: row.first_name || '',
      LastName: row.last_name || '',
      PrimaryEmail: row.primary_email || '',
      PrimaryPhone: row.primary_phone || '',
      Instagram: row.instagram || '',
      Birthday: row.birthday || '',
      IsActive: row.active !== false,
    };
  }

  private toPortalAccess(row: any): PortalUserAccess {
    return {
      AccessID: row.access_id,
      AuthUserID: row.auth_user_id,
      PersonnelID: row.personnel_id,
      LoginEmail: row.login_email || '',
      PortalName: row.portal_name,
      PortalRole: row.portal_role,
      IsActive: row.is_active !== false,
      CreatedAt: row.created_at,
      UpdatedAt: row.updated_at,
      FirstName: row.personnel?.first_name || '',
      LastName: row.personnel?.last_name || '',
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return String(error);
  }

  private parseShowId(showId: string | number): number {
    const parsed = typeof showId === 'number' ? showId : Number.parseInt(String(showId), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error('Invalid show id.');
    }
    return parsed;
  }

  private parseSettingNumber(value: string | null | undefined, fallback: number): number {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private toShowDateTime(showDate: string | null | undefined, showTime: string | null | undefined): Date | null {
    const date = String(showDate || '').slice(0, 10);
    if (!date) return null;
    const time = String(showTime || '').trim() || '00:00:00';
    const candidate = new Date(`${date}T${time}`);
    return Number.isNaN(candidate.getTime()) ? null : candidate;
  }

  private compareBartenderPriority(claimantDate?: string | null, currentDate?: string | null): number {
    if (!claimantDate && !currentDate) return 0;
    if (!claimantDate) return -1;
    if (!currentDate) return 1;

    const claimantTime = new Date(claimantDate).getTime();
    const currentTime = new Date(currentDate).getTime();
    if (Number.isNaN(claimantTime) || Number.isNaN(currentTime)) return 0;
    return claimantTime - currentTime;
  }

  private async getCurrentPersonnelIdForPortal(portalName: PortalName): Promise<number | null> {
    const userResult = await this.client.auth.getUser();
    const authUserId = userResult.data.user?.id;
    if (!authUserId) return null;

    const { data, error } = await this.client
      .from('portal_user_access')
      .select('personnel_id')
      .eq('auth_user_id', authUserId)
      .eq('portal_name', portalName)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data?.personnel_id ?? null;
  }

  private toMasterGame(row: any): MasterGame {
    return {
      GameID: row.game_id,
      GameName: row.game_name,
      Description: row.description || row.short_description || row['SHORT DESCRIPTION'] || '',
      HowToPlay:
        row.description ||
        row.how_to_play ||
        row.setup_edits_stage_direction ||
        row.setup_notes ||
        row['SETUP / EDITS / STAGE DIRECTION'] ||
        '',
      SetupNotes: row.setup_notes || row['SETUP / EDITS / STAGE DIRECTION'] || '',
      PlayerCount: row.player_count ?? row.difficulty_level ?? null,
      Format: row.format || row.short_long_form || row['Short/Long Form'] || '',
      Category: row.category || row.game_type || row.GameType || '',
      DifficultyLevel: row.difficulty_level ?? null,
    };
  }

  private toMasterGameMutationPayload(input: MasterGameInput) {
    const mergedDescriptionParts = [input.Description, input.HowToPlay]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));

    const mergedDescription = mergedDescriptionParts.length > 0
      ? mergedDescriptionParts.join('\n\n')
      : null;

    const parsedPlayerCount =
      input.PlayerCount == null || String(input.PlayerCount).trim() === ''
        ? null
        : Number.parseInt(String(input.PlayerCount).trim(), 10);

    const normalizedFormat = input.Format?.trim().toLowerCase();
    const format = normalizedFormat === 'short'
      ? 'Short'
      : normalizedFormat === 'long'
        ? 'Long'
        : null;

    return {
      game_name: input.GameName.trim(),
      description: mergedDescription,
      player_count: Number.isNaN(parsedPlayerCount as number) ? null : parsedPlayerCount,
      format,
      category: input.Category?.trim() || null,
    };
  }

  private toLegacyMasterGameMutationPayload(input: MasterGameInput) {
    const mergedDescriptionParts = [input.Description, input.HowToPlay]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));

    const mergedDescription = mergedDescriptionParts.length > 0
      ? mergedDescriptionParts.join('\n\n')
      : null;

    const parsedPlayerCount =
      input.PlayerCount == null || String(input.PlayerCount).trim() === ''
        ? null
        : Number.parseInt(String(input.PlayerCount).trim(), 10);

    return {
      game_name: input.GameName.trim(),
      description: mergedDescription,
      category: input.Category?.trim() || null,
      difficulty_level: Number.isNaN(parsedPlayerCount as number) ? null : parsedPlayerCount,
    };
  }

  private isMissingMasterGameColumnError(error: unknown): boolean {
    const message = this.getErrorMessage(error).toLowerCase();
    return (
      message.includes('master_game_list')
      && (
        message.includes('schema cache')
        || (message.includes('column') && message.includes('does not exist'))
      )
    );
  }

  private isMissingRelationError(error: unknown, tableName: string): boolean {
    const message = this.getErrorMessage(error).toLowerCase();
    const normalizedTable = tableName.toLowerCase();
    return (
      message.includes(`relation "${normalizedTable}" does not exist`)
      || (message.includes(normalizedTable) && message.includes('does not exist'))
    );
  }

  private isMissingColumnError(error: unknown, columnName: string): boolean {
    const message = this.getErrorMessage(error).toLowerCase();
    const normalizedColumn = columnName.toLowerCase();
    return message.includes(normalizedColumn) && message.includes('does not exist');
  }

  private async isCastMember(personnelId: number): Promise<boolean> {
    const { data, error } = await this.client
      .from('cast_member_info')
      .select('CastMemberID')
      .eq('PersonnelID', personnelId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
  }

  private async isStudent(personnelId: number): Promise<boolean> {
    const { data, error } = await this.client
      .from('student_info')
      .select('student_id')
      .eq('personnel_id', personnelId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data);
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
  // APP SETTINGS
  // ========================================================================

  async getAppSettings(): Promise<ApiResponse<AppSetting[]>> {
    try {
      const { data, error } = await this.client
        .from('app_settings')
        .select('setting_key, setting_value, description, updated_at')
        .order('setting_key', { ascending: true });

      if (error) throw error;
      return {
        success: true,
        data: (data || []).map((row: any) => ({
          setting_key: row.setting_key,
          setting_value: String(row.setting_value ?? ''),
          description: row.description || '',
          updated_at: row.updated_at,
        })),
      };
    } catch (error) {
      console.error('Error fetching app settings:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async updateAppSetting(key: string, value: string): Promise<ApiResponse<void>> {
    try {
      const normalizedKey = key.trim();
      const normalizedValue = value.trim();

      if (!normalizedKey || !normalizedValue) {
        return { success: false, error: 'Setting key and value are required.' };
      }

      const { error } = await this.client
        .from('app_settings')
        .update({ setting_value: normalizedValue, updated_at: new Date().toISOString() })
        .eq('setting_key', normalizedKey);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating app setting:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // ========================================================================
  // CREW DUTY AVAILABILITY + BARTENDER SLOT
  // ========================================================================

  async getCrewAvailabilityForShow(showId: string): Promise<ApiResponse<CrewAvailability[]>> {
    try {
      const parsedShowId = this.parseShowId(showId);
      const { data, error } = await this.client
        .from('crew_availability')
        .select('id, show_id, personnel_id, role, status, created_at, updated_at, personnel:personnel_id(first_name,last_name)')
        .eq('show_id', parsedShowId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return {
        success: true,
        data: (data || []).map((row: any) => ({
          id: row.id,
          show_id: row.show_id,
          personnel_id: row.personnel_id,
          role: row.role,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
          personnel: row.personnel
            ? {
                first_name: row.personnel.first_name || '',
                last_name: row.personnel.last_name || '',
              }
            : undefined,
        })),
      };
    } catch (error) {
      console.error('Error fetching crew availability:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getCrewShowAvailabilityForShow(showId: string): Promise<ApiResponse<CrewShowAvailability[]>> {
    try {
      const parsedShowId = this.parseShowId(showId);
      const { data, error } = await this.client
        .from('crew_show_availability')
        .select('id, show_id, personnel_id, status, availability_note, preferred_crew_duty, created_at, updated_at, personnel:personnel_id(first_name,last_name)')
        .eq('show_id', parsedShowId)
        .order('created_at', { ascending: true });

      if (error) {
        if (this.isMissingColumnError(error, 'preferred_crew_duty')) {
          const fallback = await this.client
            .from('crew_show_availability')
            .select('id, show_id, personnel_id, status, availability_note, created_at, updated_at, personnel:personnel_id(first_name,last_name)')
            .eq('show_id', parsedShowId)
            .order('created_at', { ascending: true });

          if (fallback.error) {
            if (this.isMissingRelationError(fallback.error, 'crew_show_availability')) {
              return { success: true, data: [] };
            }
            throw fallback.error;
          }

          return {
            success: true,
            data: (fallback.data || []).map((row: any) => ({
              id: row.id,
              show_id: row.show_id,
              personnel_id: row.personnel_id,
              status: row.status,
              availability_note: row.availability_note || null,
              preferred_crew_duty: null,
              created_at: row.created_at,
              updated_at: row.updated_at,
              personnel: row.personnel
                ? {
                    first_name: row.personnel.first_name || '',
                    last_name: row.personnel.last_name || '',
                  }
                : undefined,
            })),
          };
        }

        if (this.isMissingRelationError(error, 'crew_show_availability')) {
          return { success: true, data: [] };
        }
        throw error;
      }

      return {
        success: true,
        data: (data || []).map((row: any) => ({
          id: row.id,
          show_id: row.show_id,
          personnel_id: row.personnel_id,
          status: row.status,
          availability_note: row.availability_note || null,
          preferred_crew_duty: row.preferred_crew_duty || null,
          created_at: row.created_at,
          updated_at: row.updated_at,
          personnel: row.personnel
            ? {
                first_name: row.personnel.first_name || '',
                last_name: row.personnel.last_name || '',
              }
            : undefined,
        })),
      };
    } catch (error) {
      console.error('Error fetching crew show availability:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getPerformerSelectionAvailabilityForShow(showId: string): Promise<ApiResponse<PerformerSelectionAvailability[]>> {
    try {
      const parsedShowId = this.parseShowId(showId);
      const { data, error } = await this.client
        .from('show_availability')
        .select('personnel_id,availability_status,availability_note')
        .eq('show_id', parsedShowId);

      if (error) {
        if (this.isMissingRelationError(error, 'show_availability')) {
          return { success: true, data: [] };
        }
        throw error;
      }

      return {
        success: true,
        data: (data || []).map((row: any) => ({
          personnel_id: Number(row.personnel_id),
          availability_status: row.availability_status || null,
          availability_note: row.availability_note || null,
        })),
      };
    } catch (error) {
      console.error('Error fetching performer selection availability:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async upsertCrewAvailability(
    showId: string,
    personnelId: string,
    role: 'Tech' | 'House' | 'Box',
    status: string,
  ): Promise<ApiResponse<void>> {
    try {
      const parsedShowId = this.parseShowId(showId);
      const parsedPersonnelId = Number.parseInt(personnelId, 10);

      if (!Number.isFinite(parsedPersonnelId) || parsedPersonnelId <= 0) {
        return { success: false, error: 'Invalid personnel id.' };
      }

      const normalizedStatus = status as CrewAvailability['status'];
      if (!['available', 'confirmed', 'not_available'].includes(normalizedStatus)) {
        return { success: false, error: 'Invalid availability status.' };
      }

      const { error } = await this.client
        .from('crew_availability')
        .upsert(
          {
            show_id: parsedShowId,
            personnel_id: parsedPersonnelId,
            role,
            status: normalizedStatus,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'show_id,personnel_id,role' },
        );

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error upserting crew availability:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async confirmCrewSlot(crewAvailabilityId: string): Promise<ApiResponse<void>> {
    try {
      const { data: target, error: targetError } = await this.client
        .from('crew_availability')
        .select('id, show_id, role')
        .eq('id', crewAvailabilityId)
        .single();

      if (targetError) throw targetError;

      const { error: resetError } = await this.client
        .from('crew_availability')
        .update({ status: 'available', updated_at: new Date().toISOString() })
        .eq('show_id', target.show_id)
        .eq('role', target.role)
        .neq('id', crewAvailabilityId)
        .eq('status', 'confirmed');
      if (resetError) throw resetError;

      const { error } = await this.client
        .from('crew_availability')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', crewAvailabilityId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error confirming crew slot:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getBartenderSlot(showId: string): Promise<ApiResponse<BartenderSlot | null>> {
    try {
      const parsedShowId = this.parseShowId(showId);
      const { data, error } = await this.client
        .from('bartender_slot')
        .select('id, show_id, personnel_id, is_locked, claimed_at, updated_at, personnel:personnel_id(first_name,last_name)')
        .eq('show_id', parsedShowId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { success: true, data: null };

      return {
        success: true,
        data: {
          id: data.id,
          show_id: data.show_id,
          personnel_id: data.personnel_id,
          is_locked: data.is_locked,
          claimed_at: data.claimed_at,
          updated_at: data.updated_at,
          personnel: data.personnel
            ? {
                first_name: data.personnel.first_name || '',
                last_name: data.personnel.last_name || '',
              }
            : undefined,
        },
      };
    } catch (error) {
      console.error('Error fetching bartender slot:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async syncBartenderSlotFromCrewAvailability(showId: string): Promise<ApiResponse<{ updated: boolean; selectedPersonnelId: number | null; reason?: string }>> {
    try {
      const parsedShowId = this.parseShowId(showId);
      const nowIso = new Date().toISOString();

      const [{ data: showRow, error: showError }, { data: settings }, { data: slotRow, error: slotError }] = await Promise.all([
        this.client.from('show_information').select('show_date, show_time').eq('show_id', parsedShowId).maybeSingle(),
        this.client.from('app_settings').select('setting_key, setting_value').eq('setting_key', 'bartender_bump_cutoff_hours').maybeSingle(),
        this.client.from('bartender_slot').select('id, personnel_id, is_locked, claimed_at, updated_at').eq('show_id', parsedShowId).maybeSingle(),
      ]);

      if (showError) throw showError;
      if (slotError) throw slotError;
      if (!showRow) {
        return { success: false, error: 'Show not found.' };
      }

      if (slotRow?.is_locked) {
        return { success: true, data: { updated: false, selectedPersonnelId: slotRow.personnel_id ?? null, reason: 'locked' } };
      }

      const { data: interestedRows, error: interestedError } = await this.client
        .from('crew_show_availability')
        .select('personnel_id,status,preferred_crew_duty,updated_at')
        .eq('show_id', parsedShowId)
        .eq('status', 'available')
        .eq('preferred_crew_duty', 'bartender');

      if (interestedError) {
        if (this.isMissingRelationError(interestedError, 'crew_show_availability') || this.isMissingColumnError(interestedError, 'preferred_crew_duty')) {
          return { success: true, data: { updated: false, selectedPersonnelId: slotRow?.personnel_id ?? null, reason: 'crew availability schema unavailable' } };
        }
        throw interestedError;
      }

      const interestedIds = Array.from(new Set((interestedRows || [])
        .map((row: any) => Number(row.personnel_id))
        .filter((id: number) => Number.isFinite(id) && id > 0)));

      const latestInterestUpdatedAtMs = (interestedRows || []).reduce((latest: number, row: any) => {
        const ms = row?.updated_at ? new Date(String(row.updated_at)).getTime() : Number.NaN;
        if (!Number.isFinite(ms)) return latest;
        return ms > latest ? ms : latest;
      }, Number.NEGATIVE_INFINITY);

      if (interestedIds.length === 0) {
        return { success: true, data: { updated: false, selectedPersonnelId: slotRow?.personnel_id ?? null, reason: 'no bartender interest' } };
      }

      const slotLastChangedMs = slotRow?.updated_at
        ? new Date(String(slotRow.updated_at)).getTime()
        : slotRow?.claimed_at
          ? new Date(String(slotRow.claimed_at)).getTime()
          : Number.NaN;

      if (slotRow?.personnel_id && Number.isFinite(slotLastChangedMs) && Number.isFinite(latestInterestUpdatedAtMs) && latestInterestUpdatedAtMs <= slotLastChangedMs) {
        return {
          success: true,
          data: {
            updated: false,
            selectedPersonnelId: Number(slotRow.personnel_id),
            reason: 'no new bartender interest since last slot update',
          },
        };
      }

      const { data: bartenderRows, error: bartenderError } = await this.client
        .from('bartenders')
        .select('personnel_id,active')
        .in('personnel_id', interestedIds);
      if (bartenderError) throw bartenderError;

      const activeBartenderIds = new Set<number>((bartenderRows || [])
        .filter((row: any) => row.active !== false)
        .map((row: any) => Number(row.personnel_id))
        .filter((id: number) => Number.isFinite(id) && id > 0));

      const eligibleIds = interestedIds.filter((id) => activeBartenderIds.has(id));
      if (eligibleIds.length === 0) {
        return { success: true, data: { updated: false, selectedPersonnelId: slotRow?.personnel_id ?? null, reason: 'no active bartender candidates' } };
      }

      const targetShowDate = String(showRow.show_date || '').slice(0, 10);
      const targetDateMs = targetShowDate ? new Date(`${targetShowDate}T00:00:00`).getTime() : Number.NaN;

      const priorityIds = Array.from(new Set([
        ...eligibleIds,
        ...(slotRow?.personnel_id ? [Number(slotRow.personnel_id)] : []),
      ].filter((id) => Number.isFinite(id) && id > 0)));

      const { data: personnelRows, error: personnelError } = await this.client
        .from('personnel')
        .select('personnel_id,last_bartended_date')
        .in('personnel_id', priorityIds);
      if (personnelError) throw personnelError;

      const lastBartendedByPersonId = new Map<number, string | null>();
      (personnelRows || []).forEach((row: any) => {
        lastBartendedByPersonId.set(Number(row.personnel_id), row.last_bartended_date || null);
      });

      const priorShowsResult = await this.client
        .from('show_information')
        .select('show_id,show_date')
        .lt('show_date', targetShowDate)
        .order('show_date', { ascending: false });
      if (priorShowsResult.error) throw priorShowsResult.error;

      const priorShowIds = (priorShowsResult.data || []).map((row: any) => Number(row.show_id)).filter((id: number) => Number.isFinite(id) && id > 0);
      const priorShowDateById = new Map<number, string>();
      (priorShowsResult.data || []).forEach((row: any) => {
        priorShowDateById.set(Number(row.show_id), String(row.show_date || '').slice(0, 10));
      });

      const recentAssignedByPersonId = new Map<number, string | null>();
      if (priorShowIds.length > 0 && priorityIds.length > 0) {
        const assignmentsResult = await this.client
          .from('bartender_slot')
          .select('personnel_id,show_id')
          .in('personnel_id', priorityIds)
          .in('show_id', priorShowIds);
        if (assignmentsResult.error) throw assignmentsResult.error;

        (assignmentsResult.data || []).forEach((row: any) => {
          const personnelId = Number(row.personnel_id);
          const showDate = priorShowDateById.get(Number(row.show_id));
          if (!Number.isFinite(personnelId) || !showDate) return;

          const existing = recentAssignedByPersonId.get(personnelId);
          if (!existing || showDate > existing) {
            recentAssignedByPersonId.set(personnelId, showDate);
          }
        });
      }

      const getEffectivePriorityTime = (personnelId: number) => {
        const historyDate = lastBartendedByPersonId.get(personnelId);
        const assignedDate = recentAssignedByPersonId.get(personnelId);
        const historyMs = historyDate ? new Date(historyDate).getTime() : Number.NaN;
        const assignedMs = assignedDate ? new Date(`${assignedDate}T00:00:00`).getTime() : Number.NaN;
        if (Number.isNaN(historyMs) && Number.isNaN(assignedMs)) return Number.NEGATIVE_INFINITY;
        if (Number.isNaN(historyMs)) return assignedMs;
        if (Number.isNaN(assignedMs)) return historyMs;
        return Math.max(historyMs, assignedMs);
      };

      const isBackToBack = (personnelId: number) => {
        if (!Number.isFinite(targetDateMs)) return false;
        const recentAssigned = recentAssignedByPersonId.get(personnelId);
        if (!recentAssigned) return false;
        const recentMs = new Date(`${recentAssigned}T00:00:00`).getTime();
        if (!Number.isFinite(recentMs)) return false;
        const dayMs = 24 * 60 * 60 * 1000;
        return (targetDateMs - recentMs) > 0 && (targetDateMs - recentMs) <= dayMs;
      };

      const nonBackToBackExists = eligibleIds.some((id) => !isBackToBack(id));

      const sortedCandidates = [...eligibleIds].sort((a, b) => {
        const aBackToBack = nonBackToBackExists && isBackToBack(a) ? 1 : 0;
        const bBackToBack = nonBackToBackExists && isBackToBack(b) ? 1 : 0;
        if (aBackToBack !== bBackToBack) return aBackToBack - bBackToBack;
        return getEffectivePriorityTime(a) - getEffectivePriorityTime(b);
      });

      const bestCandidateId = sortedCandidates[0] ?? null;
      if (!bestCandidateId) {
        return { success: true, data: { updated: false, selectedPersonnelId: slotRow?.personnel_id ?? null, reason: 'no eligible bartender candidate' } };
      }

      const cutoffHours = this.parseSettingNumber(settings?.setting_value, 72);
      const showDateTime = this.toShowDateTime(showRow.show_date, showRow.show_time);
      const withinCutoff = (() => {
        if (!showDateTime) return false;
        const cutoff = new Date(showDateTime);
        cutoff.setHours(cutoff.getHours() - cutoffHours);
        return new Date() >= cutoff;
      })();

      if (!slotRow) {
        const { error: createError } = await this.client
          .from('bartender_slot')
          .insert({
            show_id: parsedShowId,
            personnel_id: bestCandidateId,
            is_locked: false,
            claimed_at: nowIso,
            updated_at: nowIso,
          });
        if (createError) throw createError;
        return { success: true, data: { updated: true, selectedPersonnelId: bestCandidateId } };
      }

      const currentHolderId = slotRow.personnel_id ? Number(slotRow.personnel_id) : null;
      if (currentHolderId === bestCandidateId) {
        return { success: true, data: { updated: false, selectedPersonnelId: currentHolderId } };
      }

      if (currentHolderId && withinCutoff) {
        return { success: true, data: { updated: false, selectedPersonnelId: currentHolderId, reason: 'cutoff passed' } };
      }

      if (currentHolderId) {
        const currentBackToBack = nonBackToBackExists && isBackToBack(currentHolderId) ? 1 : 0;
        const bestBackToBack = nonBackToBackExists && isBackToBack(bestCandidateId) ? 1 : 0;
        const currentScore = [currentBackToBack, getEffectivePriorityTime(currentHolderId)];
        const bestScore = [bestBackToBack, getEffectivePriorityTime(bestCandidateId)];
        const bestIsBetter = bestScore[0] < currentScore[0] || (bestScore[0] === currentScore[0] && bestScore[1] < currentScore[1]);
        if (!bestIsBetter) {
          return { success: true, data: { updated: false, selectedPersonnelId: currentHolderId, reason: 'current slot holder keeps priority' } };
        }
      }

      const { error: updateError } = await this.client
        .from('bartender_slot')
        .update({
          personnel_id: bestCandidateId,
          claimed_at: nowIso,
          updated_at: nowIso,
        })
        .eq('show_id', parsedShowId)
        .eq('is_locked', false);
      if (updateError) throw updateError;

      return { success: true, data: { updated: true, selectedPersonnelId: bestCandidateId } };
    } catch (error) {
      console.error('Error syncing bartender slot from crew availability:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async claimBartenderSlot(showId: string, personnelId: string): Promise<ApiResponse<void>> {
    try {
      const parsedShowId = this.parseShowId(showId);
      const parsedPersonnelId = Number.parseInt(personnelId, 10);
      if (!Number.isFinite(parsedPersonnelId) || parsedPersonnelId <= 0) {
        return { success: false, error: 'Invalid personnel id.' };
      }

      const [{ data: settings }, { data: showRow, error: showError }, { data: bartenderRow, error: bartenderError }] = await Promise.all([
        this.client.from('app_settings').select('setting_key, setting_value').eq('setting_key', 'bartender_bump_cutoff_hours').maybeSingle(),
        this.client.from('show_information').select('show_date, show_time').eq('show_id', parsedShowId).maybeSingle(),
        this.client.from('bartenders').select('personnel_id, active').eq('personnel_id', parsedPersonnelId).maybeSingle(),
      ]);

      if (showError) throw showError;
      if (!showRow) return { success: false, error: 'Show not found.' };
      if (bartenderError) throw bartenderError;
      if (!bartenderRow || bartenderRow.active === false) {
        return { success: false, error: 'Only active bartenders can claim this slot.' };
      }

      const cutoffHours = this.parseSettingNumber(settings?.setting_value, 72);
      const showDateTime = this.toShowDateTime(showRow.show_date, showRow.show_time);
      if (showDateTime) {
        const cutoff = new Date(showDateTime);
        cutoff.setHours(cutoff.getHours() - cutoffHours);
        if (new Date() >= cutoff) {
          return { success: false, error: 'Bartender bump window is closed for this show.' };
        }
      }

      const slotResult = await this.getBartenderSlot(String(parsedShowId));
      if (!slotResult.success) {
        return { success: false, error: slotResult.error || 'Failed to read bartender slot.' };
      }

      if (!slotResult.data) {
        const { error: createError } = await this.client
          .from('bartender_slot')
          .insert({
            show_id: parsedShowId,
            personnel_id: parsedPersonnelId,
            is_locked: false,
            claimed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        if (createError) throw createError;
        return { success: true };
      }

      if (slotResult.data.is_locked) {
        return { success: false, error: 'This bartender slot is locked by Team.' };
      }

      const currentHolderId = slotResult.data.personnel_id;
      if (currentHolderId === parsedPersonnelId) {
        return { success: true };
      }

      if (currentHolderId) {
        const { data: priorityRows, error: priorityError } = await this.client
          .from('personnel')
          .select('personnel_id,last_bartended_date')
          .in('personnel_id', [parsedPersonnelId, currentHolderId]);

        if (priorityError) throw priorityError;

        const claimantPriority = (priorityRows || []).find((row: any) => row.personnel_id === parsedPersonnelId)?.last_bartended_date;
        const currentPriority = (priorityRows || []).find((row: any) => row.personnel_id === currentHolderId)?.last_bartended_date;

        const targetShowDate = String(showRow.show_date || '').slice(0, 10);
        const priorShowsResult = await this.client
          .from('show_information')
          .select('show_id,show_date')
          .lt('show_date', targetShowDate)
          .order('show_date', { ascending: false });
        if (priorShowsResult.error) throw priorShowsResult.error;

        const priorShowDateById = new Map<number, string>();
        (priorShowsResult.data || []).forEach((row: any) => {
          priorShowDateById.set(Number(row.show_id), String(row.show_date || '').slice(0, 10));
        });

        const priorShowIds = Array.from(priorShowDateById.keys());
        const assignmentsResult = priorShowIds.length === 0
          ? { data: [] as any[], error: null }
          : await this.client
              .from('bartender_slot')
              .select('personnel_id,show_id')
              .in('personnel_id', [parsedPersonnelId, currentHolderId])
              .in('show_id', priorShowIds);
        if (assignmentsResult.error) throw assignmentsResult.error;

        let claimantRecentAssigned: string | null = null;
        let currentRecentAssigned: string | null = null;
        (assignmentsResult.data || []).forEach((row: any) => {
          const pid = Number(row.personnel_id);
          const showDate = priorShowDateById.get(Number(row.show_id));
          if (!showDate) return;
          if (pid === parsedPersonnelId && (!claimantRecentAssigned || showDate > claimantRecentAssigned)) {
            claimantRecentAssigned = showDate;
          }
          if (pid === currentHolderId && (!currentRecentAssigned || showDate > currentRecentAssigned)) {
            currentRecentAssigned = showDate;
          }
        });

        const targetDateMs = targetShowDate ? new Date(`${targetShowDate}T00:00:00`).getTime() : Number.NaN;
        const claimantBackToBack = claimantRecentAssigned
          ? (() => {
              const recentMs = new Date(`${claimantRecentAssigned as string}T00:00:00`).getTime();
              const dayMs = 24 * 60 * 60 * 1000;
              return Number.isFinite(targetDateMs) && Number.isFinite(recentMs) && (targetDateMs - recentMs) > 0 && (targetDateMs - recentMs) <= dayMs;
            })()
          : false;
        const currentHolderBackToBack = currentRecentAssigned
          ? (() => {
              const recentMs = new Date(`${currentRecentAssigned as string}T00:00:00`).getTime();
              const dayMs = 24 * 60 * 60 * 1000;
              return Number.isFinite(targetDateMs) && Number.isFinite(recentMs) && (targetDateMs - recentMs) > 0 && (targetDateMs - recentMs) <= dayMs;
            })()
          : false;

        const claimantPriorityMs = claimantPriority ? new Date(claimantPriority).getTime() : Number.NaN;
        const currentPriorityMs = currentPriority ? new Date(currentPriority).getTime() : Number.NaN;
        const claimantRecentMs = claimantRecentAssigned ? new Date(`${claimantRecentAssigned}T00:00:00`).getTime() : Number.NaN;
        const currentRecentMs = currentRecentAssigned ? new Date(`${currentRecentAssigned}T00:00:00`).getTime() : Number.NaN;
        const claimantEffective = Number.isNaN(claimantPriorityMs)
          ? (Number.isNaN(claimantRecentMs) ? Number.NEGATIVE_INFINITY : claimantRecentMs)
          : (Number.isNaN(claimantRecentMs) ? claimantPriorityMs : Math.max(claimantPriorityMs, claimantRecentMs));
        const currentEffective = Number.isNaN(currentPriorityMs)
          ? (Number.isNaN(currentRecentMs) ? Number.NEGATIVE_INFINITY : currentRecentMs)
          : (Number.isNaN(currentRecentMs) ? currentPriorityMs : Math.max(currentPriorityMs, currentRecentMs));

        if (claimantBackToBack && !currentHolderBackToBack) {
          return {
            success: false,
            error: 'You cannot take this bartender slot because you already hold the most recent previous bartender assignment.',
          };
        }

        const compare = this.compareBartenderPriority(claimantPriority, currentPriority);

        if (compare > 0 || claimantEffective > currentEffective) {
          return {
            success: false,
            error: 'You cannot bump the current bartender because they have equal or higher priority.',
          };
        }
      }

      const { error } = await this.client
        .from('bartender_slot')
        .update({
          personnel_id: parsedPersonnelId,
          claimed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('show_id', parsedShowId)
        .eq('is_locked', false);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error claiming bartender slot:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async relinquishBartenderSlot(showId: string): Promise<ApiResponse<void>> {
    try {
      const parsedShowId = this.parseShowId(showId);
      const currentPersonnelId =
        (await this.getCurrentPersonnelIdForPortal('cast'))
        || (await this.getCurrentPersonnelIdForPortal('crew'));
      if (!currentPersonnelId) {
        return { success: false, error: 'Unable to resolve your cast or crew profile for this account.' };
      }

      const [{ data: settings }, { data: showRow, error: showError }] = await Promise.all([
        this.client.from('app_settings').select('setting_key, setting_value').eq('setting_key', 'bartender_bump_cutoff_hours').maybeSingle(),
        this.client.from('show_information').select('show_date, show_time').eq('show_id', parsedShowId).maybeSingle(),
      ]);

      if (showError) throw showError;

      const cutoffHours = this.parseSettingNumber(settings?.setting_value, 72);
      const showDateTime = this.toShowDateTime(showRow?.show_date, showRow?.show_time);
      if (showDateTime) {
        const cutoff = new Date(showDateTime);
        cutoff.setHours(cutoff.getHours() - cutoffHours);
        if (new Date() >= cutoff) {
          return { success: false, error: 'Bartender bump window is closed for this show.' };
        }
      }

      const { error } = await this.client
        .from('bartender_slot')
        .update({
          personnel_id: null,
          claimed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('show_id', parsedShowId)
        .eq('personnel_id', currentPersonnelId)
        .eq('is_locked', false);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error relinquishing bartender slot:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async lockBartenderSlot(showId: string, lock: boolean): Promise<ApiResponse<void>> {
    try {
      const parsedShowId = this.parseShowId(showId);

      const { data: existing, error: existingError } = await this.client
        .from('bartender_slot')
        .select('id')
        .eq('show_id', parsedShowId)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        const { error } = await this.client
          .from('bartender_slot')
          .update({ is_locked: lock, updated_at: new Date().toISOString() })
          .eq('show_id', parsedShowId);
        if (error) throw error;
      } else {
        const { error } = await this.client
          .from('bartender_slot')
          .insert({
            show_id: parsedShowId,
            is_locked: lock,
            updated_at: new Date().toISOString(),
          });
        if (error) throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating bartender lock state:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async adminAssignBartender(showId: string, personnelId: string): Promise<ApiResponse<void>> {
    try {
      const parsedShowId = this.parseShowId(showId);
      const parsedPersonnelId = Number.parseInt(personnelId, 10);

      if (!Number.isFinite(parsedPersonnelId) || parsedPersonnelId <= 0) {
        return { success: false, error: 'Invalid personnel id.' };
      }

      const { data: existing, error: existingError } = await this.client
        .from('bartender_slot')
        .select('id')
        .eq('show_id', parsedShowId)
        .maybeSingle();
      if (existingError) throw existingError;

      if (existing) {
        const { error } = await this.client
          .from('bartender_slot')
          .update({
            personnel_id: parsedPersonnelId,
            claimed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('show_id', parsedShowId);
        if (error) throw error;
      } else {
        const { error } = await this.client
          .from('bartender_slot')
          .insert({
            show_id: parsedShowId,
            personnel_id: parsedPersonnelId,
            claimed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        if (error) throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error assigning bartender slot:', error);
      return { success: false, error: this.getErrorMessage(error) };
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

  async getPortalUserAccess(): Promise<ApiResponse<PortalUserAccess[]>> {
    try {
      const { data, error } = await this.client
        .from('portal_user_access')
        .select('*, personnel:personnel_id(first_name,last_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: (data || []).map((row: any) => this.toPortalAccess(row)) };
    } catch (error) {
      console.error('Error fetching portal access rows:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async upsertPortalUserAccess(input: {
    personnelId?: number | null;
    loginEmail: string;
    portalName: PortalName;
    portalRole: PortalAccessRole;
    isActive?: boolean;
  }): Promise<ApiResponse<PortalUserAccess>> {
    try {
      const normalizedEmail = input.loginEmail.trim().toLowerCase();
      if (!normalizedEmail) {
        return { success: false, error: 'Login email is required.' };
      }

      const payload = {
        personnel_id: input.personnelId ?? null,
        login_email: normalizedEmail,
        portal_name: input.portalName,
        portal_role: input.portalRole,
        is_active: input.isActive ?? true,
      };

      const rpcPayload = {
        p_login_email: normalizedEmail,
        p_portal_name: input.portalName,
        p_portal_role: input.portalRole,
        p_personnel_id: input.personnelId ?? null,
        p_is_active: input.isActive ?? true,
      };

      const rpcResult = await this.client
        .rpc('upsert_portal_user_access_admin', rpcPayload)
        .single();

      if (!rpcResult.error && rpcResult.data) {
        const { data: hydratedRow, error: hydratedError } = await this.client
          .from('portal_user_access')
          .select('*, personnel:personnel_id(first_name,last_name)')
          .eq('access_id', rpcResult.data.access_id)
          .single();

        if (hydratedError) throw hydratedError;
        return { success: true, data: this.toPortalAccess(hydratedRow) };
      }

      const rpcMessage = rpcResult.error?.message || '';
      const isMissingRpc = /upsert_portal_user_access_admin/i.test(rpcMessage)
        && /not found|does not exist|Could not find/i.test(rpcMessage);

      if (rpcResult.error && !isMissingRpc) {
        throw rpcResult.error;
      }

      const { data, error } = await this.client
        .from('portal_user_access')
        .upsert(payload, { onConflict: 'login_email,portal_name' })
        .select('*, personnel:personnel_id(first_name,last_name)')
        .single();

      if (error) throw error;
      return { success: true, data: this.toPortalAccess(data) };
    } catch (error) {
      console.error('Error upserting portal access row:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async setPortalAccessActive(accessId: string, isActive: boolean): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await this.client
        .from('portal_user_access')
        .update({ is_active: isActive })
        .eq('access_id', accessId);

      if (error) throw error;
      return { success: true, data: true };
    } catch (error) {
      console.error('Error updating portal access status:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async sendPasswordResetEmail(loginEmail: string, portalName?: PortalName): Promise<ApiResponse<boolean>> {
    try {
      const normalizedEmail = loginEmail.trim().toLowerCase();
      if (!normalizedEmail) {
        return { success: false, error: 'Login email is required.' };
      }

      const redirect = this.getPortalResetRedirectUrl(portalName);
      if (!redirect.url) {
        return { success: false, error: redirect.error || 'Password reset redirect URL is not configured.' };
      }

      const { error } = await this.client.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirect.url,
      });

      if (error) throw error;
      return { success: true, data: true };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async provisionPortalUserCredentials(
    input: PortalCredentialProvisionInput,
  ): Promise<ApiResponse<PortalCredentialProvisionResult>> {
    try {
      const normalizedEmail = input.loginEmail.trim().toLowerCase();
      if (!normalizedEmail) {
        return { success: false, error: 'Login email is required.' };
      }

      if (!input.useDefaultPassword && (!input.temporaryPassword || input.temporaryPassword.length < 8)) {
        return { success: false, error: 'Temporary password must be at least 8 characters.' };
      }

      const redirect = this.getPortalResetRedirectUrl(input.portalName);
      const payload = {
        loginEmail: normalizedEmail,
        portalName: input.portalName,
        portalRole: input.portalRole,
        temporaryPassword: input.temporaryPassword,
        useDefaultPassword: input.useDefaultPassword ?? false,
        sendResetEmail: input.sendResetEmail ?? false,
        redirectTo: redirect.url,
      };

      const { data, error } = await this.client.functions.invoke<PortalCredentialProvisionResult>(
        'provision-portal-user',
        { body: payload },
      );

      if (error) throw error;
      if (!data) {
        return { success: false, error: 'Provisioning function returned no data.' };
      }

      return { success: true, data };
    } catch (error: unknown) {
      const context = (error as { context?: Response } | null)?.context;
      if (context instanceof Response) {
        try {
          const payload = await context.clone().json() as { error?: string; message?: string; details?: string };
          const functionError = payload.error || payload.message || payload.details;
          if (typeof functionError === 'string' && functionError.trim()) {
            return { success: false, error: functionError.trim() };
          }
        } catch {
          // Fall through to generic error mapping when response is not JSON.
        }
      }

      console.error('Error provisioning portal credentials:', error);
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

  async addPersonAsStudent(personnelId: number): Promise<ApiResponse<{ StudentID: number; PersonnelID: number }>> {
    try {
      const { data: existing, error: existingError } = await this.client
        .from('student_info')
        .select('student_id, personnel_id')
        .eq('personnel_id', personnelId)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        return { success: true, data: { StudentID: existing.student_id, PersonnelID: existing.personnel_id } };
      }

      const { data, error } = await this.client
        .from('student_info')
        .insert([
          {
            personnel_id: personnelId,
            enrollment_date: new Date().toISOString().split('T')[0],
          },
        ])
        .select('student_id, personnel_id')
        .single();

      if (error) throw error;

      return { success: true, data: { StudentID: data.student_id, PersonnelID: data.personnel_id } };
    } catch (error) {
      console.error('Error adding student:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async addPersonAsTeacher(personnelId: number): Promise<ApiResponse<any>> {
    try {
      const isCast = await this.isCastMember(personnelId);
      if (!isCast) {
        return { success: false, error: 'Teacher assignments are restricted to cast members.' };
      }

      const { data: existing, error: existingError } = await this.client
        .from('teachers')
        .select('teacher_id')
        .eq('personnel_id', personnelId)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        return { success: true, data: { TeacherID: existing.teacher_id, PersonnelID: personnelId } };
      }

      const { data, error } = await this.client
        .from('teachers')
        .insert([{ personnel_id: personnelId }])
        .select('teacher_id, personnel_id')
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          TeacherID: data.teacher_id,
          PersonnelID: data.personnel_id,
        },
      };
    } catch (error) {
      console.error('Error adding teacher:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async removeTeacher(teacherId: number): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      const { error } = await this.client
        .from('teachers')
        .delete()
        .eq('teacher_id', teacherId);

      if (error) throw error;
      return { success: true, data: { deleted: true } };
    } catch (error) {
      console.error('Error removing teacher:', error);
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

  async getPersonnelDeletionDependencies(personnelId: number): Promise<ApiResponse<PersonnelDeletionDependencies>> {
    try {
      const [castResult, studentResult, teacherResult, directorResult, performancesResult, crewResult, bartenderResult, workshopResult] = await Promise.all([
        this.client.from('cast_member_info').select('CastMemberID', { count: 'exact', head: true }).eq('PersonnelID', personnelId),
        this.client.from('student_info').select('student_id', { count: 'exact' }).eq('personnel_id', personnelId),
        this.client.from('teachers').select('teacher_id', { count: 'exact', head: true }).eq('personnel_id', personnelId),
        this.client.from('directors').select('director_id', { count: 'exact', head: true }).eq('personnel_id', personnelId),
        this.client.from('show_performances').select('performance_id', { count: 'exact', head: true }).eq('personnel_id', personnelId),
        this.client.from('crew_duties').select('duty_id', { count: 'exact', head: true }).eq('personnel_id', personnelId),
        this.client.from('bartenders').select('bartender_id', { count: 'exact', head: true }).eq('personnel_id', personnelId),
        this.client.from('workshop_registrations').select('workshop_registration_id', { count: 'exact', head: true }).eq('personnel_id', personnelId),
      ]);

      if (castResult.error) throw castResult.error;
      if (studentResult.error) throw studentResult.error;
      if (teacherResult.error) throw teacherResult.error;
      if (directorResult.error) throw directorResult.error;
      if (performancesResult.error) throw performancesResult.error;
      if (crewResult.error) throw crewResult.error;
      if (bartenderResult.error) throw bartenderResult.error;
      if (workshopResult.error) throw workshopResult.error;

      const studentRows = studentResult.data || [];
      const studentIds = studentRows.map((row: any) => row.student_id).filter((id: number) => Number.isFinite(id));

      let studentEnrollmentCount = 0;
      if (studentIds.length > 0) {
        const enrollmentResult = await this.client
          .from('student_enrollments')
          .select('enrollment_id', { count: 'exact', head: true })
          .in('student_id', studentIds);

        if (enrollmentResult.error) throw enrollmentResult.error;
        studentEnrollmentCount = enrollmentResult.count || 0;
      }

      const dependencies: PersonnelDeletionDependencies = {
        references: {
          castMember: castResult.count || 0,
          studentProfile: studentResult.count || 0,
          teacherRole: teacherResult.count || 0,
          directorRole: directorResult.count || 0,
          showPerformances: performancesResult.count || 0,
          crewDuties: crewResult.count || 0,
          bartenderAssignments: bartenderResult.count || 0,
          workshopRegistrations: workshopResult.count || 0,
          studentEnrollments: studentEnrollmentCount,
        },
        canDelete: true,
        totalReferences: 0,
      };

      dependencies.totalReferences = Object.values(dependencies.references).reduce((sum, count) => sum + count, 0);
      dependencies.canDelete = dependencies.totalReferences === 0;

      return { success: true, data: dependencies };
    } catch (error) {
      console.error('Error checking personnel dependencies:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async deletePersonnel(personnelId: number, forceDelete: boolean = false): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      if (!forceDelete) {
        const dependenciesResponse = await this.getPersonnelDeletionDependencies(personnelId);
        if (!dependenciesResponse.success || !dependenciesResponse.data) {
          return { success: false, error: dependenciesResponse.error || 'Unable to validate personnel dependencies.' };
        }

        if (!dependenciesResponse.data.canDelete) {
          return {
            success: false,
            error: `Cannot delete personnel. ${dependenciesResponse.data.totalReferences} related record(s) found. Use force delete to continue.`,
          };
        }
      }

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

  async inactivatePersonnel(personnelId: number): Promise<ApiResponse<{ inactivated: boolean }>> {
    try {
      const { error } = await this.client
        .from('personnel')
        .update({ active: false })
        .eq('personnel_id', personnelId);

      if (error) throw error;
      return { success: true, data: { inactivated: true } };
    } catch (error) {
      console.error('Error inactivating personnel:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async reactivatePersonnel(personnelId: number): Promise<ApiResponse<{ reactivated: boolean }>> {
    try {
      const { error } = await this.client
        .from('personnel')
        .update({ active: true })
        .eq('personnel_id', personnelId);

      if (error) throw error;
      return { success: true, data: { reactivated: true } };
    } catch (error) {
      console.error('Error reactivating personnel:', error);
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
          crew_duties(*, personnel(*), crew_duty_types(duty_name))
        `
        )
        .order('show_date', { ascending: false });

      if (error) throw error;

      const showIds = (data || [])
        .map((show: any) => Number(show.show_id))
        .filter((id: number) => Number.isFinite(id) && id > 0);

      const bartenderByShowId = new Map<number, number | null>();
      if (showIds.length > 0) {
        const { data: bartenderSlots, error: bartenderSlotsError } = await this.client
          .from('bartender_slot')
          .select('show_id,personnel_id')
          .in('show_id', showIds);

        if (bartenderSlotsError) throw bartenderSlotsError;

        (bartenderSlots || []).forEach((row: any) => {
          const showId = Number(row.show_id);
          if (!Number.isFinite(showId) || showId <= 0) return;
          const personnelId = row.personnel_id == null ? null : Number(row.personnel_id);
          bartenderByShowId.set(showId, Number.isFinite(personnelId as number) && (personnelId as number) > 0 ? (personnelId as number) : null);
        });
      }

      const transformed = data?.map((show: any) => {
          const castMembers = show.show_performances?.map((perf: any) => perf.personnel) || [];
          const crewMembers = show.crew_duties?.map((crew: any) => crew.personnel) || [];
          const castCount = Array.isArray(show.show_performances) ? show.show_performances.length : castMembers.length;

          const crewPersonnelIds = new Set<number>((show.crew_duties || [])
            .map((crew: any) => Number(crew?.personnel_id))
            .filter((id: number) => Number.isFinite(id) && id > 0));

          const bartenderPersonnelId = bartenderByShowId.get(Number(show.show_id)) || null;
          const crewCount = (Array.isArray(show.crew_duties) ? show.crew_duties.length : crewMembers.length)
            + (bartenderPersonnelId && !crewPersonnelIds.has(bartenderPersonnelId) ? 1 : 0);

          return {
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
          CastMembers: castMembers,
          CrewMembers: crewMembers,
          CastCount: castCount,
          CrewCount: crewCount,
      };
      }) || [];

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching shows with details:', error);
      return { success: false, error: error.toString() };
    }
  }

  async createShow(show: Omit<ShowInformation, 'ShowID'>): Promise<ApiResponse<ShowInformation>> {
    try {
      const parsedDirectorId = Number(show.DirectorID);
      const directorId = Number.isFinite(parsedDirectorId) && parsedDirectorId > 0 ? parsedDirectorId : null;

      const { data, error } = await this.client
        .from('show_information')
        .insert([
          {
            show_date: show.ShowDate,
            show_time: show.ShowTime,
            show_type_id: show.ShowTypeID,
            director_id: directorId,
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

  async addPersonAsDirector(personnelId: number): Promise<ApiResponse<any>> {
    try {
      const isCast = await this.isCastMember(personnelId);
      if (!isCast) {
        return { success: false, error: 'Director assignments are restricted to cast members.' };
      }

      const { data: existing, error: existingError } = await this.client
        .from('directors')
        .select('director_id')
        .eq('personnel_id', personnelId)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        return { success: true, data: { DirectorID: existing.director_id, PersonnelID: personnelId } };
      }

      const { data, error } = await this.client
        .from('directors')
        .insert([{ personnel_id: personnelId }])
        .select('director_id, personnel_id')
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          DirectorID: data.director_id,
          PersonnelID: data.personnel_id,
        },
      };
    } catch (error) {
      console.error('Error adding director:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async removeDirector(directorId: number): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      const { error } = await this.client
        .from('directors')
        .delete()
        .eq('director_id', directorId);

      if (error) throw error;
      return { success: true, data: { deleted: true } };
    } catch (error) {
      console.error('Error removing director:', error);
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
      if ('DirectorID' in show) {
        const parsedDirectorId = Number(show.DirectorID as number | null);
        updates.director_id = Number.isFinite(parsedDirectorId) && parsedDirectorId > 0 ? parsedDirectorId : null;
      }
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

  async updateCastMemberFlags(
    castMemberId: number,
    flags: { outOfTown: boolean; limitedInactive: boolean },
  ): Promise<ApiResponse<{ updated: boolean }>> {
    try {
      const { error } = await this.client
        .from('cast_member_info')
        .update({
          OutOfTown: flags.outOfTown ? 1 : 0,
          'Limited/Inactive': flags.limitedInactive ? 1 : 0,
        })
        .eq('CastMemberID', castMemberId);

      if (error) throw error;
      return { success: true, data: { updated: true } };
    } catch (error) {
      console.error('Error updating cast member flags:', error);
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

  async deleteClassOffering(offeringId: number): Promise<ApiResponse<void>> {
    try {
      // Get enrollment IDs for this offering to cascade-delete dependent records
      const { data: enrollments, error: enrollErr } = await this.client
        .from('student_enrollments')
        .select('enrollment_id')
        .eq('offering_id', offeringId);

      if (enrollErr) throw enrollErr;

      const enrollmentIds = (enrollments || []).map((e: any) => e.enrollment_id);

      if (enrollmentIds.length > 0) {
        // Delete student_competencies
        const { error: compErr } = await this.client
          .from('student_competencies')
          .delete()
          .in('enrollment_id', enrollmentIds);
        if (compErr) throw compErr;

        // Delete student_progress_notes
        const { error: notesErr } = await this.client
          .from('student_progress_notes')
          .delete()
          .in('enrollment_id', enrollmentIds);
        if (notesErr) throw notesErr;

        // Delete class_attendance
        const { error: attErr } = await this.client
          .from('class_attendance')
          .delete()
          .in('enrollment_id', enrollmentIds);
        if (attErr) throw attErr;
      }

      // Delete class_session_logs
      const { error: logsErr } = await this.client
        .from('class_session_logs')
        .delete()
        .eq('offering_id', offeringId);
      if (logsErr) throw logsErr;

      // Delete student_enrollments
      const { error: enrollDeleteErr } = await this.client
        .from('student_enrollments')
        .delete()
        .eq('offering_id', offeringId);
      if (enrollDeleteErr) throw enrollDeleteErr;

      // Delete the class offering itself
      const { error } = await this.client
        .from('class_offerings')
        .delete()
        .eq('offering_id', offeringId);
      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting class offering:', error);
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

  async getClassOfferingDetails(offeringId: number): Promise<ApiResponse<any>> {
    try {
      const offeringRes = await this.client
        .from('class_offerings')
        .select('offering_id, class_level_id, status, class_levels(level_name)')
        .eq('offering_id', offeringId)
        .maybeSingle();

      if (offeringRes.error) throw offeringRes.error;

      const enrollmentsRes = await this.client
        .from('student_enrollments')
        .select('enrollment_id, offering_id, student_id, status')
        .eq('offering_id', offeringId)
        .order('enrollment_id', { ascending: true });

      if (enrollmentsRes.error) throw enrollmentsRes.error;

      const enrollmentRows = enrollmentsRes.data || [];
      const studentIds = Array.from(new Set(enrollmentRows.map((row: any) => row.student_id).filter(Boolean)));

      const studentInfoRes = studentIds.length > 0
        ? await this.client
            .from('student_info')
            .select('student_id, personnel_id')
            .in('student_id', studentIds)
        : { data: [], error: null };

      if (studentInfoRes.error) throw studentInfoRes.error;

      const studentInfoById = new Map<number, any>(
        (studentInfoRes.data || []).map((row: any) => [row.student_id, row]),
      );

      const personnelIds = Array.from(
        new Set((studentInfoRes.data || []).map((row: any) => row.personnel_id).filter(Boolean)),
      );

      const personnelRes = personnelIds.length > 0
        ? await this.client
            .from('personnel')
            .select('personnel_id, first_name, last_name, primary_email')
            .in('personnel_id', personnelIds)
        : { data: [], error: null };

      if (personnelRes.error) throw personnelRes.error;

      const personnelById = new Map<number, any>(
        (personnelRes.data || []).map((row: any) => [row.personnel_id, row]),
      );

      const toEnrollmentStatus = (raw: string): string => {
        const normalized = String(raw || '').trim().toLowerCase();
        if (!normalized) return 'Active';
        if (normalized === 'admin') return 'ADMIN';
        if (normalized === 'in progress') return 'In Progress';
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
      };

      const enrollments = enrollmentRows.map((row: any) => {
        const studentInfo = studentInfoById.get(row.student_id);
        const person = studentInfo ? personnelById.get(studentInfo.personnel_id) : null;
        const status = toEnrollmentStatus(row.status);
        return {
          EnrollmentID: row.enrollment_id,
          OfferingID: row.offering_id,
          StudentID: row.student_id,
          Status: status,
          CompletionStatus: status,
          FirstName: person?.first_name || 'Unknown',
          LastName: person?.last_name || '',
          PrimaryEmail: person?.primary_email || '',
        };
      });

      const enrollmentIds = enrollments.map((row: any) => row.EnrollmentID).filter(Boolean);
      const attendanceRes = enrollmentIds.length > 0
        ? await this.client
            .from('class_attendance')
            .select('attendance_id, enrollment_id, class_date, attended, notes')
            .in('enrollment_id', enrollmentIds)
            .order('class_date', { ascending: true })
        : { data: [], error: null };

      if (attendanceRes.error) throw attendanceRes.error;

      const toAttendanceStatus = (attended: boolean | null, notes: string | null): 'Present' | 'Absent' | 'Late' | 'Excused' => {
        const notesValue = String(notes || '').trim().toLowerCase();
        if (notesValue === 'late') return 'Late';
        if (notesValue === 'excused') return 'Excused';
        return attended ? 'Present' : 'Absent';
      };

      const attendanceRecords = (attendanceRes.data || []).map((row: any) => ({
        AttendanceID: row.attendance_id,
        EnrollmentID: row.enrollment_id,
        ClassDate: String(row.class_date || '').split('T')[0],
        AttendanceStatus: toAttendanceStatus(row.attended, row.notes),
      }));

      const activeEnrollmentCount = enrollments.filter((row: any) => row.Status === 'Active').length;
      const byDateMap = new Map<string, any>();

      for (const row of attendanceRecords) {
        const current = byDateMap.get(row.ClassDate) || {
          ClassDate: row.ClassDate,
          PresentCount: 0,
          LateCount: 0,
          ExcusedCount: 0,
          AbsentCount: 0,
          MarkedCount: 0,
          AttendancePct: 0,
        };

        current.MarkedCount += 1;
        if (row.AttendanceStatus === 'Present') current.PresentCount += 1;
        if (row.AttendanceStatus === 'Late') current.LateCount += 1;
        if (row.AttendanceStatus === 'Excused') current.ExcusedCount += 1;
        if (row.AttendanceStatus === 'Absent') current.AbsentCount += 1;

        byDateMap.set(row.ClassDate, current);
      }

      const attendanceByDate = Array.from(byDateMap.values())
        .map((day: any) => ({
          ...day,
          AttendancePct: activeEnrollmentCount > 0
            ? Math.round(((day.PresentCount + day.LateCount) / activeEnrollmentCount) * 100)
            : 0,
        }))
        .sort((a: any, b: any) => a.ClassDate.localeCompare(b.ClassDate));

      return {
        success: true,
        data: {
          Enrollments: enrollments,
          AttendanceRecords: attendanceRecords,
          AttendanceByDate: attendanceByDate,
          ClassLevelID: offeringRes.data?.class_level_id,
          LevelName: offeringRes.data?.class_levels?.level_name,
        },
      };
    } catch (error) {
      console.error('Error fetching class offering details:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getClassOfferingStatus(offeringId: number): Promise<ApiResponse<'Upcoming' | 'In Progress' | 'Completed' | 'Cancelled'>> {
    try {
      const { data, error } = await this.client
        .from('class_offerings')
        .select('status')
        .eq('offering_id', offeringId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { success: false, error: 'Class offering not found.' };

      const normalized = String(data.status || '').trim().toLowerCase();
      let status: 'Upcoming' | 'In Progress' | 'Completed' | 'Cancelled' = 'Upcoming';
      if (normalized === 'completed') status = 'Completed';
      else if (normalized === 'cancelled' || normalized === 'canceled') status = 'Cancelled';
      else if (normalized === 'in progress' || normalized === 'open') status = 'In Progress';

      return { success: true, data: status };
    } catch (error) {
      console.error('Error fetching class offering status:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async updateClassAttendance(attendanceData: {
    EnrollmentID?: number;
    OfferingID?: number;
    ClassDate?: string;
    Status?: string;
    Notes?: string;
    enrollmentId?: number;
    offeringId?: number;
    classDate?: string;
    status?: string;
    notes?: string;
  }): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const enrollmentId = attendanceData.EnrollmentID ?? attendanceData.enrollmentId;
      const classDateRaw = attendanceData.ClassDate ?? attendanceData.classDate;
      const statusRaw = attendanceData.Status ?? attendanceData.status;

      if (!enrollmentId || !classDateRaw || !statusRaw) {
        return { success: false, error: 'Missing required attendance fields.' };
      }

      const classDate = String(classDateRaw).split('T')[0];
      const status = String(statusRaw);
      const attended = status === 'Present' || status === 'Late';
      const notes = status === 'Late' || status === 'Excused'
        ? status
        : (attendanceData.Notes ?? attendanceData.notes ?? null);

      const existingRes = await this.client
        .from('class_attendance')
        .select('attendance_id')
        .eq('enrollment_id', enrollmentId)
        .eq('class_date', classDate)
        .order('attendance_id', { ascending: false })
        .limit(1);

      if (existingRes.error) throw existingRes.error;

      if ((existingRes.data || []).length > 0) {
        const { error } = await this.client
          .from('class_attendance')
          .update({ attended, notes })
          .eq('attendance_id', existingRes.data![0].attendance_id);

        if (error) throw error;
      } else {
        const { error } = await this.client
          .from('class_attendance')
          .insert({
            enrollment_id: enrollmentId,
            class_date: classDate,
            attended,
            notes,
          });

        if (error) throw error;
      }

      return { success: true, data: { success: true } };
    } catch (error) {
      console.error('Error updating class attendance:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async saveStudentCompetency(data: {
    EnrollmentID: number;
    StudentID: number;
    SkillID: number;
    Rating: 1 | 2 | 3 | 4 | 5;
    Notes?: string;
  }): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const existing = await this.client
        .from('student_competencies')
        .select('competency_id')
        .eq('enrollment_id', data.EnrollmentID)
        .eq('skill_id', data.SkillID)
        .maybeSingle();

      if (existing.error) throw existing.error;

      if (existing.data) {
        const { error } = await this.client
          .from('student_competencies')
          .update({ rating: data.Rating, notes: data.Notes ?? null })
          .eq('competency_id', existing.data.competency_id);

        if (error) throw error;
      } else {
        const { error } = await this.client
          .from('student_competencies')
          .insert({
            enrollment_id: data.EnrollmentID,
            student_id: data.StudentID,
            skill_id: data.SkillID,
            rating: data.Rating,
            notes: data.Notes ?? null,
          });

        if (error) throw error;
      }

      return { success: true, data: { success: true } };
    } catch (error) {
      console.error('Error saving student competency:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async addStudentProgressNote(note: { EnrollmentID: number; NoteDate: string; Note: string }): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const { error } = await this.client
        .from('student_progress_notes')
        .insert({
          enrollment_id: note.EnrollmentID,
          note_date: note.NoteDate,
          narrative_feedback: note.Note,
        });

      if (error) throw error;
      return { success: true, data: { success: true } };
    } catch (error) {
      console.error('Error saving progress note:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async saveSessionLog(log: {
    OfferingID: number;
    SessionDate: string;
    CurriculumNotes?: string;
    GeneralNotes?: string;
  }): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const { error } = await this.client
        .from('class_session_logs')
        .insert({
          offering_id: log.OfferingID,
          session_date: log.SessionDate,
          curriculum_notes: log.CurriculumNotes || null,
          group_notes: log.GeneralNotes || null,
        });

      if (error) throw error;
      return { success: true, data: { success: true } };
    } catch (error) {
      console.error('Error saving session log:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getSessionLogsForOffering(offeringId: number): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('class_session_logs')
        .select('session_log_id, offering_id, session_date, curriculum_notes, group_notes')
        .eq('offering_id', offeringId)
        .order('session_date', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: (data || []).map((row: any) => ({
          LogID: row.session_log_id,
          OfferingID: row.offering_id,
          SessionDate: String(row.session_date || '').split('T')[0],
          CurriculumNotes: row.curriculum_notes || '',
          GeneralNotes: row.group_notes || '',
        })),
      };
    } catch (error) {
      console.error('Error fetching session logs:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getProgressNotesForOffering(enrollmentIds: number[]): Promise<ApiResponse<any[]>> {
    try {
      if (enrollmentIds.length === 0) return { success: true, data: [] };

      const { data, error } = await this.client
        .from('student_progress_notes')
        .select('progress_note_id, enrollment_id, note_date, narrative_feedback')
        .in('enrollment_id', enrollmentIds)
        .order('note_date', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: (data || []).map((row: any) => ({
          EnrollmentID: row.enrollment_id,
          NoteDate: String(row.note_date || '').split('T')[0],
          Note: row.narrative_feedback || '',
        })),
      };
    } catch (error) {
      console.error('Error fetching progress notes:', error);
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

  async getAllGames(): Promise<ApiResponse<MasterGame[]>> {
    try {
      const { data, error } = await this.client
        .from('master_game_list')
        .select('*')
        .order('game_name', { ascending: true });

      if (error) throw error;

      const transformed = (data || []).map((game: any) => this.toMasterGame(game));

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching games:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async createMasterGame(input: MasterGameInput): Promise<ApiResponse<MasterGame>> {
    try {
      if (!input.GameName?.trim()) {
        return { success: false, error: 'Game name is required.' };
      }

      const payload = this.toMasterGameMutationPayload(input);
      let { data, error } = await this.client
        .from('master_game_list')
        .insert([payload])
        .select('*')
        .single();

      if (error && this.isMissingMasterGameColumnError(error)) {
        const legacyPayload = this.toLegacyMasterGameMutationPayload(input);
        const fallbackResult = await this.client
          .from('master_game_list')
          .insert([legacyPayload])
          .select('*')
          .single();
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;
      return { success: true, data: this.toMasterGame(data) };
    } catch (error) {
      console.error('Error creating master game:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async updateMasterGame(gameId: number, input: MasterGameInput): Promise<ApiResponse<MasterGame>> {
    try {
      if (!Number.isFinite(gameId) || gameId <= 0) {
        return { success: false, error: 'Valid game ID is required.' };
      }

      if (!input.GameName?.trim()) {
        return { success: false, error: 'Game name is required.' };
      }

      const payload = this.toMasterGameMutationPayload(input);
      let { data, error } = await this.client
        .from('master_game_list')
        .update(payload)
        .eq('game_id', gameId)
        .select('*')
        .single();

      if (error && this.isMissingMasterGameColumnError(error)) {
        const legacyPayload = this.toLegacyMasterGameMutationPayload(input);
        const fallbackResult = await this.client
          .from('master_game_list')
          .update(legacyPayload)
          .eq('game_id', gameId)
          .select('*')
          .single();
        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      if (error) throw error;
      return { success: true, data: this.toMasterGame(data) };
    } catch (error) {
      console.error('Error updating master game:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async deleteMasterGame(gameId: number): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      if (!Number.isFinite(gameId) || gameId <= 0) {
        return { success: false, error: 'Valid game ID is required.' };
      }

      const { error } = await this.client
        .from('master_game_list')
        .delete()
        .eq('game_id', gameId);

      if (error) throw error;
      return { success: true, data: { deleted: true } };
    } catch (error) {
      console.error('Error deleting master game:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getRequestedMasterGames(): Promise<ApiResponse<MasterGame[]>> {
    try {
      const { data, error } = await this.client
        .from('master_game_list')
        .select('*')
        .ilike('category', 'Requested from Show%')
        .order('game_name', { ascending: true });

      if (error) throw error;
      return { success: true, data: (data || []).map((row: any) => this.toMasterGame(row)) };
    } catch (error) {
      console.error('Error fetching requested master games:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async approveRequestedGame(gameId: number, approvedCategory: string = 'Improv'): Promise<ApiResponse<MasterGame>> {
    try {
      if (!Number.isFinite(gameId) || gameId <= 0) {
        return { success: false, error: 'Valid game ID is required.' };
      }

      const category = approvedCategory.trim() || 'Improv';

      const { data, error } = await this.client
        .from('master_game_list')
        .update({ category })
        .eq('game_id', gameId)
        .select('*')
        .single();

      if (error) throw error;
      return { success: true, data: this.toMasterGame(data) };
    } catch (error) {
      console.error('Error approving requested game:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async rejectRequestedGame(gameId: number): Promise<ApiResponse<MasterGame>> {
    try {
      if (!Number.isFinite(gameId) || gameId <= 0) {
        return { success: false, error: 'Valid game ID is required.' };
      }

      const { data, error } = await this.client
        .from('master_game_list')
        .update({ category: 'Rejected Request' })
        .eq('game_id', gameId)
        .select('*')
        .single();

      if (error) throw error;
      return { success: true, data: this.toMasterGame(data) };
    } catch (error) {
      console.error('Error rejecting requested game:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getShowGames(showId: number): Promise<ApiResponse<ShowGame[]>> {
    try {
      const { data, error } = await this.client
        .from('games_played')
        .select('games_played_id, show_id, game_id, order_in_show, notes, master_game_list(game_name)')
        .eq('show_id', showId)
        .order('order_in_show', { ascending: true, nullsFirst: false })
        .order('games_played_id', { ascending: true });

      if (error) throw error;

      const transformed = (data || []).map((game: any) => ({
        GamesPlayedID: game.games_played_id,
        ShowID: game.show_id,
        GameID: game.game_id,
        GameName: game.master_game_list?.game_name || '',
        OrderInShow: game.order_in_show ?? null,
        Notes: game.notes || '',
      }));

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching show games:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async updateShowGames(showId: number, games: Array<{ gameId?: number | null; customName?: string | null; variation?: string | null; flag?: boolean }>): Promise<ApiResponse<any>> {
    try {
      const customGames = games.filter(game => game.customName && game.customName.trim().length > 0);

      const resolvedGameMap = new Map<string, number>();

      for (const game of customGames) {
        const customName = game.customName!.trim();
        const { data: existing, error: lookupError } = await this.client
          .from('master_game_list')
          .select('game_id, game_name')
          .ilike('game_name', customName)
          .maybeSingle();

        if (lookupError) throw lookupError;

        if (existing) {
          resolvedGameMap.set(customName.toLowerCase(), existing.game_id);
          continue;
        }

        const { data: insertedGame, error: insertGameError } = await this.client
            .from('master_game_list')
            .insert([{
              game_name: customName,
              description: game.variation || null,
              category: game.flag ? 'Requested from Show' : 'Custom',
              player_count: null,
              format: null,
            }])
            .select('game_id, game_name')
            .single();

        if (insertGameError) throw insertGameError;
        resolvedGameMap.set(customName.toLowerCase(), insertedGame.game_id);
      }

      const { error: deleteError } = await this.client
        .from('games_played')
        .delete()
        .eq('show_id', showId);

      if (deleteError) throw deleteError;

      const insertRows = games
        .map((game, index) => {
          const resolvedGameId = game.gameId || (game.customName ? resolvedGameMap.get(game.customName.trim().toLowerCase()) : null);
          if (!resolvedGameId) {
            throw new Error(`Unable to resolve game entry ${index + 1} for saving`);
          }
          return {
            show_id: showId,
            game_id: resolvedGameId,
            order_in_show: index + 1,
            notes: game.variation || null,
          };
        })
        .filter(Boolean);

      if (insertRows.length > 0) {
        const { error: insertError } = await this.client
          .from('games_played')
          .insert(insertRows as any[]);

        if (insertError) throw insertError;
      }

      return { success: true, data: { updated: true } };
    } catch (error) {
      console.error('Error updating show games:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getAllWorkshops(): Promise<ApiResponse<Workshop[]>> {
    try {
      const { data, error } = await this.client
        .from('workshops')
        .select(`
          workshop_id,
          title,
          description,
          workshop_date,
          start_time,
          end_time,
          room_id,
          venue,
          instructor_personnel_id,
          special_guest_id,
          capacity,
          status,
          notes,
          rooms(room_name),
          personnel!workshops_instructor_personnel_id_fkey(first_name, last_name),
          special_guests(full_name),
          workshop_registrations(workshop_registration_id)
        `)
        .order('workshop_date', { ascending: true });

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const transformed: Workshop[] = (data || []).map((row: any) => {
        const date = row.workshop_date ? new Date(row.workshop_date) : null;
        if (date) date.setHours(0, 0, 0, 0);

        let computedStatus: Workshop['Status'] = 'Upcoming';
        if (String(row.status || '').toLowerCase() === 'canceled') {
          computedStatus = 'Canceled';
        } else if (date && date < today) {
          computedStatus = 'Completed';
        }

        return {
          WorkshopID: row.workshop_id,
          Title: row.title || '',
          Description: row.description || '',
          WorkshopDate: row.workshop_date,
          StartTime: row.start_time || '',
          EndTime: row.end_time || '',
          RoomID: row.room_id ?? null,
          Venue: row.venue || row.rooms?.room_name || '',
          InstructorPersonnelID: row.instructor_personnel_id ?? null,
          SpecialGuestID: row.special_guest_id ?? null,
          InstructorName: row.personnel
            ? `${row.personnel.first_name || ''} ${row.personnel.last_name || ''}`.trim()
            : (row.special_guests?.full_name || ''),
          Capacity: row.capacity ?? 0,
          RegistrationCount: Array.isArray(row.workshop_registrations) ? row.workshop_registrations.length : 0,
          Status: computedStatus,
          Notes: row.notes || '',
        };
      });

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching workshops:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async createWorkshop(workshop: Omit<Workshop, 'WorkshopID' | 'RegistrationCount' | 'InstructorName'>): Promise<ApiResponse<Workshop>> {
    try {
      const payload: Record<string, any> = {
        title: workshop.Title,
        description: workshop.Description || null,
        workshop_date: workshop.WorkshopDate,
        start_time: workshop.StartTime || null,
        end_time: workshop.EndTime || null,
        room_id: workshop.RoomID || null,
        venue: workshop.Venue || null,
        instructor_personnel_id: workshop.InstructorPersonnelID || null,
        special_guest_id: workshop.SpecialGuestID || null,
        capacity: workshop.Capacity ?? 0,
        status: workshop.Status || 'Upcoming',
        notes: workshop.Notes || null,
      };

      const { data, error } = await this.client
        .from('workshops')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          WorkshopID: data.workshop_id,
          Title: data.title,
          Description: data.description || '',
          WorkshopDate: data.workshop_date,
          StartTime: data.start_time || '',
          EndTime: data.end_time || '',
          RoomID: data.room_id ?? null,
          Venue: data.venue || '',
          InstructorPersonnelID: data.instructor_personnel_id ?? null,
          SpecialGuestID: data.special_guest_id ?? null,
          Capacity: data.capacity ?? 0,
          Status: data.status || 'Upcoming',
          Notes: data.notes || '',
          RegistrationCount: 0,
          InstructorName: '',
        },
      };
    } catch (error) {
      console.error('Error creating workshop:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async updateWorkshop(workshopId: number, workshop: Partial<Workshop>): Promise<ApiResponse<Workshop>> {
    try {
      const updates: Record<string, any> = {};
      if (workshop.Title !== undefined) updates.title = workshop.Title;
      if (workshop.Description !== undefined) updates.description = workshop.Description || null;
      if (workshop.WorkshopDate !== undefined) updates.workshop_date = workshop.WorkshopDate;
      if (workshop.StartTime !== undefined) updates.start_time = workshop.StartTime || null;
      if (workshop.EndTime !== undefined) updates.end_time = workshop.EndTime || null;
      if (workshop.RoomID !== undefined) updates.room_id = workshop.RoomID || null;
      if (workshop.Venue !== undefined) updates.venue = workshop.Venue || null;
      if (workshop.InstructorPersonnelID !== undefined) updates.instructor_personnel_id = workshop.InstructorPersonnelID || null;
      if (workshop.SpecialGuestID !== undefined) updates.special_guest_id = workshop.SpecialGuestID || null;
      if (workshop.Capacity !== undefined) updates.capacity = workshop.Capacity;
      if (workshop.Status !== undefined) updates.status = workshop.Status;
      if (workshop.Notes !== undefined) updates.notes = workshop.Notes || null;

      const { data, error } = await this.client
        .from('workshops')
        .update(updates)
        .eq('workshop_id', workshopId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          WorkshopID: data.workshop_id,
          Title: data.title,
          Description: data.description || '',
          WorkshopDate: data.workshop_date,
          StartTime: data.start_time || '',
          EndTime: data.end_time || '',
          RoomID: data.room_id ?? null,
          Venue: data.venue || '',
          InstructorPersonnelID: data.instructor_personnel_id ?? null,
          SpecialGuestID: data.special_guest_id ?? null,
          Capacity: data.capacity ?? 0,
          Status: data.status || 'Upcoming',
          Notes: data.notes || '',
        },
      };
    } catch (error) {
      console.error('Error updating workshop:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async deleteWorkshop(workshopId: number): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      const { error: registrationError } = await this.client
        .from('workshop_registrations')
        .delete()
        .eq('workshop_id', workshopId);
      if (registrationError) throw registrationError;

      const { error } = await this.client
        .from('workshops')
        .delete()
        .eq('workshop_id', workshopId);
      if (error) throw error;

      return { success: true, data: { deleted: true } };
    } catch (error) {
      console.error('Error deleting workshop:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getWorkshopRegistrations(workshopId: number): Promise<ApiResponse<WorkshopRegistration[]>> {
    try {
      const { data, error } = await this.client
        .from('workshop_registrations')
        .select(`
          workshop_registration_id,
          workshop_id,
          personnel_id,
          registration_date,
          registration_status,
          checked_in,
          personnel(first_name, last_name, primary_email)
        `)
        .eq('workshop_id', workshopId)
        .order('registration_date', { ascending: true });

      if (error) throw error;

      const transformed: WorkshopRegistration[] = (data || []).map((row: any) => ({
        WorkshopRegistrationID: row.workshop_registration_id,
        WorkshopID: row.workshop_id,
        PersonnelID: row.personnel_id,
        FirstName: row.personnel?.first_name || '',
        LastName: row.personnel?.last_name || '',
        FullName: `${row.personnel?.first_name || ''} ${row.personnel?.last_name || ''}`.trim(),
        PrimaryEmail: row.personnel?.primary_email || '',
        RegistrationDate: row.registration_date,
        RegistrationStatus: row.registration_status || 'Registered',
        CheckedIn: Boolean(row.checked_in),
      }));

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching workshop registrations:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async registerPersonnelForWorkshop(workshopId: number, personnelId: number): Promise<ApiResponse<{ created: boolean }>> {
    try {
      const { data: existing, error: existingError } = await this.client
        .from('workshop_registrations')
        .select('workshop_registration_id')
        .eq('workshop_id', workshopId)
        .eq('personnel_id', personnelId)
        .maybeSingle();
      if (existingError) throw existingError;

      if (!existing) {
        const { error } = await this.client
          .from('workshop_registrations')
          .insert([{ workshop_id: workshopId, personnel_id: personnelId, registration_status: 'Registered', checked_in: false }]);
        if (error) throw error;
      }

      return { success: true, data: { created: true } };
    } catch (error) {
      console.error('Error registering personnel for workshop:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async removeWorkshopRegistration(workshopRegistrationId: number): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      const { error } = await this.client
        .from('workshop_registrations')
        .delete()
        .eq('workshop_registration_id', workshopRegistrationId);
      if (error) throw error;

      return { success: true, data: { deleted: true } };
    } catch (error) {
      console.error('Error removing workshop registration:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getAllSpecialGuests(): Promise<ApiResponse<SpecialGuest[]>> {
    try {
      const { data, error } = await this.client
        .from('special_guests')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;

      const transformed: SpecialGuest[] = (data || []).map((row: any) => ({
        SpecialGuestID: row.special_guest_id,
        FullName: row.full_name || '',
        PrimaryEmail: row.primary_email || '',
        PrimaryPhone: row.primary_phone || '',
        Expertise: row.expertise || '',
        Notes: row.notes || '',
        Active: row.active !== false,
      }));

      return { success: true, data: transformed };
    } catch (error) {
      console.error('Error fetching special guests:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async createSpecialGuest(guest: Omit<SpecialGuest, 'SpecialGuestID'>): Promise<ApiResponse<SpecialGuest>> {
    try {
      const { data, error } = await this.client
        .from('special_guests')
        .insert([{
          full_name: guest.FullName,
          primary_email: guest.PrimaryEmail || null,
          primary_phone: guest.PrimaryPhone || null,
          expertise: guest.Expertise || null,
          notes: guest.Notes || null,
          active: guest.Active !== false,
        }])
        .select('*')
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          SpecialGuestID: data.special_guest_id,
          FullName: data.full_name || '',
          PrimaryEmail: data.primary_email || '',
          PrimaryPhone: data.primary_phone || '',
          Expertise: data.expertise || '',
          Notes: data.notes || '',
          Active: data.active !== false,
        },
      };
    } catch (error) {
      console.error('Error creating special guest:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async updateSpecialGuest(specialGuestId: number, guest: Partial<SpecialGuest>): Promise<ApiResponse<SpecialGuest>> {
    try {
      const updates: Record<string, any> = {};
      if (guest.FullName !== undefined) updates.full_name = guest.FullName;
      if (guest.PrimaryEmail !== undefined) updates.primary_email = guest.PrimaryEmail || null;
      if (guest.PrimaryPhone !== undefined) updates.primary_phone = guest.PrimaryPhone || null;
      if (guest.Expertise !== undefined) updates.expertise = guest.Expertise || null;
      if (guest.Notes !== undefined) updates.notes = guest.Notes || null;
      if (guest.Active !== undefined) updates.active = guest.Active;

      const { data, error } = await this.client
        .from('special_guests')
        .update(updates)
        .eq('special_guest_id', specialGuestId)
        .select('*')
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          SpecialGuestID: data.special_guest_id,
          FullName: data.full_name || '',
          PrimaryEmail: data.primary_email || '',
          PrimaryPhone: data.primary_phone || '',
          Expertise: data.expertise || '',
          Notes: data.notes || '',
          Active: data.active !== false,
        },
      };
    } catch (error) {
      console.error('Error updating special guest:', error);
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async deleteSpecialGuest(specialGuestId: number): Promise<ApiResponse<{ deleted: boolean }>> {
    try {
      const { error } = await this.client
        .from('special_guests')
        .delete()
        .eq('special_guest_id', specialGuestId);

      if (error) throw error;
      return { success: true, data: { deleted: true } };
    } catch (error) {
      console.error('Error deleting special guest:', error);
      return { success: false, error: this.getErrorMessage(error) };
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
      const { data: dutyType, error: dutyTypeError } = await this.client
        .from('crew_duty_types')
        .select('duty_name')
        .eq('crew_duty_type_id', dutyTypeId)
        .maybeSingle();

      if (dutyTypeError) throw dutyTypeError;

      const normalizedDutyName = String(dutyType?.duty_name || '').trim().toLowerCase();
      const isBartenderDuty = normalizedDutyName.includes('bartender') || normalizedDutyName === 'bar';
      const isCast = await this.isCastMember(personnelId);
      if (!isCast && !isBartenderDuty) {
        return { success: false, error: 'Crew assignments are restricted to cast members.' };
      }

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
      const [isCast, isStudent] = await Promise.all([
        this.isCastMember(personnelId),
        this.isStudent(personnelId),
      ]);

      if (!isCast && !isStudent) {
        return { success: false, error: 'Bartender assignments are restricted to cast members or students.' };
      }

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
      const [personnel, students, shows, classes, castRows, crewRows, bartenderRows, enrollRows, showRows, workshopRows, workshopRegistrationRows] = await Promise.all([
        this.client.from('personnel').select('count', { count: 'exact' }),
        this.client.from('student_info').select('count', { count: 'exact' }),
        this.client.from('show_information').select('count', { count: 'exact' }),
        this.client.from('class_offerings').select('count', { count: 'exact' }),
        this.client.from('cast_member_info').select('CastMemberID', { count: 'exact' }),
        this.client.from('crew_duties').select('personnel_id'),
        this.client.from('bartenders').select('active'),
        this.client.from('student_enrollments').select('enrollment_id, status'),
        this.client.from('show_information').select('show_date, show_time, venue, status'),
        this.client.from('workshops').select('workshop_id, title, workshop_date, start_time, end_time, venue, instructor_personnel_id, special_guest_id, status'),
        this.client.from('workshop_registrations').select('workshop_registration_id', { count: 'exact' }),
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
      const workshops = workshopRows.data || [];
      const totalWorkshops = workshops.length;
      const totalWorkshopRegistrations = workshopRegistrationRows.count || (workshopRegistrationRows.data || []).length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let upcomingWorkshops = 0;
      let inProgressWorkshops = 0;
      let completedWorkshops = 0;
      let cancelledWorkshops = 0;

      const showRecords = showRows.data || [];
      const scheduledShows = showRecords.filter((s: any) => String(s.status || '').toLowerCase() === 'scheduled');
      const canceledShows = showRecords.filter((s: any) => {
        const status = String(s.status || '').toLowerCase();
        return status === 'canceled' || status === 'cancelled';
      });

      const nextShow = scheduledShows
        .filter((s: any) => {
          const dateStr = String(s.show_date || '').slice(0, 10);
          const showDate = new Date(`${dateStr}T00:00:00`);
          return !Number.isNaN(showDate.getTime()) && showDate >= today;
        })
        .sort((a: any, b: any) => {
          const aDate = new Date(`${String(a.show_date || '').slice(0, 10)}T00:00:00`).getTime();
          const bDate = new Date(`${String(b.show_date || '').slice(0, 10)}T00:00:00`).getTime();
          if (aDate !== bDate) return aDate - bDate;
          const aTime = String(a.show_time || '');
          const bTime = String(b.show_time || '');
          return aTime.localeCompare(bTime);
        })[0];

      const normalizedWorkshops = workshops.map((w: any) => {
        const dateStr = String(w.workshop_date || '').slice(0, 10);
        const date = new Date(`${dateStr}T00:00:00`);
        const status = String(w.status || '').toLowerCase();

        let normalizedStatus: Workshop['Status'] = 'Upcoming';
        if (status === 'canceled' || status === 'cancelled') normalizedStatus = 'Canceled';
        else if (status === 'completed' || (!Number.isNaN(date.getTime()) && date < today)) normalizedStatus = 'Completed';

        if (date && !Number.isNaN(date.getTime()) && date.getTime() === today.getTime() && normalizedStatus === 'Upcoming') inProgressWorkshops++;
        else if (normalizedStatus === 'Upcoming') upcomingWorkshops++;
        else if (normalizedStatus === 'Completed') completedWorkshops++;
        else if (normalizedStatus === 'Canceled') cancelledWorkshops++;

        return {
          WorkshopID: w.workshop_id,
          Title: w.title || '',
          WorkshopDate: w.workshop_date,
          StartTime: w.start_time || '',
          EndTime: w.end_time || '',
          Venue: w.venue || '',
          InstructorPersonnelID: w.instructor_personnel_id ?? null,
          SpecialGuestID: w.special_guest_id ?? null,
          Status: normalizedStatus,
        } as Workshop;
      });

      const nextWorkshop = normalizedWorkshops
        .filter((w) => String(w.Status || '').toLowerCase() === 'upcoming' && w.WorkshopDate)
        .sort((a, b) => new Date(String(a.WorkshopDate)).getTime() - new Date(String(b.WorkshopDate)).getTime())[0] || null;

      return {
        success: true,
        data: {
          totalPersonnel,
          activeStudents: totalStudents,
          totalStudents,
          studentsActive: totalStudents,
          studentsInactive: 0,
          studentsGraduated: 0,
          scheduledShows: scheduledShows.length,
          canceledShows: canceledShows.length,
          totalShows,
          nextShow: nextShow
            ? {
                ShowDate: nextShow.show_date,
                ShowTime: nextShow.show_time || '',
                Venue: nextShow.venue || '',
              }
            : null,
          activeClasses: totalClasses,
          upcomingClasses: totalClasses,
          inProgressClasses: 0,
          completedClasses: 0,
          cancelledClasses: 0,
          totalClasses,
          totalEnrollments,
          classEnrollmentData: [],
          totalWorkshops,
          upcomingWorkshops,
          inProgressWorkshops,
          completedWorkshops,
          cancelledWorkshops,
          totalWorkshopRegistrations,
          nextWorkshop,
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
        .select('skill_id, skill_name, description, skill_category_id, skill_categories(category_name, applied_level)')
        .order('skill_name');

      if (error) throw error;

      const mapped = (data || []).map((s: any) => ({
        SkillID: s.skill_id,
        SkillName: s.skill_name,
        Description: s.description || '',
        SkillCategoryID: s.skill_category_id,
        CategoryName: s.skill_categories?.category_name || '',
        AppliedLevel: s.skill_categories?.applied_level || '',
      }));

      return { success: true, data: mapped };
    } catch (error) {
      console.error('Error fetching skills:', error);
      return { success: false, error: error.toString() };
    }
  }

  async getSkillCategories(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await this.client
        .from('skill_categories')
        .select('skill_category_id, category_name, applied_level, description')
        .order('applied_level')
        .order('category_name');

      if (error) throw error;

      const mapped = (data || []).map((c: any) => ({
        SkillCategoryID: c.skill_category_id,
        CategoryName: c.category_name,
        AppliedLevel: c.applied_level || '',
        Description: c.description || '',
      }));

      return { success: true, data: mapped };
    } catch (error) {
      console.error('Error fetching skill categories:', error);
      return { success: false, error: error.toString() };
    }
  }

  async addSkill(skillName: string, description: string, skillCategoryId: number): Promise<ApiResponse<{ SkillID: number }>> {
    try {
      const { data, error } = await this.client
        .from('skills')
        .insert({ skill_name: skillName, description, skill_category_id: skillCategoryId })
        .select('skill_id')
        .single();

      if (error) throw error;
      return { success: true, data: { SkillID: data.skill_id } };
    } catch (error) {
      console.error('Error adding skill:', error);
      return { success: false, error: error.toString() };
    }
  }

  async updateSkill(skillId: number, skillName: string, description: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.client
        .from('skills')
        .update({ skill_name: skillName, description })
        .eq('skill_id', skillId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating skill:', error);
      return { success: false, error: error.toString() };
    }
  }

  async deleteSkill(skillId: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await this.client
        .from('skills')
        .delete()
        .eq('skill_id', skillId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting skill:', error);
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

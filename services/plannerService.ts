import { supabase } from './supabaseClient';
import { supabaseService } from './supabaseService';

export interface PlanningSeason {
  season_id: string;
  season_name: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'review' | 'published' | 'archived';
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  published_at?: string | null;
  published_by?: string | null;
}

export interface PlanningItem {
  item_id: string;
  season_id: string;
  item_type: 'class' | 'show' | 'workshop';
  title: string;
  subtitle_or_level?: string | null;
  description?: string | null;
  room_id?: number | null;
  venue_name?: string | null;
  start_time: string; // '19:00:00'
  end_time: string;   // '21:30:00'
  start_date: string; // 'YYYY-MM-DD'
  end_date?: string | null;
  day_of_week?: string | null;
  total_sessions?: number;
  skip_dates?: string[] | null;
  primary_personnel_id?: number | null;
  secondary_personnel_id?: number | null;
  special_guest_id?: number | null;
  capacity?: number;
  ticket_or_tuition_rate?: number;
  is_public_ticketed?: boolean;
  validation_status: 'clean' | 'conflict' | 'warning';
  conflict_details?: any;
  published_show_id?: number | null;
  published_offering_id?: number | null;
  published_workshop_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClassInstructorAvailability {
  availability_id: string;
  season_id?: string | null;
  personnel_id: number;
  day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  time_preference: 'morning' | 'afternoon' | 'evening' | 'any';
  availability_status: 'available' | 'preferred' | 'sub_only' | 'unavailable';
  preferred_levels?: string[] | null;
  max_classes_per_week?: number;
  blackout_dates?: string[] | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  severity: 'clean' | 'warning' | 'conflict';
  messages: string[];
}

export const plannerService = {
  // ----------------------------------------------------
  // SEASONS
  // ----------------------------------------------------
  async getSeasons(): Promise<PlanningSeason[]> {
    const { data, error } = await supabase
      .from('planning_seasons')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error fetching planning seasons:', error);
      return [];
    }
    return data || [];
  },

  async createSeason(season: Omit<PlanningSeason, 'season_id' | 'created_at' | 'updated_at'>): Promise<PlanningSeason | null> {
    const { data, error } = await supabase
      .from('planning_seasons')
      .insert([season])
      .select()
      .single();

    if (error) {
      console.error('Error creating planning season:', error);
      return null;
    }
    return data;
  },

  async updateSeason(seasonId: string, updates: Partial<PlanningSeason>): Promise<boolean> {
    const { error } = await supabase
      .from('planning_seasons')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('season_id', seasonId);

    if (error) {
      console.error('Error updating planning season:', error);
      return false;
    }
    return true;
  },

  async deleteSeason(seasonId: string): Promise<boolean> {
    const { error } = await supabase
      .from('planning_seasons')
      .delete()
      .eq('season_id', seasonId);

    if (error) {
      console.error('Error deleting planning season:', error);
      return false;
    }
    return true;
  },

  // ----------------------------------------------------
  // PLANNING ITEMS (DRAFT QUEUE)
  // ----------------------------------------------------
  async getItemsBySeason(seasonId: string): Promise<PlanningItem[]> {
    const { data, error } = await supabase
      .from('planning_items')
      .select('*')
      .eq('season_id', seasonId)
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching planning items:', error);
      return [];
    }
    return data || [];
  },

  async savePlanningItem(item: Partial<PlanningItem>): Promise<PlanningItem | null> {
    if (item.item_id) {
      const { data, error } = await supabase
        .from('planning_items')
        .update({ ...item, updated_at: new Date().toISOString() })
        .eq('item_id', item.item_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating planning item:', error);
        return null;
      }
      return data;
    } else {
      const { data, error } = await supabase
        .from('planning_items')
        .insert([item])
        .select()
        .single();

      if (error) {
        console.error('Error creating planning item:', error);
        return null;
      }
      return data;
    }
  },

  async deletePlanningItem(itemId: string): Promise<boolean> {
    const { error } = await supabase
      .from('planning_items')
      .delete()
      .eq('item_id', itemId);

    if (error) {
      console.error('Error deleting planning item:', error);
      return false;
    }
    return true;
  },

  // ----------------------------------------------------
  // INSTRUCTOR AVAILABILITY
  // ----------------------------------------------------
  async getInstructorAvailability(personnelId?: number): Promise<ClassInstructorAvailability[]> {
    let query = supabase.from('class_instructor_availability').select('*');
    if (personnelId) {
      query = query.eq('personnel_id', personnelId);
    }
    const { data, error } = await query;
    if (error) {
      console.error('Error fetching instructor availability:', error);
      return [];
    }
    return data || [];
  },

  async upsertInstructorAvailability(record: Partial<ClassInstructorAvailability>): Promise<boolean> {
    const { error } = await supabase
      .from('class_instructor_availability')
      .upsert({ ...record, updated_at: new Date().toISOString() });

    if (error) {
      console.error('Error upserting instructor availability:', error);
      return false;
    }
    return true;
  },

  // ----------------------------------------------------
  // CONFLICT DETECTION ENGINE
  // ----------------------------------------------------
  async validateDraftItem(
    item: Partial<PlanningItem>,
    otherDraftItems: PlanningItem[],
    instructorsAvail: ClassInstructorAvailability[]
  ): Promise<ConflictCheckResult> {
    const messages: string[] = [];
    let severity: 'clean' | 'warning' | 'conflict' = 'clean';

    if (!item.start_date || !item.start_time || !item.end_time) {
      return { hasConflict: false, severity: 'clean', messages: [] };
    }

    // 1. Check against other items in the draft plan
    for (const other of otherDraftItems) {
      if (other.item_id === item.item_id) continue;

      // Check date match
      const dateOverlap = (other.start_date === item.start_date) || 
        (item.end_date && other.start_date >= item.start_date && other.start_date <= item.end_date);

      if (dateOverlap) {
        // Room collision
        if (item.room_id && other.room_id && item.room_id === other.room_id) {
          const timeOverlap = !(item.end_time <= other.start_time || item.start_time >= other.end_time);
          if (timeOverlap) {
            severity = 'conflict';
            messages.push(`Room conflict with draft item "${other.title}" on ${other.start_date} (${other.start_time} - ${other.end_time})`);
          } else {
            // Buffer / Turnaround warning (e.g. less than 30 mins)
            messages.push(`Notice: Close turnaround with "${other.title}" in the same room.`);
            if (severity !== 'conflict') severity = 'warning';
          }
        }

        // Personnel double-booking
        if (item.primary_personnel_id && other.primary_personnel_id && item.primary_personnel_id === other.primary_personnel_id) {
          const timeOverlap = !(item.end_time <= other.start_time || item.start_time >= other.end_time);
          if (timeOverlap) {
            severity = 'conflict';
            messages.push(`Assigned lead is already scheduled for "${other.title}" at this time.`);
          }
        }
      }
    }

    // 2. Check Instructor Availability / Blackouts
    if (item.primary_personnel_id && item.item_type === 'class') {
      const instructorRecords = instructorsAvail.filter(a => a.personnel_id === item.primary_personnel_id);
      
      if (item.day_of_week) {
        const dayRecord = instructorRecords.find(a => a.day_of_week.toLowerCase() === item.day_of_week?.toLowerCase());
        if (dayRecord) {
          if (dayRecord.availability_status === 'unavailable') {
            severity = 'conflict';
            messages.push(`Instructor marked ${item.day_of_week} as unavailable for teaching.`);
          } else if (dayRecord.availability_status === 'sub_only') {
            if (severity !== 'conflict') severity = 'warning';
            messages.push(`Instructor is marked as "Sub Only" for ${item.day_of_week}.`);
          }

          // Check blackout dates
          if (dayRecord.blackout_dates && dayRecord.blackout_dates.length > 0) {
            const hitBlackout = dayRecord.blackout_dates.find(d => d === item.start_date || (item.end_date && d >= item.start_date && d <= item.end_date));
            if (hitBlackout) {
              if (severity !== 'conflict') severity = 'warning';
              messages.push(`Instructor has a submitted blackout / vacation date on ${hitBlackout}. A substitute will be needed.`);
            }
          }
        }
      }
    }

    return {
      hasConflict: severity === 'conflict',
      severity,
      messages,
    };
  },

  // ----------------------------------------------------
  // 1-CLICK ATOMIC PUBLISHING TO LIVE TABLES
  // ----------------------------------------------------
  async publishSeason(seasonId: string): Promise<{ success: boolean; publishedCount: number; errors: string[] }> {
    const items = await this.getItemsBySeason(seasonId);
    const errors: string[] = [];
    let publishedCount = 0;

    for (const item of items) {
      try {
        if (item.item_type === 'show') {
          // Publish to ShowInformation
          const showRes = await supabaseService.createShow({
            ShowTypeID: 1, // Default or matched ShowType
            ShowDate: item.start_date,
            StartTime: item.start_time,
            EndTime: item.end_time,
            RoomID: item.room_id || 1,
            Venue: item.venue_name || 'Main Stage',
            DirectorID: item.primary_personnel_id || undefined,
            Notes: item.description || '',
          });

          if (showRes.success && showRes.data) {
            await this.savePlanningItem({
              item_id: item.item_id,
              published_show_id: showRes.data.ShowID,
            });
            publishedCount++;
          } else {
            errors.push(`Failed to publish show "${item.title}": ${showRes.error}`);
          }
        } else if (item.item_type === 'workshop') {
          // Publish to Workshops
          const wsRes = await supabaseService.createWorkshop({
            Title: item.title,
            Description: item.description || '',
            WorkshopDate: item.start_date,
            StartTime: item.start_time,
            EndTime: item.end_time,
            RoomID: item.room_id || 1,
            Venue: item.venue_name || 'Main Stage',
            InstructorPersonnelID: item.primary_personnel_id || undefined,
            SpecialGuestID: item.special_guest_id || undefined,
            Capacity: item.capacity || 20,
            Status: 'Upcoming',
            Notes: item.subtitle_or_level || '',
          });

          if (wsRes.success && wsRes.data) {
            await this.savePlanningItem({
              item_id: item.item_id,
              published_workshop_id: wsRes.data.WorkshopID,
            });
            publishedCount++;
          } else {
            errors.push(`Failed to publish workshop "${item.title}": ${wsRes.error}`);
          }
        } else if (item.item_type === 'class') {
          // Publish to ClassOfferings
          const { data: offering, error: classErr } = await supabase
            .from('ClassOfferings')
            .insert([{
              LevelID: 1, // Default or matched Level
              TeacherID: item.primary_personnel_id,
              StartDate: item.start_date,
              EndDate: item.end_date || item.start_date,
              RoomID: item.room_id || 1,
              Capacity: item.capacity || 16,
              Notes: item.description,
            }])
            .select()
            .single();

          if (!classErr && offering) {
            await this.savePlanningItem({
              item_id: item.item_id,
              published_offering_id: offering.OfferingID,
            });
            publishedCount++;
          } else {
            errors.push(`Failed to publish class "${item.title}": ${classErr?.message}`);
          }
        }
      } catch (err: any) {
        errors.push(`Error publishing item "${item.title}": ${err?.message || err}`);
      }
    }

    if (publishedCount > 0) {
      await this.updateSeason(seasonId, {
        status: 'published',
        published_at: new Date().toISOString(),
      });
    }

    return {
      success: errors.length === 0,
      publishedCount,
      errors,
    };
  },
};

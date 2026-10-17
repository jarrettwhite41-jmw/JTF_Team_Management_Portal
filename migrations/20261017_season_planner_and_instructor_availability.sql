-- ==============================================================================
-- Migration: Season & Curriculum Planning Engine + Instructor Availability
-- Date: October 2026
-- ==============================================================================

-- 1. Planning Seasons (e.g., 'Spring 2027 Mainstage & Conservatory')
CREATE TABLE IF NOT EXISTS public.planning_seasons (
  season_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz NULL,
  published_by uuid NULL REFERENCES auth.users(id)
);

-- 2. Draft Items Ledger (Shows, Classes, Workshops staging before acceptance)
CREATE TABLE IF NOT EXISTS public.planning_items (
  item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.planning_seasons(season_id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('class', 'show', 'workshop')),
  
  -- Title & Presentation
  title text NOT NULL,
  subtitle_or_level text NULL,
  description text NULL,

  -- Venue / Space
  room_id integer NULL,
  venue_name text NULL,

  -- Timing
  start_time text NOT NULL,                      -- e.g. '19:00:00'
  end_time text NOT NULL,                        -- e.g. '21:30:00'
  start_date date NOT NULL,
  end_date date NULL,                            -- End date for multi-week class cohorts
  day_of_week text NULL,                         -- 'Tuesday', 'Saturday', etc.
  total_sessions integer DEFAULT 1,              -- e.g. 8 for class series, 1 for show
  skip_dates text[] NULL,                        -- e.g. array of dark-week holiday dates

  -- Personnel Leads
  primary_personnel_id integer NULL,            -- Director or Lead Teacher
  secondary_personnel_id integer NULL,          -- Assistant Director or TA
  special_guest_id integer NULL,

  -- Operational / Capacity
  capacity integer DEFAULT 16,
  ticket_or_tuition_rate numeric DEFAULT 0,
  is_public_ticketed boolean DEFAULT true,

  -- Conflict & Sanity Checks
  validation_status text NOT NULL DEFAULT 'clean' CHECK (validation_status IN ('clean', 'conflict', 'warning')),
  conflict_details jsonb NULL,

  -- Published destination references for traceability & rollback
  published_show_id integer NULL,
  published_offering_id integer NULL,
  published_workshop_id integer NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planning_items_season ON public.planning_items(season_id);
CREATE INDEX IF NOT EXISTS idx_planning_items_dates ON public.planning_items(start_date, end_date);

-- 3. Instructor Availability Ledger (Filled out by faculty in Instructor Portal)
CREATE TABLE IF NOT EXISTS public.class_instructor_availability (
  availability_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NULL REFERENCES public.planning_seasons(season_id) ON DELETE CASCADE,
  personnel_id integer NOT NULL,
  day_of_week text NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  time_preference text NOT NULL DEFAULT 'evening' CHECK (time_preference IN ('morning', 'afternoon', 'evening', 'any')),
  availability_status text NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'preferred', 'sub_only', 'unavailable')),
  preferred_levels text[] NULL,                 -- e.g. ['Level 1', 'Level 2', 'Bilingual']
  max_classes_per_week integer DEFAULT 2,
  blackout_dates text[] NULL,                   -- e.g. ['2027-04-14', '2027-05-02']
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_instructor_avail_personnel ON public.class_instructor_availability(personnel_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.planning_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_instructor_availability ENABLE ROW LEVEL SECURITY;

-- Permissive authenticated policies for internal portals
CREATE POLICY "Allow authenticated read planning_seasons" 
  ON public.planning_seasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated manage planning_seasons" 
  ON public.planning_seasons FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read planning_items" 
  ON public.planning_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated manage planning_items" 
  ON public.planning_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read class_instructor_availability" 
  ON public.class_instructor_availability FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated manage class_instructor_availability" 
  ON public.class_instructor_availability FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow anon for local development / testing keys if needed
CREATE POLICY "Allow anon read planning_seasons" 
  ON public.planning_seasons FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon manage planning_seasons" 
  ON public.planning_seasons FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read planning_items" 
  ON public.planning_items FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon manage planning_items" 
  ON public.planning_items FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read class_instructor_availability" 
  ON public.class_instructor_availability FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon manage class_instructor_availability" 
  ON public.class_instructor_availability FOR ALL TO anon USING (true) WITH CHECK (true);

-- Migration: 20261103_student_interest_leads.sql
-- Description: Creates student_interest_leads table and demand summary functions for tracking prospective / returning student course interest.

CREATE TABLE IF NOT EXISTS public.student_interest_leads (
  lead_id SERIAL PRIMARY KEY,
  student_name VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(50),
  student_type VARCHAR(30) DEFAULT 'new_prospect', -- 'new_prospect', 'returning_student', 'former_alumni'
  class_level_id INT REFERENCES public.class_levels(class_level_id) ON DELETE SET NULL,
  target_cycle VARCHAR(100), -- e.g. 'Fall 2026', 'Next Cycle', 'Winter 2027'
  preferred_days VARCHAR(100), -- e.g. 'Tuesdays, Thursdays', 'Weekends'
  preferred_time VARCHAR(100), -- e.g. 'Evenings (7:30 - 10:00 PM)'
  notes TEXT,
  lead_source VARCHAR(100) DEFAULT 'website', -- 'website', 'in_person', 'phone', 'instructor_referral', 'other'
  lead_owner VARCHAR(100), -- staff member assigned
  status VARCHAR(30) DEFAULT 'inquired', -- 'inquired', 'contacted', 'follow_up_needed', 'enrolled', 'archived'
  follow_up_date DATE,
  student_id INT REFERENCES public.student_info(student_id) ON DELETE SET NULL, -- optional link if existing student
  personnel_id INT REFERENCES public.personnel(personnel_id) ON DELETE SET NULL, -- link to personnel directory
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.student_interest_leads ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full CRUD
CREATE POLICY "Allow authenticated users full access to student_interest_leads"
  ON public.student_interest_leads
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to insert leads (for public website / Squarespace waitlist / inquiry form)
CREATE POLICY "Allow anon insert to student_interest_leads"
  ON public.student_interest_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Index for status, class level, and follow up date
CREATE INDEX IF NOT EXISTS idx_student_interest_status ON public.student_interest_leads(status);
CREATE INDEX IF NOT EXISTS idx_student_interest_class_level ON public.student_interest_leads(class_level_id);
CREATE INDEX IF NOT EXISTS idx_student_interest_follow_up ON public.student_interest_leads(follow_up_date);

-- Aggregation function for Season Planner and CRM dashboard
CREATE OR REPLACE FUNCTION public.get_class_demand_summary()
RETURNS TABLE (
  class_level_id INT,
  level_name VARCHAR,
  active_inquiry_count BIGINT,
  new_prospect_count BIGINT,
  returning_count BIGINT,
  needs_followup_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    cl.class_level_id,
    cl.level_name,
    COUNT(sil.lead_id) FILTER (WHERE sil.status NOT IN ('enrolled', 'archived')) AS active_inquiry_count,
    COUNT(sil.lead_id) FILTER (WHERE sil.status NOT IN ('enrolled', 'archived') AND sil.student_type = 'new_prospect') AS new_prospect_count,
    COUNT(sil.lead_id) FILTER (WHERE sil.status NOT IN ('enrolled', 'archived') AND sil.student_type != 'new_prospect') AS returning_count,
    COUNT(sil.lead_id) FILTER (WHERE sil.status = 'follow_up_needed' OR (sil.follow_up_date IS NOT NULL AND sil.follow_up_date <= CURRENT_DATE AND sil.status NOT IN ('enrolled', 'archived'))) AS needs_followup_count
  FROM public.class_levels cl
  LEFT JOIN public.student_interest_leads sil ON cl.class_level_id = sil.class_level_id
  GROUP BY cl.class_level_id, cl.level_name
  ORDER BY active_inquiry_count DESC, cl.class_level_id ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_class_demand_summary() TO anon, authenticated;

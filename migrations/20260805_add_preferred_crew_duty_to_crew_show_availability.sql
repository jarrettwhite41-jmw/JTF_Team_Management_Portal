-- Add optional preferred crew duty so cast/crew users can signal assignment intent (e.g., bartender).
-- Rollback notes:
--   alter table if exists public.crew_show_availability
--     drop constraint if exists crew_show_availability_preferred_crew_duty_check;
--   alter table if exists public.crew_show_availability
--     drop column if exists preferred_crew_duty;

alter table if exists public.crew_show_availability
  add column if not exists preferred_crew_duty text null;

alter table if exists public.crew_show_availability
  drop constraint if exists crew_show_availability_preferred_crew_duty_check;

alter table if exists public.crew_show_availability
  add constraint crew_show_availability_preferred_crew_duty_check
  check (preferred_crew_duty in ('bartender', 'tech', 'house', 'box') or preferred_crew_duty is null);

create index if not exists idx_crew_show_availability_preferred_duty
  on public.crew_show_availability (show_id, preferred_crew_duty);
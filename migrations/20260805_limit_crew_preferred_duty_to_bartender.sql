-- Limit preferred crew duty intent to bartender only.
-- Existing non-bartender preference values are normalized to null.
-- Rollback notes:
--   alter table if exists public.crew_show_availability
--     drop constraint if exists crew_show_availability_preferred_crew_duty_check;
--   alter table if exists public.crew_show_availability
--     add constraint crew_show_availability_preferred_crew_duty_check
--     check (preferred_crew_duty in ('bartender', 'tech', 'house', 'box') or preferred_crew_duty is null);

update public.crew_show_availability
set preferred_crew_duty = null
where preferred_crew_duty is not null
  and preferred_crew_duty <> 'bartender';

alter table if exists public.crew_show_availability
  drop constraint if exists crew_show_availability_preferred_crew_duty_check;

alter table if exists public.crew_show_availability
  add constraint crew_show_availability_preferred_crew_duty_check
  check (preferred_crew_duty in ('bartender') or preferred_crew_duty is null);
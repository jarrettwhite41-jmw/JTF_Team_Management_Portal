-- Allow Crew portal users to submit crew show availability, not just Cast users.
-- Rollback notes:
--   drop policy if exists "cast_manage_own_crew_show_availability" on public.crew_show_availability;
--   create policy "cast_manage_own_crew_show_availability"
--   on public.crew_show_availability
--   for all
--   to authenticated
--   using (
--     exists (
--       select 1
--       from public.portal_user_access pua
--       where pua.auth_user_id = auth.uid()
--         and pua.portal_name = 'cast'
--         and pua.is_active = true
--         and pua.personnel_id = crew_show_availability.personnel_id
--     )
--   )
--   with check (
--     exists (
--       select 1
--       from public.portal_user_access pua
--       where pua.auth_user_id = auth.uid()
--         and pua.portal_name = 'cast'
--         and pua.is_active = true
--         and pua.personnel_id = crew_show_availability.personnel_id
--     )
--   );

drop policy if exists "cast_manage_own_crew_show_availability" on public.crew_show_availability;

create policy "cast_manage_own_crew_show_availability"
on public.crew_show_availability
for all
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name in ('cast', 'crew')
      and pua.is_active = true
      and pua.personnel_id = crew_show_availability.personnel_id
  )
)
with check (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name in ('cast', 'crew')
      and pua.is_active = true
      and pua.personnel_id = crew_show_availability.personnel_id
  )
);

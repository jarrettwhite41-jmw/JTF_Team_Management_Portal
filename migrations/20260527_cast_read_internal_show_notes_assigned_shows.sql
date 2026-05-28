-- Allow cast users to read overall show notes written by directors
-- when those notes are stored with visibility_scope = 'internal'.

drop policy if exists "cast read internal show notes for assigned shows" on public.show_notes;

create policy "cast read internal show notes for assigned shows"
on public.show_notes
for select
to authenticated
using (
  visibility_scope = 'internal'
  and exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'cast'
      and pua.is_active = true
      and (
        exists (
          select 1
          from public.show_performances sp
          where sp.show_id = show_notes.show_id
            and sp.personnel_id = pua.personnel_id
        )
        or exists (
          select 1
          from public.crew_duties cd
          where cd.show_id = show_notes.show_id
            and cd.personnel_id = pua.personnel_id
        )
      )
  )
);

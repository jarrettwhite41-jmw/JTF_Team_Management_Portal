-- Allow cast users to read setlist notes for shows where they are assigned
-- as either performer or crew.

drop policy if exists "cast read setlist game notes for assigned shows" on public.show_game_notes;

create policy "cast read setlist game notes for assigned shows"
on public.show_game_notes
for select
to authenticated
using (
  visibility_scope = 'setlist'
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
          where sp.show_id = show_game_notes.show_id
            and sp.personnel_id = pua.personnel_id
        )
        or exists (
          select 1
          from public.crew_duties cd
          where cd.show_id = show_game_notes.show_id
            and cd.personnel_id = pua.personnel_id
        )
      )
  )
);

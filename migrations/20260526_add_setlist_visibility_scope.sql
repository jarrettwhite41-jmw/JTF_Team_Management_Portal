-- Add 'setlist' as a valid visibility_scope value for show_game_notes
-- This allows directors to save setlist rows using the setlist builder feature.

alter table public.show_game_notes
  drop constraint if exists show_game_notes_visibility_scope_check;

alter table public.show_game_notes
  add constraint show_game_notes_visibility_scope_check
  check (visibility_scope in ('cast', 'internal', 'setlist'));

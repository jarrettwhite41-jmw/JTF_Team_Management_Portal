-- Show-level crew availability intent (separate from performer selection intent and from duty assignment).
-- Rollback notes:
--   drop table if exists public.crew_show_availability cascade;

create table if not exists public.crew_show_availability (
  id uuid primary key default gen_random_uuid(),
  show_id integer not null references public.show_information(show_id) on delete cascade,
  personnel_id integer not null references public.personnel(personnel_id) on delete cascade,
  status text not null check (status in ('available', 'not_available')),
  availability_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (show_id, personnel_id)
);

create index if not exists idx_crew_show_availability_show_status
  on public.crew_show_availability (show_id, status);

create index if not exists idx_crew_show_availability_personnel_show
  on public.crew_show_availability (personnel_id, show_id);

create or replace function public.set_crew_show_availability_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_crew_show_availability_updated_at on public.crew_show_availability;
create trigger trg_crew_show_availability_updated_at
before update on public.crew_show_availability
for each row
execute function public.set_crew_show_availability_updated_at();

alter table public.crew_show_availability enable row level security;

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
      and pua.portal_name = 'cast'
      and pua.is_active = true
      and pua.personnel_id = crew_show_availability.personnel_id
  )
)
with check (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'cast'
      and pua.is_active = true
      and pua.personnel_id = crew_show_availability.personnel_id
  )
);

drop policy if exists "team_admin_manage_crew_show_availability" on public.crew_show_availability;
create policy "team_admin_manage_crew_show_availability"
on public.crew_show_availability
for all
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'team'
      and pua.is_active = true
      and pua.portal_role in ('admin', 'manager')
  )
)
with check (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'team'
      and pua.is_active = true
      and pua.portal_role in ('admin', 'manager')
  )
);

drop policy if exists "cast_team_director_read_crew_show_availability" on public.crew_show_availability;
create policy "cast_team_director_read_crew_show_availability"
on public.crew_show_availability
for select
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.is_active = true
      and pua.portal_name in ('cast', 'team', 'director')
  )
);

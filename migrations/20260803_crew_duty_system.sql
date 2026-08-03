-- Crew duty system foundation for Team/Cast/Crew portals.
-- Rollback notes:
--   drop table if exists public.bartender_slot cascade;
--   drop table if exists public.crew_availability cascade;
--   drop table if exists public.app_settings cascade;
--   alter table public.portal_user_access drop constraint if exists portal_user_access_portal_name_check;
--   alter table public.portal_user_access add constraint portal_user_access_portal_name_check
--     check (portal_name in ('team', 'instructor', 'director', 'cast', 'student'));

-- Allow new portal access value for future Crew portal logins.
alter table if exists public.portal_user_access
  drop constraint if exists portal_user_access_portal_name_check;

alter table if exists public.portal_user_access
  add constraint portal_user_access_portal_name_check
  check (portal_name in ('team', 'instructor', 'director', 'cast', 'student', 'crew'));

-- Optional priority signal for bartender bump logic.
alter table if exists public.personnel
  add column if not exists last_bartended_date date;

-- app_settings: configurable key/value store
create table if not exists public.app_settings (
  setting_key text primary key,
  setting_value text not null,
  description text,
  updated_at timestamptz not null default now()
);

create or replace function public.set_app_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
before update on public.app_settings
for each row
execute function public.set_app_settings_updated_at();

alter table public.app_settings enable row level security;

drop policy if exists "team_admin_manage_settings" on public.app_settings;
create policy "team_admin_manage_settings"
on public.app_settings
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

drop policy if exists "authenticated_read_settings" on public.app_settings;
create policy "authenticated_read_settings"
on public.app_settings
for select
to authenticated
using (true);

insert into public.app_settings (setting_key, setting_value, description)
values
  ('bartender_bump_cutoff_hours', '72', 'Hours before show when bartender slot can no longer be bumped'),
  ('cast_availability_deadline_hours', '72', 'Hours before show when cast must submit availability'),
  ('crew_tech_slots', '1', 'Number of Tech crew slots per show'),
  ('crew_house_slots', '1', 'Number of House crew slots per show'),
  ('crew_box_slots', '1', 'Number of Box Office crew slots per show'),
  ('crew_bartender_slots', '1', 'Number of Bartender slots per show')
on conflict (setting_key) do nothing;

-- crew_availability: Tech / House / Box signups
create table if not exists public.crew_availability (
  id uuid primary key default gen_random_uuid(),
  show_id integer not null references public.show_information(show_id) on delete cascade,
  personnel_id integer not null references public.personnel(personnel_id) on delete cascade,
  role text not null check (role in ('Tech', 'House', 'Box')),
  status text not null check (status in ('available', 'confirmed', 'not_available')) default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (show_id, personnel_id, role)
);

create or replace function public.set_crew_availability_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_crew_availability_updated_at on public.crew_availability;
create trigger trg_crew_availability_updated_at
before update on public.crew_availability
for each row
execute function public.set_crew_availability_updated_at();

alter table public.crew_availability enable row level security;

drop policy if exists "cast_manage_own_crew_availability" on public.crew_availability;
create policy "cast_manage_own_crew_availability"
on public.crew_availability
for all
to authenticated
using (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'cast'
      and pua.is_active = true
      and pua.personnel_id = crew_availability.personnel_id
  )
)
with check (
  exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.portal_name = 'cast'
      and pua.is_active = true
      and pua.personnel_id = crew_availability.personnel_id
  )
);

drop policy if exists "team_admin_manage_crew_availability" on public.crew_availability;
create policy "team_admin_manage_crew_availability"
on public.crew_availability
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

drop policy if exists "cast_team_director_read_crew_availability" on public.crew_availability;
create policy "cast_team_director_read_crew_availability"
on public.crew_availability
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

-- bartender_slot: one row per show
create table if not exists public.bartender_slot (
  id uuid primary key default gen_random_uuid(),
  show_id integer not null unique references public.show_information(show_id) on delete cascade,
  personnel_id integer null references public.personnel(personnel_id) on delete set null,
  is_locked boolean not null default false,
  claimed_at timestamptz null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_bartender_slot_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_bartender_slot_updated_at on public.bartender_slot;
create trigger trg_bartender_slot_updated_at
before update on public.bartender_slot
for each row
execute function public.set_bartender_slot_updated_at();

alter table public.bartender_slot enable row level security;

drop policy if exists "authenticated_read_bartender_slot" on public.bartender_slot;
create policy "authenticated_read_bartender_slot"
on public.bartender_slot
for select
to authenticated
using (true);

drop policy if exists "bartender_claim_slot" on public.bartender_slot;
create policy "bartender_claim_slot"
on public.bartender_slot
for update
to authenticated
using (
  is_locked = false
  and exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.is_active = true
      and pua.portal_name in ('cast', 'crew')
  )
)
with check (
  is_locked = false
  and exists (
    select 1
    from public.portal_user_access pua
    where pua.auth_user_id = auth.uid()
      and pua.is_active = true
      and pua.portal_name in ('cast', 'crew')
  )
);

drop policy if exists "team_admin_manage_bartender_slot" on public.bartender_slot;
create policy "team_admin_manage_bartender_slot"
on public.bartender_slot
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

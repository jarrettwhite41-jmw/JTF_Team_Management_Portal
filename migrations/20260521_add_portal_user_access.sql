-- Multi-portal access table for pre-provisioning and role-based portal login.
-- One email can be granted access to multiple portals with different roles.

create table if not exists public.portal_user_access (
  access_id uuid primary key default gen_random_uuid(),
  auth_user_id uuid null references auth.users(id) on delete set null,
  personnel_id integer null references public.personnel(personnel_id) on delete set null,
  login_email text not null,
  portal_name text not null check (portal_name in ('team', 'instructor', 'director', 'cast', 'student')),
  portal_role text not null check (portal_role in ('admin', 'manager', 'director', 'teacher', 'cast', 'student')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (login_email, portal_name)
);

create unique index if not exists idx_portal_user_access_auth_portal
  on public.portal_user_access (auth_user_id, portal_name)
  where auth_user_id is not null;

create index if not exists idx_portal_user_access_email
  on public.portal_user_access (login_email);

create index if not exists idx_portal_user_access_personnel
  on public.portal_user_access (personnel_id);

create or replace function public.set_portal_user_access_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_portal_user_access_updated_at on public.portal_user_access;
create trigger trg_portal_user_access_updated_at
before update on public.portal_user_access
for each row
execute function public.set_portal_user_access_updated_at();

-- Backfill from existing single-portal role table when present.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'user_portal_roles'
  ) then
    insert into public.portal_user_access (
      auth_user_id,
      personnel_id,
      login_email,
      portal_name,
      portal_role,
      is_active
    )
    select
      upr.auth_user_id,
      upr.personnel_id,
      lower(coalesce(p.primary_email, au.email, '')),
      'instructor',
      case lower(trim(coalesce(upr.role, '')))
        when 'admin' then 'admin'
        when 'administrator' then 'admin'
        when 'manager' then 'manager'
        when 'director' then 'director'
        when 'teacher' then 'teacher'
        when 'instructor' then 'teacher'
        when 'cast' then 'cast'
        when 'student' then 'student'
      end,
      coalesce(upr.is_active, true)
    from public.user_portal_roles upr
    left join public.personnel p on p.personnel_id = upr.personnel_id
    left join auth.users au on au.id = upr.auth_user_id
    where coalesce(p.primary_email, au.email, '') <> ''
      and lower(trim(coalesce(upr.role, ''))) in (
        'admin', 'administrator', 'manager', 'director', 'teacher', 'instructor', 'cast', 'student'
      )
    on conflict (login_email, portal_name) do update
      set personnel_id = excluded.personnel_id,
          portal_role = excluded.portal_role,
          is_active = excluded.is_active,
          auth_user_id = coalesce(public.portal_user_access.auth_user_id, excluded.auth_user_id);
  end if;
end $$;

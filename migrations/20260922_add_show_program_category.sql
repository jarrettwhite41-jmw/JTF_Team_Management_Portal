-- Show categorization foundation for JTF Presents workflow.

alter table if exists public.show_information
  add column if not exists program_category text not null default 'standard',
  add column if not exists workflow_profile text not null default 'default',
  add column if not exists cast_signup_enabled boolean not null default true,
  add column if not exists cast_signup_deadline_at timestamptz null,
  add column if not exists attendance_estimate integer null;

alter table if exists public.show_information
  drop constraint if exists show_information_program_category_check;

alter table if exists public.show_information
  add constraint show_information_program_category_check
  check (program_category in ('standard', 'jtf_presents'));

alter table if exists public.show_information
  drop constraint if exists show_information_workflow_profile_check;

alter table if exists public.show_information
  add constraint show_information_workflow_profile_check
  check (workflow_profile in ('default', 'jtf_presents'));

alter table if exists public.show_information
  drop constraint if exists show_information_attendance_estimate_check;

alter table if exists public.show_information
  add constraint show_information_attendance_estimate_check
  check (attendance_estimate is null or attendance_estimate >= 0);

create table if not exists public.jtf_presents_open_dates (
  slot_date date primary key,
  is_open boolean not null default false,
  note text null,
  opened_by_personnel_id integer null references public.personnel(personnel_id) on delete set null,
  opened_at timestamptz null,
  closed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jtf_presents_requests (
  request_id uuid primary key default uuid_generate_v4(),
  requested_by_personnel_id integer not null references public.personnel(personnel_id) on delete cascade,
  requested_show_name text not null,
  requested_show_date date not null,
  requested_show_details text not null,
  requested_performers text null,
  requested_tech text null,
  requested_crew_notes text null,
  request_status text not null default 'pending' check (request_status in ('pending', 'approved', 'rejected', 'needs_changes')),
  approved_show_id integer null references public.show_information(show_id) on delete set null,
  approved_by_personnel_id integer null references public.personnel(personnel_id) on delete set null,
  approved_at timestamptz null,
  rejected_by_personnel_id integer null references public.personnel(personnel_id) on delete set null,
  rejected_at timestamptz null,
  rejection_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_jtf_presents_requests_active_date
  on public.jtf_presents_requests (requested_show_date)
  where request_status in ('pending', 'approved');

create index if not exists idx_jtf_presents_requests_status_date
  on public.jtf_presents_requests (request_status, requested_show_date desc);

update public.show_information si
set
  program_category = 'jtf_presents',
  workflow_profile = 'jtf_presents'
from public.show_types st
where si.show_type_id = st.show_type_id
  and lower(trim(st.show_type_name)) = 'jtf presents';

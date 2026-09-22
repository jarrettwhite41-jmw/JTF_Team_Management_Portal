-- Show categorization foundation for JTF Presents workflow.

alter table if exists public.show_information
  add column if not exists program_category text not null default 'standard',
  add column if not exists workflow_profile text not null default 'default',
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

update public.show_information si
set
  program_category = 'jtf_presents',
  workflow_profile = 'jtf_presents'
from public.show_types st
where si.show_type_id = st.show_type_id
  and lower(trim(st.show_type_name)) = 'jtf presents';

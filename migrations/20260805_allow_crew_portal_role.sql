-- Allow crew as a valid role in portal_user_access.
-- Fixes: new row violates check constraint portal_user_access_portal_role_check
-- Rollback notes:
--   alter table if exists public.portal_user_access
--     drop constraint if exists portal_user_access_portal_role_check;
--   alter table if exists public.portal_user_access
--     add constraint portal_user_access_portal_role_check
--     check (portal_role in ('admin', 'manager', 'director', 'teacher', 'cast', 'student'));

alter table if exists public.portal_user_access
  drop constraint if exists portal_user_access_portal_role_check;

alter table if exists public.portal_user_access
  add constraint portal_user_access_portal_role_check
  check (portal_role in ('admin', 'manager', 'director', 'teacher', 'cast', 'student', 'crew'));

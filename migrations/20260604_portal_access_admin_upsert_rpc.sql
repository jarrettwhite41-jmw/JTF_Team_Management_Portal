-- Ensure Team admins/managers can upsert portal access rows reliably across all portals.
-- Uses SECURITY DEFINER so RLS on portal_user_access does not block admin writes.

create or replace function public.upsert_portal_user_access_admin(
  p_login_email text,
  p_portal_name text,
  p_portal_role text,
  p_personnel_id integer default null,
  p_is_active boolean default true
)
returns public.portal_user_access
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.portal_user_access;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_team_admin() then
    raise exception 'Only active Team admins/managers can manage portal access.';
  end if;

  v_email := lower(trim(coalesce(p_login_email, '')));
  if v_email = '' then
    raise exception 'Login email is required.';
  end if;

  insert into public.portal_user_access (
    personnel_id,
    login_email,
    portal_name,
    portal_role,
    is_active
  )
  values (
    p_personnel_id,
    v_email,
    p_portal_name,
    p_portal_role,
    coalesce(p_is_active, true)
  )
  on conflict (login_email, portal_name)
  do update
    set personnel_id = excluded.personnel_id,
        portal_role = excluded.portal_role,
        is_active = excluded.is_active,
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.upsert_portal_user_access_admin(text, text, text, integer, boolean) from public;
grant execute on function public.upsert_portal_user_access_admin(text, text, text, integer, boolean) to authenticated;

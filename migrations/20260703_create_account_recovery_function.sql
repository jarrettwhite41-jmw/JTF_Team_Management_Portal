-- Function to identify account mismatches between auth.users, portal_user_access, and personnel tables
create or replace function public.get_account_mismatches()
returns table (
  access_id uuid,
  personnel_id integer,
  login_email text,
  portal_name text,
  portal_role text,
  auth_user_id uuid,
  auth_email text,
  personnel_email text,
  personnel_name text,
  is_mismatched boolean
) as $$
begin
  return query
  select
    pua.access_id,
    pua.personnel_id,
    pua.login_email,
    pua.portal_name,
    pua.portal_role,
    pua.auth_user_id,
    au.email as auth_email,
    p.primary_email as personnel_email,
    concat_ws(' ', p.first_name, p.last_name) as personnel_name,
    -- Mark as mismatched if:
    -- 1. login_email doesn't match auth email (case-insensitive), OR
    -- 2. login_email doesn't match personnel email, OR
    -- 3. auth_user_id exists but auth user's email doesn't match login_email
    (
      lower(coalesce(pua.login_email, '')) <> lower(coalesce(au.email, ''))
      or lower(coalesce(pua.login_email, '')) <> lower(coalesce(p.primary_email, ''))
    ) and pua.auth_user_id is not null
  from public.portal_user_access pua
  left join auth.users au on au.id = pua.auth_user_id
  left join public.personnel p on p.personnel_id = pua.personnel_id
  where pua.auth_user_id is not null  -- Only check linked accounts
  order by pua.login_email;
end;
$$ language plpgsql security definer;

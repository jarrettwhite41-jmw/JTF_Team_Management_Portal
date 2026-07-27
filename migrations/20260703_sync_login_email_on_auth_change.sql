-- Sync login_email when auth user email changes
-- This prevents login failures when users change their email in Supabase Auth

create or replace function public.sync_portal_user_email_on_auth_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_email text;
  v_new_email text;
begin
  v_old_email := coalesce(old.email, '')::text;
  v_new_email := coalesce(new.email, '')::text;

  -- Only process if email actually changed
  if v_old_email <> v_new_email and v_new_email <> '' then
    -- Update all portal_user_access rows that match the old email
    update public.portal_user_access
    set login_email = v_new_email
    where login_email = v_old_email and auth_user_id = new.id;
  end if;

  return new;
end;
$$;

-- Create trigger on auth.users table
drop trigger if exists trg_sync_portal_email_on_auth_change on auth.users;
create trigger trg_sync_portal_email_on_auth_change
after update on auth.users
for each row
execute function public.sync_portal_user_email_on_auth_change();

-- Fix existing mismatches: update login_email to match current auth email for any rows with mismatched emails
do $$
declare
  v_fixed_count integer;
begin
  with mismatches as (
    select pua.access_id, pua.login_email, au.email as current_auth_email
    from public.portal_user_access pua
    join auth.users au on au.id = pua.auth_user_id
    where lower(pua.login_email) <> lower(au.email)
  )
  update public.portal_user_access pua
  set login_email = m.current_auth_email
  from mismatches m
  where pua.access_id = m.access_id;

  get diagnostics v_fixed_count = row_count;
  if v_fixed_count > 0 then
    raise notice 'Fixed % email mismatches in portal_user_access', v_fixed_count;
  end if;
end $$;

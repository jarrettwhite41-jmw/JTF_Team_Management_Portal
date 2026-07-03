-- Function to sync auth user email to match personnel email for account recovery
create or replace function public.fix_auth_email_mismatch(
  p_access_id uuid,
  p_personnel_id integer
)
returns jsonb as $$
declare
  v_personnel_email text;
  v_auth_user_id uuid;
  v_old_email text;
begin
  -- Get the personnel email and auth_user_id
  select p.primary_email, pua.auth_user_id
  into v_personnel_email, v_auth_user_id
  from public.personnel p
  join public.portal_user_access pua on pua.personnel_id = p.personnel_id
  where pua.access_id = p_access_id and p.personnel_id = p_personnel_id;

  if v_personnel_email is null or v_auth_user_id is null then
    return jsonb_build_object('success', false, 'message', 'Personnel or auth user not found');
  end if;

  -- Get the old email before updating
  select email into v_old_email from auth.users where id = v_auth_user_id;

  -- Update the auth user email
  update auth.users
  set email = v_personnel_email
  where id = v_auth_user_id;

  -- The trigger will automatically update portal_user_access.login_email
  
  return jsonb_build_object(
    'success', true,
    'message', 'Email synced successfully',
    'old_email', v_old_email,
    'new_email', v_personnel_email
  );
end;
$$ language plpgsql security definer;

grant execute on function public.fix_auth_email_mismatch to authenticated, anon;

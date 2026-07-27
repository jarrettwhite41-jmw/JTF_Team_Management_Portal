import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type PortalName = 'team' | 'instructor' | 'director' | 'cast' | 'student';
type PortalRole = 'admin' | 'manager' | 'director' | 'teacher' | 'cast' | 'student';

interface ProvisionRequest {
  loginEmail: string;
  portalName: PortalName;
  portalRole?: PortalRole;
  temporaryPassword?: string;
  useDefaultPassword?: boolean;
  sendResetEmail?: boolean;
  redirectTo?: string;
  personnelId?: number | null;
}

const PORTAL_NAMES: PortalName[] = ['team', 'instructor', 'director', 'cast', 'student'];
const PORTAL_ROLES: PortalRole[] = ['admin', 'manager', 'director', 'teacher', 'cast', 'student'];
const TEAM_ADMIN_ROLES = new Set<PortalRole>(['admin', 'manager']);

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const isValidEmail = (value: string): boolean => /.+@.+\..+/.test(value);

const isValidRedirectUrl = (value?: string): boolean => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.hostname === 'localhost';
  } catch {
    return false;
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { error: 'Missing Supabase environment configuration.' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json(401, { error: 'Missing authorization header.' });
  }

  let body: ProvisionRequest;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON payload.' });
  }

  const loginEmail = String(body.loginEmail || '').trim().toLowerCase();
  const portalName = body.portalName;
  const useDefaultPassword = body.useDefaultPassword === true;
  const temporaryPassword = String(body.temporaryPassword || '');
  const redirectTo = isValidRedirectUrl(body.redirectTo) ? body.redirectTo : undefined;
  const sendResetEmail = body.sendResetEmail !== false;
  const defaultPasswordFromSecret = Deno.env.get('PORTAL_DEFAULT_TEMP_PASSWORD') || '';

  const passwordToApply = useDefaultPassword ? defaultPasswordFromSecret : temporaryPassword;

  if (!loginEmail || !isValidEmail(loginEmail)) {
    return json(400, { error: 'A valid loginEmail is required.' });
  }

  if (!PORTAL_NAMES.includes(portalName)) {
    return json(400, { error: 'portalName is invalid.' });
  }

  if (!passwordToApply || passwordToApply.length < 8) {
    return json(400, {
      error: useDefaultPassword
        ? 'Default password secret is missing or too short. Set PORTAL_DEFAULT_TEMP_PASSWORD (min 8 chars).'
        : 'temporaryPassword must be at least 8 characters.',
    });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user: callerUser },
    error: callerError,
  } = await authClient.auth.getUser();

  if (callerError || !callerUser) {
    return json(401, { error: 'Caller is not authenticated.' });
  }

  const { data: teamAccess, error: teamAccessError } = await serviceClient
    .from('portal_user_access')
    .select('portal_role,is_active')
    .eq('portal_name', 'team')
    .eq('auth_user_id', callerUser.id)
    .maybeSingle<{ portal_role: PortalRole; is_active: boolean }>();

  if (teamAccessError) {
    return json(500, { error: `Unable to verify caller portal access: ${teamAccessError.message}` });
  }

  if (!teamAccess?.is_active || !TEAM_ADMIN_ROLES.has(teamAccess.portal_role)) {
    return json(403, { error: 'Only active Team admins/managers can provision credentials.' });
  }

  const findUserByEmail = async (email: string) => {
    let page = 1;

    while (page <= 20) {
      const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) {
        throw new Error(`Unable to list auth users: ${error.message}`);
      }

      const matched = data.users.find((user) => (user.email || '').toLowerCase() === email);
      if (matched) {
        return matched;
      }

      if (!data.nextPage || data.users.length === 0) {
        break;
      }

      page = data.nextPage;
    }

    return null;
  };

  try {
    const { data: existingAccess, error: existingAccessError } = await serviceClient
      .from('portal_user_access')
      .select('portal_role,personnel_id,auth_user_id')
      .eq('login_email', loginEmail)
      .eq('portal_name', portalName)
      .maybeSingle<{ portal_role: PortalRole; personnel_id: number | null; auth_user_id: string | null }>();

    if (existingAccessError) {
      return json(500, { error: `Unable to read portal access row: ${existingAccessError.message}` });
    }

    const effectiveRole = body.portalRole || existingAccess?.portal_role;
    if (!effectiveRole || !PORTAL_ROLES.includes(effectiveRole)) {
      return json(400, { error: 'portalRole is required when no portal access row exists.' });
    }

    const existingUser = await findUserByEmail(loginEmail);

    // If user not found by email but we have an auth_user_id from portal_access, they may have changed their email
    let fallbackAuthUserId: string | null = null;
    if (!existingUser && existingAccess?.auth_user_id) {
      fallbackAuthUserId = existingAccess.auth_user_id;
    }

    let authUserId = existingUser?.id || fallbackAuthUserId;
    let createdNewUser = false;

    if (existingUser) {
      const { error } = await serviceClient.auth.admin.updateUserById(existingUser.id, {
        password: passwordToApply,
        email: loginEmail, // Also update email if needed
        email_confirm: true,
      });

      if (error) {
        return json(500, { error: `Unable to update existing auth user: ${error.message}` });
      }
    } else if (fallbackAuthUserId) {
      // User was found by auth_user_id (email might have changed)
      const { error } = await serviceClient.auth.admin.updateUserById(fallbackAuthUserId, {
        password: passwordToApply,
        email: loginEmail, // Update email to match login_email
        email_confirm: true,
      });

      if (error) {
        return json(500, { error: `Unable to update auth user by ID: ${error.message}` });
      }
    } else {
      // Create new user
      const { data, error } = await serviceClient.auth.admin.createUser({
        email: loginEmail,
        password: passwordToApply,
        email_confirm: true,
      });

      if (error || !data.user) {
        return json(500, { error: `Unable to create auth user: ${error?.message || 'unknown error'}` });
      }

      authUserId = data.user.id;
      createdNewUser = true;
    }

    const personnelId = typeof body.personnelId === 'number'
      ? body.personnelId
      : (existingAccess?.personnel_id ?? null);

    const { error: upsertError } = await serviceClient
      .from('portal_user_access')
      .upsert(
        {
          login_email: loginEmail,
          portal_name: portalName,
          portal_role: effectiveRole,
          auth_user_id: authUserId,
          personnel_id: personnelId,
          is_active: true,
        },
        { onConflict: 'login_email,portal_name' },
      );

    if (upsertError) {
      return json(500, { error: `Unable to upsert portal access row: ${upsertError.message}` });
    }

    let resetEmailSent = false;
    let resetWarning: string | undefined;

    if (sendResetEmail) {
      const { error } = await serviceClient.auth.resetPasswordForEmail(loginEmail, redirectTo ? { redirectTo } : undefined);
      if (error) {
        resetWarning = error.message;
      } else {
        resetEmailSent = true;
      }
    }

    return json(200, {
      userId: authUserId,
      createdNewUser,
      portalAccessLinked: true,
      resetEmailSent,
      portalName,
      loginEmail,
      usedDefaultPassword: useDefaultPassword,
      warning: resetWarning,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown provisioning error.';
    return json(500, { error: message });
  }
});

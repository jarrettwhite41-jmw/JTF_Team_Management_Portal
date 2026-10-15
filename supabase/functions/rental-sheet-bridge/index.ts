import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type RequestBody = {
  action?: 'upsert' | 'delete';
  rentalId?: number;
};

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const webAppUrl = Deno.env.get('GOOGLE_SHEETS_WEB_APP_URL');
  const webhookToken = Deno.env.get('GOOGLE_SHEETS_WEBHOOK_TOKEN');
  const authHeader = req.headers.get('Authorization');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { error: 'Supabase server environment is not configured.' });
  }
  if (!authHeader) return json(401, { error: 'Authentication is required.' });

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body.' });
  }

  if (body.action !== 'upsert' && body.action !== 'delete') {
    return json(400, { error: 'Action must be upsert or delete.' });
  }
  const rentalId = Number(body.rentalId);
  if (!Number.isInteger(rentalId) || rentalId <= 0) {
    return json(400, { error: 'A valid rentalId is required.' });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user) return json(401, { error: 'Caller is not authenticated.' });

  const { data: access, error: accessError } = await serviceClient
    .from('portal_user_access')
    .select('portal_role,is_active')
    .eq('portal_name', 'team')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (accessError) return json(500, { error: `Unable to verify Team access: ${accessError.message}` });
  if (!access?.is_active || !['admin', 'manager'].includes(access.portal_role)) {
    return json(403, { error: 'Only active Team admins and managers can write pipeline changes to the sheet.' });
  }

  const { data: settings, error: settingsError } = await serviceClient
    .from('app_settings')
    .select('setting_key,setting_value')
    .in('setting_key', ['enable_rental_sheet_writeback', 'google_sheet_rental_pipeline_id']);
  if (settingsError) return json(500, { error: `Unable to read pipeline settings: ${settingsError.message}` });

  const settingMap = Object.fromEntries((settings || []).map((setting: any) => [setting.setting_key, setting.setting_value]));
  const writebackEnabled = settingMap.enable_rental_sheet_writeback === 'true';

  const { data: rental, error: rentalError } = await serviceClient
    .from('venue_rentals')
    .select('*')
    .eq('rental_id', rentalId)
    .maybeSingle();
  if (rentalError) return json(500, { error: `Unable to load deal: ${rentalError.message}` });
  if (!rental) return json(404, { error: 'Deal was not found.' });

  if (body.action === 'delete' && !writebackEnabled) {
    if (rental.sheet_opportunity_id) {
      return json(409, { error: 'Enable sheet write-back before removing a sheet-backed deal, or remove it directly from the Google Sheet first.' });
    }
    const { error } = await serviceClient.from('venue_rentals').delete().eq('rental_id', rentalId);
    if (error) return json(500, { error: `Unable to remove deal from the portal: ${error.message}` });
    return json(200, { success: true, deleted: true, syncedToSheet: false });
  }

  if (body.action === 'upsert' && !writebackEnabled) {
    return json(200, { success: true, syncedToSheet: false, skipped: true, reason: 'Write-back is disabled.' });
  }

  if (!webAppUrl || !webhookToken) {
    return json(503, { error: 'Sheet write-back is enabled, but the Apps Script web app URL or webhook token is not configured.' });
  }
  const sheetId = String(settingMap.google_sheet_rental_pipeline_id || '').trim();
  if (!sheetId) return json(503, { error: 'The pipeline Google Sheet ID is not configured.' });

  let opportunityId = String(rental.sheet_opportunity_id || '').trim();
  if (body.action === 'upsert' && !opportunityId) {
    opportunityId = `PORTAL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const { error } = await serviceClient
      .from('venue_rentals')
      .update({ sheet_opportunity_id: opportunityId, updated_at: new Date().toISOString() })
      .eq('rental_id', rentalId);
    if (error) return json(500, { error: `Unable to assign a sheet opportunity ID: ${error.message}` });
    rental.sheet_opportunity_id = opportunityId;
  }

  try {
    const scriptResponse = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: webhookToken,
        action: body.action,
        sheetId,
        opportunityId,
        rental: body.action === 'upsert' ? rental : undefined,
      }),
    });
    const responseText = await scriptResponse.text();
    let scriptResult: { success?: boolean; error?: string };
    try {
      scriptResult = JSON.parse(responseText);
    } catch {
      return json(502, { error: 'Apps Script returned an unreadable response. Check the web app deployment and execution log.' });
    }
    if (!scriptResponse.ok || !scriptResult.success) {
      return json(502, { error: scriptResult.error || `Apps Script returned HTTP ${scriptResponse.status}.` });
    }
  } catch (error) {
    return json(502, { error: `Unable to reach the Apps Script web app: ${(error as Error).message}` });
  }

  if (body.action === 'delete') {
    const { error } = await serviceClient.from('venue_rentals').delete().eq('rental_id', rentalId);
    if (error) return json(500, { error: `Sheet row removed, but portal deletion failed: ${error.message}` });
    return json(200, { success: true, deleted: true, syncedToSheet: true });
  }

  return json(200, { success: true, syncedToSheet: true, opportunityId });
});
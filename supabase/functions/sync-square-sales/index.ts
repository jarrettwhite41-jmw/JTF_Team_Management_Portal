import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: 'Supabase server environment is not configured.' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Get Square integration credentials from database
    const { data: sqConfig, error: configErr } = await supabase
      .from('ticketing_integrations')
      .select('*')
      .eq('platform', 'square')
      .single();

    if (configErr || !sqConfig) {
      return json(400, { error: 'Square integration not found in ticketing_integrations.' });
    }

    const apiKey = sqConfig.api_key;
    const locationId = sqConfig.location_id?.trim();

    if (!apiKey || !locationId) {
      return json(400, { error: 'Square API access token or Location ID is missing.' });
    }

    // 2. Fetch scheduled shows from Supabase to match by date
    const { data: shows, error: showsErr } = await supabase
      .from('show_information')
      .select('show_id, show_date, show_time, venue, show_types(show_type_name)')
      .order('show_date', { ascending: false });

    if (showsErr) {
      return json(500, { error: `Failed to fetch shows: ${showsErr.message}` });
    }

    // 3. Query Square orders from the last 90 days
    const startSearchDate = new Date();
    startSearchDate.setDate(startSearchDate.getDate() - 90);

    const sqRes = await fetch('https://connect.squareup.com/v2/orders/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location_ids: [locationId],
        query: {
          filter: {
            state_filter: { states: ['COMPLETED'] },
            date_time_filter: {
              created_at: {
                start_at: startSearchDate.toISOString(),
              },
            },
          },
        },
        limit: 250,
      }),
    });

    if (!sqRes.ok) {
      const errBody = await sqRes.text();
      return json(sqRes.status, { error: `Square API error: ${errBody}` });
    }

    const sqData = await sqRes.json();
    const orders: any[] = sqData.orders || [];

    // 4. Aggregate ticket sales by local Eastern show date (America/New_York)
    const doorSalesByDate: Record<string, { tickets: number; revenue: number }> = {};

    orders.forEach((o: any) => {
      if (!o.created_at) return;
      const orderDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(o.created_at));

      o.line_items?.forEach((item: any) => {
        const name = (item.name || '').toLowerCase();
        const isAdmission =
          (name.includes('show') ||
            name.includes('fnl') ||
            name.includes('mainstage') ||
            name.includes('spotlight') ||
            name.includes('deathmatch') ||
            name.includes('presents') ||
            name.includes('ticket') ||
            name.includes('pass')) &&
          !name.includes('class') &&
          !name.includes('tuition');

        if (isAdmission) {
          if (!doorSalesByDate[orderDateStr]) {
            doorSalesByDate[orderDateStr] = { tickets: 0, revenue: 0 };
          }
          const qty = Number(item.quantity || 1);
          const amt = Number(item.total_money?.amount || 0) / 100;
          doorSalesByDate[orderDateStr].tickets += qty;
          doorSalesByDate[orderDateStr].revenue += amt;
        }
      });
    });

    // 5. Upsert into show_ticketing
    let syncedCount = 0;
    const now = new Date().toISOString();

    for (const [dateStr, agg] of Object.entries(doorSalesByDate)) {
      const matchingShow = (shows || []).find((s: any) => s.show_date === dateStr);
      if (!matchingShow) continue;

      const { error: upsertErr } = await supabase.from('show_ticketing').upsert(
        {
          show_id: matchingShow.show_id,
          platform: 'square',
          door_walkup_count: agg.tickets,
          door_walkup_revenue: Math.round(agg.revenue * 100) / 100,
          sold_count: agg.tickets,
          gross_revenue: Math.round(agg.revenue * 100) / 100,
          ticket_status: 'open',
          updated_at: now,
        },
        { onConflict: 'show_id,platform' }
      );

      if (!upsertErr) {
        syncedCount++;
      }
    }

    // 6. Update ticketing_integrations status
    await supabase
      .from('ticketing_integrations')
      .update({ last_synced_at: now, sync_status: 'success', sync_error: null })
      .eq('platform', 'square');

    return json(200, {
      success: true,
      syncedShows: syncedCount,
      matchedDates: Object.keys(doorSalesByDate).length,
      message: `Square sync successful: updated ${syncedCount} shows from door sales.`,
    });
  } catch (err: any) {
    return json(500, { error: err.message || 'Unknown server error during Square sync' });
  }
});

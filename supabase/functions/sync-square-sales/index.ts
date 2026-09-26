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

    // 4. Aggregate ticket sales by local Eastern show date and match by name/time when multiple shows exist
    // doorSales: key = `${orderDateStr}_${showTypeId || 'any'}` or date matching
    const parseMinutes = (timeStr?: string): number | null => {
      if (!timeStr) return null;
      const m = timeStr.match(/(\d{1,2}):(\d{2})/);
      return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
    };

    // Store admissions per show_id
    const showSalesMap: Record<number, { tickets: number; revenue: number }> = {};

    orders.forEach((o: any) => {
      if (!o.created_at) return;
      const orderDateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(o.created_at));

      // Get order time in minutes for time matching
      const orderTimeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(o.created_at));
      const orderMinutes = parseMinutes(orderTimeStr);

      const candidateShows = (shows || []).filter((s: any) => s.show_date === orderDateStr);
      if (candidateShows.length === 0) return;

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

        if (!isAdmission) return;

        const qty = Number(item.quantity || 1);
        const amt = Number(item.total_money?.amount || 0) / 100;

        let targetShow = candidateShows[0];

        // If multiple shows on this date, pick best match by name & time
        if (candidateShows.length > 1) {
          let bestScore = -1;
          for (const s of candidateShows) {
            let score = 0;
            const typeName = (s.show_types?.show_type_name || '').toLowerCase();
            const venue = (s.venue || '').toLowerCase();

            if (name.includes('spotlight') && venue.includes('spotlight')) score += 30;
            if (name.includes('mainstage') && venue.includes('main')) score += 30;
            if (name.includes('fnl') && (typeName.includes('fnl') || typeName.includes('friday'))) score += 40;
            if (name.includes('big show') && typeName.includes('big')) score += 40;
            if (name.includes('presents') && typeName.includes('presents')) score += 40;
            if (name.includes('spanish') && (typeName.includes('spanish') || typeName.includes('dale'))) score += 40;
            if (name.includes('death') && typeName.includes('death')) score += 40;
            if (name.includes('musical') && typeName.includes('musical')) score += 40;

            const showMinutes = parseMinutes(s.show_time);
            if (orderMinutes !== null && showMinutes !== null) {
              const diff = Math.abs(orderMinutes - showMinutes);
              if (diff <= 60) score += 20;
              else if (diff <= 120) score += 10;
            }

            if (score > bestScore) {
              bestScore = score;
              targetShow = s;
            }
          }
        }

        if (targetShow) {
          if (!showSalesMap[targetShow.show_id]) {
            showSalesMap[targetShow.show_id] = { tickets: 0, revenue: 0 };
          }
          showSalesMap[targetShow.show_id].tickets += qty;
          showSalesMap[targetShow.show_id].revenue += amt;
        }
      });
    });

    // 5. Upsert into show_ticketing
    let syncedCount = 0;
    const now = new Date().toISOString();

    for (const [showIdStr, agg] of Object.entries(showSalesMap)) {
      const showId = parseInt(showIdStr, 10);
      const { error: upsertErr } = await supabase.from('show_ticketing').upsert(
        {
          show_id: showId,
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
      matchedShows: Object.keys(showSalesMap).length,
      message: `Square sync successful: updated ${syncedCount} shows from door sales.`,
    });
  } catch (err: any) {
    return json(500, { error: err.message || 'Unknown server error during Square sync' });
  }
});

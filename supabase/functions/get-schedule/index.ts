import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SCHOOL_ID = 'zbt-primary';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const publishedVersion = await supabase
      .from('timetable_versions')
      .select('id')
      .eq('school_id', SCHOOL_ID)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const versionId = publishedVersion.data?.id;

    const [assignmentsRes, settingsRes] = await Promise.all([
      versionId
        ? supabase
            .from('daily_period_assignments')
            .select('id, class_id, class_name, day_of_week, day_arabic, teacher_id, teacher_name, period_number, subject, notes')
            .eq('school_id', SCHOOL_ID)
            .eq('version_id', versionId)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('school_settings')
        .select('settings_json')
        .eq('school_id', SCHOOL_ID)
        .single(),
    ]);

    if (assignmentsRes.error) {
      return new Response(JSON.stringify({ error: assignmentsRes.error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const settingsJson = settingsRes.data?.settings_json as Record<string, unknown> | null;

    return new Response(
      JSON.stringify({
        assignments: assignmentsRes.data ?? [],
        settings: settingsJson
          ? {
              period2StartTime: settingsJson.period2StartTime,
              period2EndTime: settingsJson.period2EndTime,
            }
          : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

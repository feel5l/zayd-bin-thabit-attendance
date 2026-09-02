import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SCHOOL_ID = 'zbt-primary';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function normaliseSaudiPhone(raw: string): string {
  let d = (raw || '').replace(/[^0-9]/g, '');
  if (d.startsWith('00966')) d = '0' + d.slice(5);
  else if (d.startsWith('966')) d = '0' + d.slice(3);
  if (d.length === 9 && d.startsWith('5')) d = '0' + d;
  return d;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { identifier } = await req.json();
    if (!identifier || typeof identifier !== 'string') {
      return new Response(JSON.stringify({ error: 'identifier required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const raw = identifier.trim();
    const normalised = normaliseSaudiPhone(raw) || raw;
    const hash = await sha256Hex(normalised);

    // Try phone_hash first, then national_id_hash
    let { data: teachers, error } = await supabase
      .from('teachers')
      .select('id, display_name, subject, assigned_class_id, avatar, role, username, sequence_number')
      .eq('school_id', SCHOOL_ID)
      .eq('is_active', true)
      .eq('phone_hash', hash);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!teachers || teachers.length === 0) {
      const natRes = await supabase
        .from('teachers')
        .select('id, display_name, subject, assigned_class_id, avatar, role, username, sequence_number')
        .eq('school_id', SCHOOL_ID)
        .eq('is_active', true)
        .eq('national_id_hash', hash);

      if (natRes.error) {
        return new Response(JSON.stringify({ error: natRes.error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      teachers = natRes.data;
    }

    if (!teachers || teachers.length === 0) {
      return new Response(JSON.stringify({ found: false }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (teachers.length > 1) {
      return new Response(JSON.stringify({ found: false, ambiguous: true }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ found: true, teacher: teachers[0] }),
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

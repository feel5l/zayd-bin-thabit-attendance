import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// publish-import-batch
// ---------------------------------------------------------------------------
// Admin-only. Requires x-device-token issued by admin-login (role = admin).
// verify_jwt alone is not enough: the public anon key is itself a valid JWT.
//
// NOTE (security review S3, Sep 2026): this file mirrors the version that was
// actually deployed (v1), plus the admin token gate. That version writes to
// `schedule_versions`, which does not exist, so publishing still fails with
// 400 for admins. Do not "fix" it by pointing at timetable_versions until
// submit-attendance filters daily_period_assignments by the published
// version — its maybeSingle() lookup errors once a second version exists.

const SCHOOL_ID = 'zbt-primary';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TimetableEntry {
  teacherId: string;
  teacherName: string;
  classId: string;
  className: string;
  dayOfWeek: string;
  dayArabic: string;
  periodNumber: number;
  subject: string;
}

interface Period2Assignment {
  id: string;
  classId: string;
  className: string;
  day: string;
  dayArabic: string;
  teacherId: string;
  teacherName: string;
  periodNumber: number;
  subject: string;
  notes?: string;
}

interface ImportBatchPayload {
  schoolId?: string;
  version: number;
  publishedAt: string;
  publishedBy: string;
  timetableEntries: TimetableEntry[];
  period2Assignments: Period2Assignment[];
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const token = req.headers.get('x-device-token') || '';
    if (!token) {
      return new Response(JSON.stringify({ error: 'missing_device_token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: device, error: deviceError } = await supabase
      .from('device_tokens')
      .select('role, revoked_at')
      .eq('token_hash', await sha256Hex(token))
      .eq('school_id', SCHOOL_ID)
      .maybeSingle();

    if (deviceError) {
      return new Response(JSON.stringify({ error: 'device_lookup_failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!device || device.revoked_at) {
      return new Response(JSON.stringify({ error: 'invalid_device_token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (device.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'admin_only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = (await req.json()) as ImportBatchPayload;
    // Single-school deployment: never trust a client-supplied schoolId.
    const schoolId = SCHOOL_ID;

    const { data: versionRow, error: versionError } = await supabase
      .from('schedule_versions')
      .insert({
        school_id: schoolId,
        version: payload.version,
        published_at: payload.publishedAt,
        published_by: payload.publishedBy,
        source: 'excel-import',
      })
      .select('id')
      .single();

    if (versionError) {
      return new Response(JSON.stringify({ error: versionError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const versionId = versionRow.id as string;

    if (payload.timetableEntries.length > 0) {
      const { error: timetableError } = await supabase.from('timetable_entries').insert(
        payload.timetableEntries.map((entry) => ({
          school_id: schoolId,
          version_id: versionId,
          teacher_id: entry.teacherId,
          teacher_name: entry.teacherName,
          class_id: entry.classId,
          class_name: entry.className,
          day_of_week: entry.dayOfWeek,
          day_arabic: entry.dayArabic,
          period_number: entry.periodNumber,
          subject: entry.subject,
        }))
      );

      if (timetableError) {
        return new Response(JSON.stringify({ error: timetableError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (payload.period2Assignments.length > 0) {
      const { error: assignmentError } = await supabase.from('daily_period_assignments').insert(
        payload.period2Assignments.map((assignment) => ({
          school_id: schoolId,
          version_id: versionId,
          assignment_id: assignment.id,
          class_id: assignment.classId,
          class_name: assignment.className,
          day: assignment.day,
          day_arabic: assignment.dayArabic,
          teacher_id: assignment.teacherId,
          teacher_name: assignment.teacherName,
          period_number: assignment.periodNumber,
          subject: assignment.subject,
          notes: assignment.notes ?? null,
        }))
      );

      if (assignmentError) {
        return new Response(JSON.stringify({ error: assignmentError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        versionId,
        timetableCount: payload.timetableEntries.length,
        assignmentCount: payload.period2Assignments.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// publish-import-batch
// ---------------------------------------------------------------------------
// Admin-only (x-device-token with role = admin). Publishes a Period-2
// timetable imported from Excel so every device picks it up via get-schedule.
//
// Flow: create a DRAFT timetable_versions row → insert its
// daily_period_assignments → publish_timetable_version() archives the old
// published version and publishes the draft in one transaction. Any failure
// before that deletes the draft, so the live timetable is never half-written.
// Readers (get-schedule, submit-attendance) filter by the published version.

const SCHOOL_ID = 'zbt-primary';
const VALID_DAYS = new Set(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday']);
const MAX_ASSIGNMENTS = 500;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Period2Assignment {
  id: string;
  classId: string;
  className: string;
  day: string;
  dayArabic: string;
  teacherId: string;
  teacherName: string;
  periodNumber?: number;
  subject?: string;
  notes?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'server_configuration_error' }, 500);
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let draftId: string | null = null;
  try {
    const token = req.headers.get('x-device-token') || '';
    if (!token) return json({ error: 'missing_device_token' }, 401);

    const { data: device, error: deviceError } = await supabase
      .from('device_tokens')
      .select('teacher_id, role, revoked_at, expires_at')
      .eq('token_hash', await sha256Hex(token))
      .eq('school_id', SCHOOL_ID)
      .maybeSingle();
    if (deviceError) return json({ error: 'device_lookup_failed' }, 500);
    if (!device || device.revoked_at || new Date(device.expires_at).getTime() <= Date.now()) return json({ error: 'invalid_device_token' }, 401);
    if (device.role !== 'admin') return json({ error: 'admin_only' }, 403);

    const body = await req.json().catch(() => null);
    const input = Array.isArray(body?.period2Assignments) ? (body.period2Assignments as Period2Assignment[]) : [];
    if (input.length === 0) return json({ error: 'period2Assignments_required' }, 400);
    if (input.length > MAX_ASSIGNMENTS) return json({ error: 'too_many_assignments' }, 400);

    const seen = new Set<string>();
    const rows: Record<string, unknown>[] = [];
    for (const a of input) {
      const classId = str(a?.classId, 64);
      const day = str(a?.day, 16);
      const teacherId = str(a?.teacherId, 64);
      const periodNumber = Number(a?.periodNumber ?? 2);
      if (!classId || !teacherId || !VALID_DAYS.has(day) || !Number.isInteger(periodNumber) || periodNumber < 1 || periodNumber > 8) {
        return json({ error: 'invalid_assignment', assignment: { classId, day, teacherId } }, 400);
      }
      const key = `${classId}|${day}|${periodNumber}`;
      if (seen.has(key)) return json({ error: 'duplicate_assignment', key }, 400);
      seen.add(key);
      rows.push({
        class_id: classId,
        class_name: str(a.className) || classId,
        day_of_week: day,
        day_arabic: str(a.dayArabic, 32) || day,
        teacher_id: teacherId,
        teacher_name: str(a.teacherName) || teacherId,
        period_number: periodNumber,
        subject: str(a.subject) || null,
        notes: str(a.notes, 500) || null,
      });
    }

    const { data: draft, error: draftError } = await supabase
      .from('timetable_versions')
      .insert({
        school_id: SCHOOL_ID,
        label: str(body?.label, 120) || `import-${new Date().toISOString().slice(0, 10)}`,
        status: 'draft',
        source: str(body?.source, 40) || 'excel_import',
        imported_by: device.teacher_id,
      })
      .select('id')
      .single();
    if (draftError || !draft) return json({ error: 'create_version_failed' }, 500);
    draftId = draft.id as string;

    // Assignment ids are client-generated as assign_<class>_<day>, identical
    // across imports, so prefix them with the version to keep the PK unique.
    const prefix = draftId.slice(0, 8);
    const { error: insertError } = await supabase.from('daily_period_assignments').insert(
      rows.map((r) => ({
        ...r,
        id: `v${prefix}_${r.class_id}_${r.day_of_week}_p${r.period_number}`,
        school_id: SCHOOL_ID,
        version_id: draftId,
      })),
    );
    if (insertError) throw new Error(`assignments: ${insertError.message}`);

    const { error: publishError } = await supabase.rpc('publish_timetable_version', {
      p_school_id: SCHOOL_ID,
      p_version_id: draftId,
    });
    if (publishError) throw new Error(`publish: ${publishError.message}`);

    const published = draftId;
    draftId = null;
    return json({ status: 'published', versionId: published, assignmentsCount: rows.length });
  } catch (err) {
    console.error('[publish-import-batch]', err instanceof Error ? err.message : err);
    if (draftId) {
      await supabase.from('daily_period_assignments').delete().eq('version_id', draftId);
      await supabase.from('timetable_versions').delete().eq('id', draftId).eq('status', 'draft');
    }
    return json({ error: 'publish_failed' }, 500);
  }
});

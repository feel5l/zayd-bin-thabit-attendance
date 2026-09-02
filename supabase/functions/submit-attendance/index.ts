import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SCHOOL_ID = 'zbt-primary';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // GET: pull today's submissions
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('attendance_submissions')
        .select(`
          *,
          attendance_student_items (*)
        `)
        .eq('school_id', SCHOOL_ID)
        .eq('date', date);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ submissions: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST: upsert a submission
    const body = await req.json();
    const { submission, studentItems, clientOpId } = body;

    if (!submission || !studentItems) {
      return new Response(JSON.stringify({ error: 'submission and studentItems required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Idempotency: check if this clientOpId already exists
    if (clientOpId) {
      const { data: existing } = await supabase
        .from('attendance_submissions')
        .select('id')
        .eq('client_op_id', clientOpId)
        .limit(1);

      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ status: 'duplicate', id: existing[0].id }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // LWW conflict check: same class+date+period
    const { data: conflicting } = await supabase
      .from('attendance_submissions')
      .select('id, teacher_id, updated_at')
      .eq('school_id', SCHOOL_ID)
      .eq('class_id', submission.classId || submission.class_id)
      .eq('date', submission.date)
      .eq('period_number', submission.periodNumber || submission.period_number || 2)
      .limit(1);

    if (conflicting && conflicting.length > 0) {
      const existing = conflicting[0];
      const teacherId = submission.teacherId || submission.teacher_id;
      if (existing.teacher_id !== teacherId) {
        return new Response(
          JSON.stringify({ error: 'conflict', conflictingTeacherId: existing.teacher_id }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Same teacher: LWW — update if newer
      const existingTime = new Date(existing.updated_at).getTime();
      const incomingTime = new Date(submission.updatedAt || submission.updated_at || new Date()).getTime();
      if (incomingTime <= existingTime) {
        return new Response(JSON.stringify({ status: 'stale', id: existing.id }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Delete old items then upsert
      await supabase.from('attendance_student_items').delete().eq('submission_id', existing.id);
      await supabase.from('attendance_submissions').delete().eq('id', existing.id);
    }

    // Insert submission
    const subRow = {
      id: submission.id,
      school_id: SCHOOL_ID,
      date: submission.date,
      class_id: submission.classId || submission.class_id,
      class_name: submission.className || submission.class_name,
      grade_level: submission.gradeLevel || submission.grade_level,
      teacher_id: submission.teacherId || submission.teacher_id,
      teacher_name: submission.teacherName || submission.teacher_name,
      period_number: submission.periodNumber || submission.period_number || 2,
      submitted_at: submission.submittedAt || submission.submitted_at || new Date().toISOString(),
      updated_at: submission.updatedAt || submission.updated_at || new Date().toISOString(),
      total_students: submission.totalStudents ?? submission.total_students ?? 0,
      present_count: submission.presentCount ?? submission.present_count ?? 0,
      absent_count: submission.absentCount ?? submission.absent_count ?? 0,
      late_count: submission.lateCount ?? submission.late_count ?? 0,
      excused_count: submission.excusedCount ?? submission.excused_count ?? 0,
      notes: submission.notes || null,
      client_device_id: submission.clientDeviceId || submission.client_device_id || null,
      client_op_id: clientOpId || null,
    };

    const { error: subError } = await supabase
      .from('attendance_submissions')
      .insert(subRow);

    if (subError) {
      return new Response(JSON.stringify({ error: subError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert student items
    if (Array.isArray(studentItems) && studentItems.length > 0) {
      const itemRows = studentItems.map((item: Record<string, unknown>) => ({
        submission_id: submission.id,
        student_id: item.studentId || item.student_id,
        student_name: item.studentName || item.student_name,
        status: item.status,
        reason: item.reason || null,
        notes: item.notes || null,
        behavioral_note: item.behavioralNote || item.behavioral_note || null,
        minutes_late: item.minutesLate ?? item.minutes_late ?? null,
        contacted_parent: item.contactedParent ?? item.contacted_parent ?? false,
      }));

      const { error: itemError } = await supabase
        .from('attendance_student_items')
        .insert(itemRows);

      if (itemError) {
        return new Response(JSON.stringify({ error: itemError.message, partial: true }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ status: 'ok', id: submission.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

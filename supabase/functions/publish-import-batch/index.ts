import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SCHOOL_ID = 'zbt-primary';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  subject?: string;
  notes?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const {
      timetableEntries,
      period2Assignments,
      label,
      source,
      importedBy,
    } = body as {
      timetableEntries?: TimetableEntry[];
      period2Assignments: Period2Assignment[];
      label?: string;
      source?: string;
      importedBy?: string;
    };

    if (!period2Assignments || period2Assignments.length === 0) {
      return new Response(JSON.stringify({ error: 'period2Assignments required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Archive previous published version
    const { data: oldVersions } = await supabase
      .from('timetable_versions')
      .select('id')
      .eq('school_id', SCHOOL_ID)
      .eq('status', 'published');

    if (oldVersions && oldVersions.length > 0) {
      await supabase
        .from('timetable_versions')
        .update({ status: 'archived' })
        .in('id', oldVersions.map(v => v.id));
    }

    // Create new published version
    const versionLabel = label || `import-${new Date().toISOString().slice(0, 10)}`;
    const { data: newVersion, error: versionError } = await supabase
      .from('timetable_versions')
      .insert({
        school_id: SCHOOL_ID,
        label: versionLabel,
        status: 'published',
        source: source || 'excel_import',
        imported_by: importedBy || null,
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (versionError || !newVersion) {
      return new Response(JSON.stringify({ error: versionError?.message || 'failed to create version' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const versionId = newVersion.id;

    // Insert timetable entries if provided
    if (timetableEntries && timetableEntries.length > 0) {
      const entryRows = timetableEntries.map(e => ({
        school_id: SCHOOL_ID,
        teacher_id: e.teacherId,
        class_id: e.classId,
        day_of_week: e.dayOfWeek,
        day_arabic: e.dayArabic,
        period_number: e.periodNumber,
        subject: e.subject,
        version_id: versionId,
      }));

      const { error: entryError } = await supabase
        .from('timetable_entries')
        .insert(entryRows);

      if (entryError) {
        return new Response(JSON.stringify({ error: entryError.message, step: 'timetable_entries' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Insert period-2 assignments
    const assignmentRows = period2Assignments.map(a => ({
      id: a.id,
      school_id: SCHOOL_ID,
      class_id: a.classId,
      class_name: a.className,
      day_of_week: a.day,
      day_arabic: a.dayArabic,
      teacher_id: a.teacherId,
      teacher_name: a.teacherName,
      period_number: a.periodNumber || 2,
      subject: a.subject || null,
      notes: a.notes || null,
      version_id: versionId,
    }));

    const { error: assignError } = await supabase
      .from('daily_period_assignments')
      .insert(assignmentRows);

    if (assignError) {
      return new Response(JSON.stringify({ error: assignError.message, step: 'daily_period_assignments' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ status: 'published', versionId, assignmentsCount: assignmentRows.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

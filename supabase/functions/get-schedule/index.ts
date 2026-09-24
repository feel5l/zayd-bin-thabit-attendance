import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// get-schedule
// ---------------------------------------------------------------------------
// Returns ONLY the shared schedule bundle every device needs to agree on:
// period times, classes, the day-by-day period-2 assignments, and a non-PII
// teacher directory (names/subjects/avatars).
//
// It returns NO student data, NO phone numbers, NO national IDs and NO
// attendance records. Those tables stay locked behind RLS and are never read
// here. Everything this endpoint returns is already printed on the school's
// own wall timetable and already ships inside the app's public JavaScript
// bundle today, which is why it is safe to serve without a per-teacher login
// (teacher tablets sign in locally by phone and have no Supabase session).

const SCHOOL_ID = "zbt-primary";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [settings, periods, classes, assignments, teachers, version] = await Promise.all([
      supabase.from("school_settings").select("settings_json, version, updated_at").eq("school_id", SCHOOL_ID).maybeSingle(),
      supabase.from("period_schedules").select("period_number, name, start_time, end_time, is_attendance_period").eq("school_id", SCHOOL_ID).order("period_number"),
      supabase.from("classes").select("id, name, short_name, grade_level, section, homeroom_teacher_id, attendance_period").eq("school_id", SCHOOL_ID).order("id"),
      supabase.from("daily_period_assignments").select("id, class_id, class_name, day_of_week, day_arabic, teacher_id, teacher_name, period_number, subject, notes, updated_at").eq("school_id", SCHOOL_ID),
      supabase.from("teachers").select("id, display_name, subject, assigned_class_id, avatar, role, is_active, sequence_number").eq("school_id", SCHOOL_ID).order("sequence_number"),
      supabase.from("timetable_versions").select("id, label, status, published_at").eq("school_id", SCHOOL_ID).eq("status", "published").order("published_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const firstError = settings.error || periods.error || classes.error || assignments.error || teachers.error || version.error;
    if (firstError) {
      return new Response(JSON.stringify({ error: firstError.message }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const body = {
      schoolId: SCHOOL_ID,
      serverTime: new Date().toISOString(),
      version: version.data ?? null,
      settings: settings.data?.settings_json ?? null,
      settingsVersion: settings.data?.version ?? null,
      periods: periods.data ?? [],
      classes: classes.data ?? [],
      assignments: assignments.data ?? [],
      teachers: teachers.data ?? [],
    };

    return new Response(JSON.stringify(body), {
      headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});

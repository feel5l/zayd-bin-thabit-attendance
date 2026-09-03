import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// get-attendance — admin/teacher pull of attendance sheets for one date.
// Requires x-device-token from admin-login or teacher-login.

const SCHOOL_ID = "zbt-primary";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-token",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const token = req.headers.get("x-device-token") || "";
    if (!token) return json({ error: "missing_device_token" }, 401);

    const url = new URL(req.url);
    let date = url.searchParams.get("date") || "";
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      date = String(body?.date ?? date);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      date = new Date().toISOString().slice(0, 10);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: device, error: deviceError } = await supabase
      .from("device_tokens")
      .select("teacher_id, role, revoked_at")
      .eq("token_hash", await sha256Hex(token))
      .eq("school_id", SCHOOL_ID)
      .maybeSingle();
    if (deviceError) return json({ error: deviceError.message }, 500);
    if (!device || device.revoked_at) return json({ error: "invalid_device_token" }, 401);

    let query = supabase
      .from("attendance_submissions")
      .select("id, date, class_id, class_name, grade_level, teacher_id, teacher_name, period_number, submitted_at, updated_at, total_students, present_count, absent_count, late_count, excused_count, notes")
      .eq("school_id", SCHOOL_ID)
      .eq("date", date);

    if (device.role !== "admin") {
      query = query.eq("teacher_id", device.teacher_id);
    }

    const { data: submissions, error: subError } = await query;
    if (subError) return json({ error: subError.message }, 500);

    const ids = (submissions ?? []).map((s) => s.id);
    let items: unknown[] = [];
    if (ids.length > 0) {
      const { data, error } = await supabase
        .from("attendance_student_items")
        .select("submission_id, student_id, student_name, status, reason, notes, behavioral_note, minutes_late, contacted_parent")
        .in("submission_id", ids);
      if (error) return json({ error: error.message }, 500);
      items = data ?? [];
    }

    await supabase.from("device_tokens")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("token_hash", await sha256Hex(token));

    return json({ date, scope: device.role, submissions: submissions ?? [], items });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

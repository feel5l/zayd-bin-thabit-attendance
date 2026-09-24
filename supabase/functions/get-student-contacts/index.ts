import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// get-student-contacts
// ---------------------------------------------------------------------------
// Serves the sensitive roster fields that used to ship inside the public JS
// bundle (security review S2). Requires x-device-token.
//   admin   → every student: national id, guardian name/phone, home phone,
//             nationality, birth date.
//   teacher → guardian name/phone/home phone only, and only for classes the
//             teacher teaches in Period 2 (any day) or is homeroom for.
// The bundle keeps only id, number, name, class and gender.

const SCHOOL_ID = "zbt-primary";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-token",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  try {
    const token = req.headers.get("x-device-token") || "";
    if (!token) return json({ error: "missing_device_token" }, 401);

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
    if (deviceError) return json({ error: "device_lookup_failed" }, 500);
    if (!device || device.revoked_at) return json({ error: "invalid_device_token" }, 401);

    if (device.role === "admin") {
      const { data, error } = await supabase
        .from("students")
        .select("id, national_id, parent_name, parent_phone, home_phone, nationality, birth_date")
        .eq("school_id", SCHOOL_ID)
        .eq("is_active", true);
      if (error) return json({ error: "query_failed" }, 500);
      return json({ scope: "admin", students: data ?? [] });
    }

    const [assigned, teacher, homeroomClasses] = await Promise.all([
      supabase.from("daily_period_assignments").select("class_id")
        .eq("school_id", SCHOOL_ID).eq("teacher_id", device.teacher_id),
      supabase.from("teachers").select("assigned_class_id").eq("id", device.teacher_id).maybeSingle(),
      supabase.from("classes").select("id").eq("school_id", SCHOOL_ID).eq("homeroom_teacher_id", device.teacher_id),
    ]);
    if (assigned.error || teacher.error || homeroomClasses.error) return json({ error: "query_failed" }, 500);

    const classIds = new Set<string>();
    for (const row of assigned.data ?? []) if (row.class_id) classIds.add(row.class_id);
    for (const row of homeroomClasses.data ?? []) if (row.id) classIds.add(row.id);
    if (teacher.data?.assigned_class_id) classIds.add(teacher.data.assigned_class_id);

    if (classIds.size === 0) return json({ scope: "teacher", classIds: [], students: [] });

    const { data, error } = await supabase
      .from("students")
      .select("id, parent_name, parent_phone, home_phone")
      .eq("school_id", SCHOOL_ID)
      .eq("is_active", true)
      .in("class_id", [...classIds]);
    if (error) return json({ error: "query_failed" }, 500);

    await supabase.from("device_tokens")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("token_hash", await sha256Hex(token));

    return json({ scope: "teacher", classIds: [...classIds], students: data ?? [] });
  } catch {
    return json({ error: "internal_error" }, 500);
  }
});

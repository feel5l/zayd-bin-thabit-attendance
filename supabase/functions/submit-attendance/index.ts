import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// submit-attendance
// Teacher device pushes one class attendance sheet. Requires x-device-token.
// Assignment rules mirror the client:
//   - daily_period_assignments match, OR
//   - teacher.assigned_class_id (homeroom), OR
//   - classes.homeroom_teacher_id when no daily row exists for that class/day

const SCHOOL_ID = "zbt-primary";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const VALID_STATUS = new Set(["present", "absent", "late", "excused"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

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
    if (deviceError) return json({ error: deviceError.message }, 500);
    if (!device || device.revoked_at) {
      return json({ error: "invalid_device_token" }, 401);
    }

    const body = await req.json().catch(() => null);
    const s = body?.submission;
    if (!s || !s.id || !s.classId || !s.date) {
      return json({ error: "invalid_submission" }, 400);
    }

    const periodNumber = Number(s.periodNumber ?? 2);
    const items = Array.isArray(body?.items)
      ? body.items
      : Array.isArray(body?.studentItems)
        ? body.studentItems
        : [];

    if (device.role !== "admin") {
      const dayKey = DAY_KEYS[new Date(`${s.date}T12:00:00+03:00`).getUTCDay()];
      const [assigned, homeroom, classRow] = await Promise.all([
        supabase
          .from("daily_period_assignments")
          .select("teacher_id")
          .eq("school_id", SCHOOL_ID)
          .eq("class_id", s.classId)
          .eq("day_of_week", dayKey)
          .eq("period_number", periodNumber)
          .maybeSingle(),
        supabase
          .from("teachers")
          .select("assigned_class_id")
          .eq("id", device.teacher_id)
          .maybeSingle(),
        supabase
          .from("classes")
          .select("homeroom_teacher_id")
          .eq("id", s.classId)
          .maybeSingle(),
      ]);

      const isAssigned = assigned.data?.teacher_id === device.teacher_id;
      const isHomeroom = homeroom.data?.assigned_class_id === s.classId;
      const isClassHomeroom =
        !assigned.data &&
        classRow.data?.homeroom_teacher_id === device.teacher_id;

      if (!isAssigned && !isHomeroom && !isClassHomeroom) {
        return json({ error: "not_assigned_to_class" }, 403);
      }
    }

    const nowIso = new Date().toISOString();

    // Resolve stable submission id: reuse existing row for (class,date,period) to avoid FK conflicts
    const { data: existingRow } = await supabase
      .from("attendance_submissions")
      .select("id")
      .eq("school_id", SCHOOL_ID)
      .eq("class_id", s.classId)
      .eq("date", s.date)
      .eq("period_number", periodNumber)
      .maybeSingle();
    const submissionId = existingRow?.id ?? s.id;

    if (existingRow?.id) {
      await supabase
        .from("attendance_student_items")
        .delete()
        .eq("submission_id", existingRow.id);
    }

    const { error: upsertError } = await supabase
      .from("attendance_submissions")
      .upsert(
        {
          id: submissionId,
          school_id: SCHOOL_ID,
          date: s.date,
          class_id: s.classId,
          class_name: s.className ?? "",
          grade_level: s.gradeLevel ?? "",
          teacher_id: device.teacher_id,
          teacher_name: s.teacherName ?? "",
          period_number: periodNumber,
          submitted_at: s.submittedAt ?? nowIso,
          updated_at: nowIso,
          total_students: Number(s.totalStudents ?? items.length),
          present_count: Number(s.presentCount ?? 0),
          absent_count: Number(s.absentCount ?? 0),
          late_count: Number(s.lateCount ?? 0),
          excused_count: Number(s.excusedCount ?? 0),
          notes: s.notes ?? null,
          client_device_id: s.clientDeviceId ?? null,
        },
        { onConflict: "school_id,class_id,date,period_number" },
      );
    if (upsertError) return json({ error: upsertError.message }, 500);

    await supabase
      .from("attendance_student_items")
      .delete()
      .eq("submission_id", submissionId);

    const rows = items
      .filter((it: Record<string, unknown>) =>
        it && it.studentId && VALID_STATUS.has(String(it.status))
      )
      .map((it: Record<string, unknown>) => ({
        submission_id: submissionId,
        student_id: it.studentId,
        student_name: it.studentName ?? "",
        status: it.status,
        reason: it.reason ?? null,
        notes: it.notes ?? null,
        behavioral_note: it.behavioralNote ?? null,
        minutes_late: it.minutesLate ?? null,
        contacted_parent: Boolean(it.contactedParent),
      }));

    if (rows.length > 0) {
      const { error: itemsError } = await supabase
        .from("attendance_student_items")
        .insert(rows);
      if (itemsError) return json({ error: itemsError.message }, 500);
    }

    await supabase
      .from("device_tokens")
      .update({ last_seen_at: nowIso })
      .eq("token_hash", await sha256Hex(token));

    return json({ ok: true, submissionId, itemCount: rows.length });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

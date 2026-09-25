import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// admin-manage
// ---------------------------------------------------------------------------
// Server side of every roster / timetable edit made from the admin dashboard.
// Before this existed those edits lived only in the admin's localStorage, so
// a new teacher could not log in, a new student broke attendance sync (FK),
// and Period-2 changes were overwritten by the next get-schedule pull.
//
// Requires x-device-token with role = admin. Actions (POST { action, ... }):
//   teacher.save        { id, name, subject?, phone?, nationalId?, assignedClassId? }
//   teacher.deactivate  { id }
//   student.save        { id, name, studentNumber?, classId, gender?, nationalId,
//                         parentName?, parentPhone?, homePhone?, nationality?, birthDate? }
//   student.transfer    { id, classId }
//   student.remove      { id }            → soft delete (is_active = false); history kept
//   assignment.setMany  { assignments: [{ classId, day, periodNumber?, teacherId }] }
//   class.setHomeroom   { classId, teacherId | null }
//
// Phone numbers and teacher national ids are hashed here with the same
// normalisation as teacher-login; plaintext is never stored or returned.

const SCHOOL_ID = "zbt-primary";
const VALID_DAYS = new Set(["sunday", "monday", "tuesday", "wednesday", "thursday"]);
const ID_RE = /^[A-Za-z0-9_-]{2,64}$/;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}
const bad = (code: string) => new HttpError(400, code);

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Must stay identical to teacher-login / services/teacherAuth.ts.
function normalisePhone(raw: string): string {
  let d = (raw || "").replace(/[^0-9]/g, "");
  if (d.startsWith("00966")) d = "0" + d.slice(5);
  else if (d.startsWith("966")) d = "0" + d.slice(3);
  if (d.length === 9 && d.startsWith("5")) d = "0" + d;
  return d;
}

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const id = (v: unknown, code: string) => {
  const s = str(v, 64);
  if (!ID_RE.test(s)) throw bad(code);
  return s;
};

async function classRow(db: SupabaseClient, classId: string) {
  const { data, error } = await db.from("classes")
    .select("id, name, short_name, grade_level, homeroom_teacher_id").eq("school_id", SCHOOL_ID).eq("id", classId).maybeSingle();
  if (error) throw new HttpError(500, "class_lookup_failed");
  if (!data) throw bad("unknown_class");
  return data;
}

async function teacherRow(db: SupabaseClient, teacherId: string) {
  const { data, error } = await db.from("teachers")
    .select("id, role, display_name, is_active, assigned_class_id").eq("school_id", SCHOOL_ID).eq("id", teacherId).maybeSingle();
  if (error) throw new HttpError(500, "teacher_lookup_failed");
  return data;
}

// ─── Teachers ───────────────────────────────────────────────────────────

async function teacherSave(db: SupabaseClient, b: Record<string, unknown>) {
  const teacherId = id(b.id, "invalid_teacher_id");
  const name = str(b.name, 120);
  if (!name) throw bad("name_required");

  const existing = await teacherRow(db, teacherId);
  if (existing && existing.role === "admin") throw bad("cannot_edit_admin_here");

  const patch: Record<string, unknown> = {
    display_name: name,
    subject: str(b.subject, 80) || null,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  const assignedClassId = str(b.assignedClassId, 64);
  let assignedClass: { homeroom_teacher_id: string | null } | null = null;
  if (assignedClassId) {
    assignedClass = await classRow(db, assignedClassId);
    patch.assigned_class_id = assignedClassId;
  } else {
    patch.assigned_class_id = null;
  }

  const rawPhone = str(b.phone, 32);
  if (rawPhone) {
    const phone = normalisePhone(rawPhone);
    if (!/^05\d{8}$/.test(phone)) throw bad("invalid_phone");
    const phoneHash = await sha256Hex(phone);
    const { data: clash, error } = await db.from("teachers").select("id")
      .eq("school_id", SCHOOL_ID).eq("phone_hash", phoneHash).neq("id", teacherId).neq("role", "admin").eq("is_active", true).limit(1);
    if (error) throw new HttpError(500, "phone_check_failed");
    if (clash && clash.length > 0) throw new HttpError(409, "phone_in_use");
    patch.phone_hash = phoneHash;
  } else if (!existing) {
    throw bad("phone_required");
  }

  const rawNid = str(b.nationalId, 20).replace(/[^0-9]/g, "");
  if (rawNid) {
    if (!/^[12]\d{9}$/.test(rawNid)) throw bad("invalid_national_id");
    const nidHash = await sha256Hex(rawNid);
    const { data: clash, error } = await db.from("teachers").select("id")
      .eq("school_id", SCHOOL_ID).eq("national_id_hash", nidHash).neq("id", teacherId).eq("is_active", true).limit(1);
    if (error) throw new HttpError(500, "nid_check_failed");
    if (clash && clash.length > 0) throw new HttpError(409, "national_id_in_use");
    patch.national_id_hash = nidHash;
  }

  if (existing) {
    const { error } = await db.from("teachers").update(patch).eq("id", teacherId).eq("school_id", SCHOOL_ID);
    if (error) throw new HttpError(500, "teacher_update_failed");
  } else {
    const { error } = await db.from("teachers").insert({
      ...patch,
      id: teacherId,
      school_id: SCHOOL_ID,
      role: "teacher",
      username: `t_${teacherId}`.slice(0, 64),
    });
    if (error) throw new HttpError(500, "teacher_insert_failed");
  }

  // Homeroom mirrors the client: a teacher's assigned class points back at them.
  // Only when the class assignment actually changed (or the class has no
  // homeroom yet) — some classes have two linked teachers, and editing the
  // second one's phone must not silently take the homeroom from the first.
  const classChanged = assignedClassId !== (existing?.assigned_class_id ?? "");
  if (classChanged && existing?.assigned_class_id) {
    await db.from("classes").update({ homeroom_teacher_id: null, updated_at: new Date().toISOString() })
      .eq("school_id", SCHOOL_ID).eq("id", existing.assigned_class_id).eq("homeroom_teacher_id", teacherId);
  }
  if (assignedClassId && (classChanged || !assignedClass?.homeroom_teacher_id)) {
    await db.from("classes").update({ homeroom_teacher_id: teacherId, updated_at: new Date().toISOString() })
      .eq("school_id", SCHOOL_ID).eq("id", assignedClassId);
  }
  return { id: teacherId, created: !existing };
}

async function teacherDeactivate(db: SupabaseClient, b: Record<string, unknown>) {
  const teacherId = id(b.id, "invalid_teacher_id");
  const existing = await teacherRow(db, teacherId);
  if (!existing) throw new HttpError(404, "unknown_teacher");
  if (existing.role === "admin") throw bad("cannot_edit_admin_here");

  const now = new Date().toISOString();
  // Soft delete: attendance history references the teacher row.
  const { error } = await db.from("teachers")
    .update({ is_active: false, assigned_class_id: null, updated_at: now }).eq("id", teacherId);
  if (error) throw new HttpError(500, "teacher_update_failed");
  await db.from("classes").update({ homeroom_teacher_id: null, updated_at: now })
    .eq("school_id", SCHOOL_ID).eq("homeroom_teacher_id", teacherId);
  await db.from("device_tokens").update({ revoked_at: now })
    .eq("teacher_id", teacherId).is("revoked_at", null);
  return { id: teacherId, deactivated: true };
}

// ─── Students ───────────────────────────────────────────────────────────

async function studentSave(db: SupabaseClient, b: Record<string, unknown>) {
  const studentId = id(b.id, "invalid_student_id");
  const name = str(b.name, 160);
  if (!name) throw bad("name_required");
  const cls = await classRow(db, id(b.classId, "invalid_class_id"));

  const nationalId = str(b.nationalId, 20).replace(/[^0-9]/g, "");
  if (!/^[12]\d{9}$/.test(nationalId)) throw bad("invalid_national_id");
  const { data: clash, error: clashError } = await db.from("students").select("id")
    .eq("school_id", SCHOOL_ID).eq("national_id", nationalId).neq("id", studentId).limit(1);
  if (clashError) throw new HttpError(500, "nid_check_failed");
  if (clash && clash.length > 0) throw new HttpError(409, "national_id_in_use");

  const parentPhoneRaw = str(b.parentPhone, 32);
  const parentPhone = parentPhoneRaw ? normalisePhone(parentPhoneRaw) : "";
  if (parentPhone && !/^05\d{8}$/.test(parentPhone)) throw bad("invalid_parent_phone");

  const gender = str(b.gender, 8) === "female" ? "female" : "male";
  const row = {
    id: studentId,
    school_id: SCHOOL_ID,
    class_id: cls.id,
    class_name: cls.short_name,
    grade_level: cls.grade_level,
    national_id: nationalId,
    student_number: str(b.studentNumber, 20) || null,
    name,
    parent_name: str(b.parentName, 160) || null,
    parent_phone: parentPhone || null,
    home_phone: str(b.homePhone, 32) || null,
    nationality: str(b.nationality, 40) || "سعودي",
    birth_date: str(b.birthDate, 20) || null,
    gender,
    is_active: true,
    updated_at: new Date().toISOString(),
  };
  const { data: existing } = await db.from("students").select("id").eq("id", studentId).maybeSingle();
  const { error } = await db.from("students").upsert(row, { onConflict: "id" });
  if (error) throw new HttpError(500, "student_save_failed");
  return { id: studentId, created: !existing };
}

async function studentTransfer(db: SupabaseClient, b: Record<string, unknown>) {
  const studentId = id(b.id, "invalid_student_id");
  const cls = await classRow(db, id(b.classId, "invalid_class_id"));
  const { data, error } = await db.from("students")
    .update({ class_id: cls.id, class_name: cls.short_name, grade_level: cls.grade_level, updated_at: new Date().toISOString() })
    .eq("school_id", SCHOOL_ID).eq("id", studentId).select("id");
  if (error) throw new HttpError(500, "student_transfer_failed");
  if (!data || data.length === 0) throw new HttpError(404, "unknown_student");
  // Past attendance keeps the class it was taken in (attendance_submissions.class_id).
  return { id: studentId, classId: cls.id };
}

async function studentRemove(db: SupabaseClient, b: Record<string, unknown>) {
  const studentId = id(b.id, "invalid_student_id");
  // Soft delete: attendance_student_items references students(id).
  const { data, error } = await db.from("students")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("school_id", SCHOOL_ID).eq("id", studentId).select("id");
  if (error) throw new HttpError(500, "student_remove_failed");
  if (!data || data.length === 0) throw new HttpError(404, "unknown_student");
  return { id: studentId, removed: true };
}

// ─── Timetable / homeroom ───────────────────────────────────────────────

const DAY_AR: Record<string, string> = {
  sunday: "الأحد", monday: "الإثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء", thursday: "الخميس",
};

async function assignmentSetMany(db: SupabaseClient, b: Record<string, unknown>) {
  const list = Array.isArray(b.assignments) ? (b.assignments as Record<string, unknown>[]) : [];
  if (list.length === 0 || list.length > 200) throw bad("assignments_required");

  const { data: version, error: vErr } = await db.from("timetable_versions")
    .select("id").eq("school_id", SCHOOL_ID).eq("status", "published").maybeSingle();
  if (vErr) throw new HttpError(500, "version_lookup_failed");
  if (!version) throw new HttpError(409, "no_published_timetable");

  const [{ data: classes }, { data: teachers }, { data: current }] = await Promise.all([
    db.from("classes").select("id, name").eq("school_id", SCHOOL_ID),
    db.from("teachers").select("id, display_name, subject, role, is_active").eq("school_id", SCHOOL_ID),
    db.from("daily_period_assignments").select("id, class_id, day_of_week, period_number, teacher_id")
      .eq("school_id", SCHOOL_ID).eq("version_id", version.id),
  ]);
  const classById = new Map((classes ?? []).map((c) => [c.id, c]));
  const teacherById = new Map((teachers ?? []).map((t) => [t.id, t]));
  const currentByKey = new Map((current ?? []).map((a) => [`${a.class_id}|${a.day_of_week}|${a.period_number}`, a]));

  const prefix = String(version.id).slice(0, 8);
  const now = new Date().toISOString();
  let changed = 0;
  for (const a of list) {
    const classId = str(a.classId, 64);
    const day = str(a.day, 16);
    const periodNumber = Number(a.periodNumber ?? 2);
    const teacherId = str(a.teacherId, 64);
    const cls = classById.get(classId);
    const teacher = teacherById.get(teacherId);
    if (!cls || !VALID_DAYS.has(day) || !Number.isInteger(periodNumber) || periodNumber < 1 || periodNumber > 8) {
      throw bad("invalid_assignment");
    }
    if (!teacher || teacher.role !== "teacher" || !teacher.is_active) throw bad("invalid_assignment_teacher");

    const key = `${classId}|${day}|${periodNumber}`;
    const existing = currentByKey.get(key);
    if (existing && existing.teacher_id === teacherId) continue;
    const fields = {
      teacher_id: teacherId,
      teacher_name: teacher.display_name,
      subject: teacher.subject ?? null,
      updated_at: now,
    };
    const { error } = existing
      ? await db.from("daily_period_assignments").update(fields).eq("id", existing.id)
      : await db.from("daily_period_assignments").insert({
        ...fields,
        id: `v${prefix}_${classId}_${day}_p${periodNumber}`,
        school_id: SCHOOL_ID,
        version_id: version.id,
        class_id: classId,
        class_name: cls.name,
        day_of_week: day,
        day_arabic: DAY_AR[day],
        period_number: periodNumber,
      });
    if (error) throw new HttpError(500, "assignment_save_failed");
    changed++;
  }
  return { changed };
}

async function classSetHomeroom(db: SupabaseClient, b: Record<string, unknown>) {
  const cls = await classRow(db, id(b.classId, "invalid_class_id"));
  const teacherId = str(b.teacherId, 64);
  const now = new Date().toISOString();
  if (teacherId) {
    const t = await teacherRow(db, teacherId);
    if (!t || t.role !== "teacher" || !t.is_active) throw bad("invalid_homeroom_teacher");
  }
  const { error } = await db.from("classes")
    .update({ homeroom_teacher_id: teacherId || null, updated_at: now }).eq("id", cls.id);
  if (error) throw new HttpError(500, "class_update_failed");
  return { classId: cls.id, teacherId: teacherId || null };
}

const ACTIONS: Record<string, (db: SupabaseClient, b: Record<string, unknown>) => Promise<unknown>> = {
  "teacher.save": teacherSave,
  "teacher.deactivate": teacherDeactivate,
  "student.save": studentSave,
  "student.transfer": studentTransfer,
  "student.remove": studentRemove,
  "assignment.setMany": assignmentSetMany,
  "class.setHomeroom": classSetHomeroom,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const token = req.headers.get("x-device-token") || "";
    if (!token) return json({ error: "missing_device_token" }, 401);

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: device, error: deviceError } = await db.from("device_tokens")
      .select("teacher_id, role, revoked_at, expires_at")
      .eq("token_hash", await sha256Hex(token)).eq("school_id", SCHOOL_ID).maybeSingle();
    if (deviceError) return json({ error: "device_lookup_failed" }, 500);
    if (!device || device.revoked_at || new Date(device.expires_at).getTime() <= Date.now()) {
      return json({ error: "invalid_device_token" }, 401);
    }
    if (device.role !== "admin") return json({ error: "admin_only" }, 403);

    const body = await req.json().catch(() => null);
    const action = str(body?.action, 40);
    const handler = ACTIONS[action];
    if (!handler) return json({ error: "unknown_action" }, 400);

    const result = await handler(db, body as Record<string, unknown>);
    // Ids only — never names, phones or national ids — in function logs.
    console.log("[admin-manage]", action, device.teacher_id, JSON.stringify(result));
    return json({ ok: true, action, result });
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.code }, err.status);
    console.error("[admin-manage]", err instanceof Error ? err.message : err);
    return json({ error: "internal_error" }, 500);
  }
});

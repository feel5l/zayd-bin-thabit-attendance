/**
 * SyncAdapter — cross-device sync layer over AttendanceService.
 *
 * Follows SYNC_DESIGN.md §4.2 strictly:
 *  - AttendanceService remains the source of truth for the UI.
 *  - SyncAdapter writes to localStorage and calls reloadScheduleCaches().
 *  - Without VITE_SUPABASE_URL, every function is a silent no-op.
 *
 * Sync directions per cache (from §4.2):
 *  _cacheUsers           → pull on login (admin only pushes)
 *  _cacheClasses         → pull + Realtime
 *  _cacheStudents        → roster bundled (~356, no PII) + get-student-contacts per role
 *  _cacheSubmissions     → push immediate + pull today
 *  _cacheSettings        → pull + Realtime
 *  _cachePeriodAssignments → pull on timetable_versions publish
 *  _cacheAuditLogs       → push only (append)
 *  _cacheCurrentUser     → local only
 */

import { isSupabaseConfigured, getSupabaseFunctionsUrl, getAnonKey, getSupabaseClient } from './supabaseClient';
import { AttendanceService, SCHEDULE_CHANGE_EVENT, type StudentContactRecord, type ServerTeacherRow, type ServerClassRow, type ServerRosterRow } from './attendanceService';
import { getDeviceToken } from './deviceAuth';
import type { ClassAttendanceSubmission, StudentAttendanceItem, DayPeriodAssignment, SchoolSettings, AttendanceStatus } from '../types';
import { getTodayDateString } from './initialData';

// ─── Status ───

export type SyncStatus = 'disabled' | 'idle' | 'syncing' | 'synced' | 'offline';
export const SYNC_STATUS_EVENT = 'zbt_sync_status_event';

let _status: SyncStatus = isSupabaseConfigured() ? 'idle' : 'disabled';

function setStatus(next: SyncStatus): void {
  if (next === _status) return;
  _status = next;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, { detail: { status: next } }));
  }
}

export function getSyncStatus(): SyncStatus { return _status; }

// ─── Helpers ───

const TIMEOUT_MS = 10_000;

function fetchHeaders(includeDeviceToken = false): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = getAnonKey();
  if (key) {
    h.apikey = key;
    h.Authorization = `Bearer ${key}`;
  }
  if (includeDeviceToken) {
    const token = getDeviceToken();
    if (token) h['x-device-token'] = token;
  }
  return h;
}

async function fetchWithTimeout(url: string, opts: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Offline Queue (IndexedDB) ───

const DB_NAME = 'zbt_offline_queue';
const STORE_NAME = 'queue';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'clientOpId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

interface QueueItem {
  clientOpId: string;
  endpoint: string;
  payload: unknown;
  createdAt: string;
}

async function enqueue(item: QueueItem): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(item);
    await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
    db.close();
  } catch {
    // IndexedDB unavailable; item is lost but localStorage has it
  }
}

async function dequeueAll(): Promise<QueueItem[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const items: QueueItem[] = await new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    db.close();
    return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

async function removeFromQueue(clientOpId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(clientOpId);
    await new Promise<void>((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
    db.close();
  } catch {
    // best effort
  }
}

// ─── Schedule Sync (replaces scheduleSync.ts polling) ───

const VALID_DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];

function toAssignment(row: Record<string, unknown>): DayPeriodAssignment | null {
  if (!row || !row.id || !row.class_id || !row.teacher_id) return null;
  const day = row.day_of_week as string;
  if (!VALID_DAYS.includes(day)) return null;
  return {
    id: row.id as string,
    classId: row.class_id as string,
    className: row.class_name as string,
    day: day as DayPeriodAssignment['day'],
    dayArabic: row.day_arabic as string,
    teacherId: row.teacher_id as string,
    teacherName: row.teacher_name as string,
    periodNumber: (row.period_number as number) ?? 2,
    subject: (row.subject as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
  };
}

export async function pullSchedule(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const baseUrl = getSupabaseFunctionsUrl();
  try {
    setStatus('syncing');
    const res = await fetchWithTimeout(`${baseUrl}/get-schedule`, {
      method: 'GET',
      headers: fetchHeaders(),
    });
    if (!res.ok) { setStatus('offline'); return false; }
    const data = await res.json();
    const assignments = ((data.assignments ?? []) as Record<string, unknown>[])
      .map(toAssignment)
      .filter((a): a is DayPeriodAssignment => a !== null);
    if (assignments.length === 0) { setStatus('offline'); return false; }

    const settingsPatch: Partial<SchoolSettings> = {};
    if (data.settings) {
      const s = data.settings as Record<string, unknown>;
      if (typeof s.period2StartTime === 'string') settingsPatch.period2StartTime = s.period2StartTime;
      if (typeof s.period2EndTime === 'string') settingsPatch.period2EndTime = s.period2EndTime;
    }

    const changed = AttendanceService.applyServerSchedule({ assignments, settingsPatch });
    const directoryChanged = AttendanceService.applyServerDirectory({
      teachers: Array.isArray(data.teachers) ? (data.teachers as ServerTeacherRow[]) : undefined,
      classes: Array.isArray(data.classes) ? (data.classes as ServerClassRow[]) : undefined,
    });
    setStatus('synced');
    return changed || directoryChanged;
  } catch {
    setStatus('offline');
    return false;
  }
}

// ─── Attendance Sync ───

function mapServerSubmission(
  row: Record<string, unknown>,
  itemsBySubmission: Map<string, StudentAttendanceItem[]>
): ClassAttendanceSubmission | null {
  const id = String(row.id ?? '');
  const classId = String(row.class_id ?? row.classId ?? '');
  const date = String(row.date ?? '');
  if (!id || !classId || !date) return null;

  return {
    id,
    date,
    classId,
    className: String(row.class_name ?? row.className ?? ''),
    gradeLevel: String(row.grade_level ?? row.gradeLevel ?? ''),
    teacherId: String(row.teacher_id ?? row.teacherId ?? ''),
    teacherName: String(row.teacher_name ?? row.teacherName ?? ''),
    periodNumber: Number(row.period_number ?? row.periodNumber ?? 2),
    submittedAt: String(row.submitted_at ?? row.submittedAt ?? new Date().toISOString()),
    updatedAt: row.updated_at || row.updatedAt
      ? String(row.updated_at ?? row.updatedAt)
      : undefined,
    totalStudents: Number(row.total_students ?? row.totalStudents ?? 0),
    presentCount: Number(row.present_count ?? row.presentCount ?? 0),
    absentCount: Number(row.absent_count ?? row.absentCount ?? 0),
    lateCount: Number(row.late_count ?? row.lateCount ?? 0),
    excusedCount: Number(row.excused_count ?? row.excusedCount ?? 0),
    notes: row.notes ? String(row.notes) : undefined,
    students: itemsBySubmission.get(id) ?? [],
  };
}

function mapServerStudentItem(row: Record<string, unknown>): StudentAttendanceItem | null {
  const studentId = String(row.student_id ?? row.studentId ?? '');
  const status = String(row.status ?? '') as AttendanceStatus;
  if (!studentId || !['present', 'absent', 'late', 'excused'].includes(status)) return null;
  return {
    studentId,
    studentName: String(row.student_name ?? row.studentName ?? ''),
    status,
    reason: row.reason ? String(row.reason) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    behavioralNote: row.behavioral_note || row.behavioralNote
      ? String(row.behavioral_note ?? row.behavioralNote)
      : undefined,
    minutesLate:
      row.minutes_late != null || row.minutesLate != null
        ? Number(row.minutes_late ?? row.minutesLate)
        : undefined,
    contactedParent: Boolean(row.contacted_parent ?? row.contactedParent ?? false),
  };
}

export async function pushSubmission(
  submission: ClassAttendanceSubmission,
  studentItems: StudentAttendanceItem[]
): Promise<{
  ok: boolean;
  conflict?: boolean;
  needsAuth?: boolean;
  notAssigned?: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured()) return { ok: true }; // local-only mode — treat as synced

  const token = getDeviceToken();
  if (!token) {
    return { ok: false, needsAuth: true, error: 'missing_device_token' };
  }

  const clientOpId = crypto.randomUUID();
  const baseUrl = getSupabaseFunctionsUrl();
  // Deployed submit-attendance expects `items` (not studentItems) + x-device-token.
  const payload = { submission, items: studentItems, clientOpId };

  try {
    const res = await fetchWithTimeout(`${baseUrl}/submit-attendance`, {
      method: 'POST',
      headers: fetchHeaders(true),
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      return { ok: false, needsAuth: true, error: 'unauthorized' };
    }
    if (res.status === 409) {
      return { ok: false, conflict: true, error: 'conflict' };
    }
    if (res.status === 403) {
      // Permanent authorization failure — do NOT enqueue for retry.
      let detail = 'not_assigned_to_class';
      try {
        const body = await res.json();
        if (body?.error) detail = String(body.error);
      } catch { /* ignore */ }
      return { ok: false, notAssigned: true, error: detail };
    }
    if (!res.ok) {
      await enqueue({ clientOpId, endpoint: 'submit-attendance', payload, createdAt: new Date().toISOString() });
      return { ok: false, error: `http_${res.status}` };
    }

    return { ok: true };
  } catch {
    await enqueue({ clientOpId, endpoint: 'submit-attendance', payload, createdAt: new Date().toISOString() });
    return { ok: false, error: 'network' };
  }
}

export async function pullTodaySubmissions(date?: string): Promise<ClassAttendanceSubmission[]> {
  if (!isSupabaseConfigured()) return [];
  const token = getDeviceToken();
  if (!token) return [];

  const baseUrl = getSupabaseFunctionsUrl();
  const day = date || getTodayDateString();
  try {
    const res = await fetchWithTimeout(`${baseUrl}/get-attendance?date=${encodeURIComponent(day)}`, {
      method: 'GET',
      headers: fetchHeaders(true),
    });
    if (!res.ok) return [];
    const data = await res.json();

    const itemsBySubmission = new Map<string, StudentAttendanceItem[]>();
    for (const raw of (data.items ?? []) as Record<string, unknown>[]) {
      const mapped = mapServerStudentItem(raw);
      if (!mapped) continue;
      const submissionId = String(raw.submission_id ?? '');
      if (!submissionId) continue;
      const list = itemsBySubmission.get(submissionId) ?? [];
      list.push(mapped);
      itemsBySubmission.set(submissionId, list);
    }

    const submissions: ClassAttendanceSubmission[] = [];
    for (const row of (data.submissions ?? []) as Record<string, unknown>[]) {
      const mapped = mapServerSubmission(row, itemsBySubmission);
      if (mapped) submissions.push(mapped);
    }
    return submissions;
  } catch {
    return [];
  }
}

// ─── Student contacts (sensitive roster fields, role-scoped on the server) ───

const CONTACTS_REFRESH_MS = 60_000;
let _contactsPulledFor: string | null = null;
let _contactsPulledAt = 0;

function mapContactRecord(raw: Record<string, unknown>): StudentContactRecord | null {
  const id = typeof raw.id === 'string' ? raw.id : '';
  if (!id) return null;
  const pick = (k: string) => (typeof raw[k] === 'string' ? (raw[k] as string) : undefined);
  return {
    id,
    nationalId: pick('national_id'),
    parentName: pick('parent_name'),
    parentPhone: pick('parent_phone'),
    homePhone: pick('home_phone'),
    nationality: pick('nationality'),
    birthDate: pick('birth_date'),
  };
}

/**
 * Fetch guardian contacts / national ids for the signed-in device and merge
 * them into AttendanceService. Runs once per token and every 10 minutes.
 */
export async function pullStudentContacts(force = false): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const token = getDeviceToken();
  if (!token) return 0;
  if (!force && _contactsPulledFor === token && Date.now() - _contactsPulledAt < CONTACTS_REFRESH_MS) return 0;

  try {
    const res = await fetchWithTimeout(`${getSupabaseFunctionsUrl()}/get-student-contacts`, {
      method: 'GET',
      headers: fetchHeaders(true),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    // Roster first (adds / transfers / removals), then sensitive fields on top.
    if (Array.isArray(data?.roster)) AttendanceService.applyServerRoster(data.roster as ServerRosterRow[]);
    const records = ((data?.students ?? []) as Record<string, unknown>[])
      .map(mapContactRecord)
      .filter((r): r is StudentContactRecord => r !== null);
    _contactsPulledFor = token;
    _contactsPulledAt = Date.now();
    return AttendanceService.applyStudentContacts(records);
  } catch {
    return 0;
  }
}

// ─── Admin roster / timetable writes ───

export type AdminManageAction =
  | 'teacher.save'
  | 'teacher.deactivate'
  | 'student.save'
  | 'student.transfer'
  | 'student.remove'
  | 'assignment.setMany'
  | 'class.setHomeroom';

// Flat shape (the project is not strictNullChecks, so union narrowing on `ok` is unreliable).
export interface AdminManageResult {
  ok: boolean;
  localOnly?: boolean;
  error?: string;
  needsAuth?: boolean;
}

/** Arabic message for an admin-manage error code (shown in the admin UI). */
export function adminManageErrorMessage(error: string = 'unknown'): string {
  const map: Record<string, string> = {
    needs_auth: 'انتهت جلسة الإدارة. سجّل الدخول مرة أخرى ثم أعد المحاولة.',
    admin_only: 'هذه العملية متاحة لحساب الإدارة فقط.',
    network: 'تعذّر الاتصال بالخادم. لم يُحفظ التغيير — تأكد من الإنترنت وأعد المحاولة.',
    phone_required: 'رقم جوال المعلم مطلوب ليتمكن من تسجيل الدخول.',
    invalid_phone: 'رقم الجوال غير صحيح. الصيغة المطلوبة: 05xxxxxxxx',
    phone_in_use: 'رقم الجوال مسجّل لمعلم آخر.',
    invalid_national_id: 'رقم الهوية/الإقامة يجب أن يكون 10 أرقام يبدأ بـ 1 أو 2.',
    national_id_in_use: 'رقم الهوية مسجّل لشخص آخر.',
    invalid_parent_phone: 'جوال ولي الأمر غير صحيح. الصيغة المطلوبة: 05xxxxxxxx',
    unknown_class: 'الشعبة غير موجودة على الخادم.',
    unknown_student: 'الطالب غير موجود على الخادم.',
    unknown_teacher: 'المعلم غير موجود على الخادم.',
    cannot_edit_admin_here: 'حسابات الإدارة لا تُعدَّل من هذه الشاشة.',
    invalid_assignment_teacher: 'المعلم المختار غير نشط أو غير موجود على الخادم.',
    no_published_timetable: 'لا يوجد جدول منشور على الخادم.',
    name_required: 'الاسم مطلوب.',
  };
  return map[error] || `تعذّر حفظ التغيير على الخادم (${error}).`;
}

/**
 * Send one admin roster/timetable change to admin-manage. Callers apply the
 * change locally ONLY after ok: true, so the dashboard never shows an edit the
 * other devices will not receive. Without Supabase (offline build) it returns
 * ok + localOnly and the app keeps its local-only behaviour.
 */
export async function adminManage(action: AdminManageAction, payload: Record<string, unknown>): Promise<AdminManageResult> {
  if (!isSupabaseConfigured()) return { ok: true, localOnly: true };
  if (!getDeviceToken()) return { ok: false, error: 'needs_auth', needsAuth: true };
  try {
    const res = await fetchWithTimeout(`${getSupabaseFunctionsUrl()}/admin-manage`, {
      method: 'POST',
      headers: fetchHeaders(true),
      body: JSON.stringify({ ...payload, action }),
    });
    if (res.status === 401) return { ok: false, error: 'needs_auth', needsAuth: true };
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) return { ok: false, error: String(data?.error || `http_${res.status}`) };
    // Refresh this device from the server so it matches what others will see.
    void pullSchedule();
    void pullStudentContacts(true);
    return { ok: true };
  } catch {
    return { ok: false, error: 'network' };
  }
}

/** Pull today's sheets from the server and merge into AttendanceService. */
export async function syncTodayAttendance(date?: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !getDeviceToken()) return false;
  try {
    setStatus('syncing');
    const remote = await pullTodaySubmissions(date);
    const changed = AttendanceService.applyServerSubmissions(remote);
    setStatus('synced');
    return changed;
  } catch {
    setStatus('offline');
    return false;
  }
}

// ─── Flush offline queue ───

export async function flushOfflineQueue(): Promise<number> {
  if (!isSupabaseConfigured() || !getDeviceToken()) return 0;
  const items = await dequeueAll();
  let flushed = 0;
  const baseUrl = getSupabaseFunctionsUrl();

  for (const item of items) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}/${item.endpoint}`, {
        method: 'POST',
        headers: fetchHeaders(true),
        body: JSON.stringify(item.payload),
      });
      if (res.ok || res.status === 409) {
        await removeFromQueue(item.clientOpId);
        flushed++;
      } else {
        break; // stop on first failure to maintain FIFO
      }
    } catch {
      break;
    }
  }
  return flushed;
}

// ─── Publish Timetable ───

export async function publishTimetable(params: {
  period2Assignments: DayPeriodAssignment[];
  label?: string;
  source?: string;
  importedBy?: string;
}): Promise<{ ok: boolean; versionId?: string }> {
  if (!isSupabaseConfigured()) return { ok: false };
  const baseUrl = getSupabaseFunctionsUrl();
  try {
    // Admin-only endpoint: the device token is required (401 without it).
    const res = await fetchWithTimeout(`${baseUrl}/publish-import-batch`, {
      method: 'POST',
      headers: fetchHeaders(true),
      body: JSON.stringify({
        period2Assignments: params.period2Assignments,
        label: params.label,
        source: params.source,
        importedBy: params.importedBy,
      }),
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, versionId: data.versionId };
  } catch {
    return { ok: false };
  }
}

// ─── Realtime subscriptions ───

let _realtimeCleanup: (() => void) | null = null;

function startRealtime(): void {
  const client = getSupabaseClient();
  if (!client) return;

  const channel = client.channel('zbt-sync');

  channel
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'timetable_versions',
      filter: 'status=eq.published',
    }, () => {
      void pullSchedule();
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'school_settings',
    }, () => {
      void pullSchedule();
    })
    .subscribe();

  _realtimeCleanup = () => {
    client.removeChannel(channel);
  };
}

// ─── Lifecycle ───

let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _attendancePollTimer: ReturnType<typeof setInterval> | null = null;
const POLL_INTERVAL_MS = 60_000;
/** Attendance pull interval — keep admin dashboard within ~3–10s of teacher submits */
const ATTENDANCE_POLL_MS = 8_000;

export function startSync(): () => void {
  if (!isSupabaseConfigured() || typeof window === 'undefined') return () => {};

  // Initial pull
  void pullSchedule();
  void syncTodayAttendance();
  void flushOfflineQueue();
  void pullStudentContacts();

  // Polling fallback (Realtime is primary but polling ensures resilience)
  _pollTimer = setInterval(() => { void pullSchedule(); }, POLL_INTERVAL_MS);
  _attendancePollTimer = setInterval(() => {
    void syncTodayAttendance();
    // No-op until a device token exists; picks up a fresh login within one tick.
    void pullStudentContacts();
  }, ATTENDANCE_POLL_MS);

  // Realtime
  startRealtime();

  // Wake/online handlers
  const onWake = () => {
    if (document.visibilityState === 'visible') {
      void pullSchedule();
      void syncTodayAttendance();
      void flushOfflineQueue();
    }
  };
  const onOnline = () => {
    void pullSchedule();
    void syncTodayAttendance();
    void flushOfflineQueue();
  };

  document.addEventListener('visibilitychange', onWake);
  window.addEventListener('online', onOnline);
  window.addEventListener('focus', onWake);

  return () => {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    if (_attendancePollTimer) { clearInterval(_attendancePollTimer); _attendancePollTimer = null; }
    if (_realtimeCleanup) { _realtimeCleanup(); _realtimeCleanup = null; }
    document.removeEventListener('visibilitychange', onWake);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('focus', onWake);
  };
}

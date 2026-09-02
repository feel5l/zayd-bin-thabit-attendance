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
 *  _cacheStudents        → pull full (~364)
 *  _cacheSubmissions     → push immediate + pull today
 *  _cacheSettings        → pull + Realtime
 *  _cachePeriodAssignments → pull on timetable_versions publish
 *  _cacheAuditLogs       → push only (append)
 *  _cacheCurrentUser     → local only
 */

import { isSupabaseConfigured, getSupabaseFunctionsUrl, getAnonKey, getSupabaseClient } from './supabaseClient';
import { AttendanceService, SCHEDULE_CHANGE_EVENT } from './attendanceService';
import type { ClassAttendanceSubmission, StudentAttendanceItem, DayPeriodAssignment, SchoolSettings } from '../types';

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

function fetchHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = getAnonKey();
  if (key) {
    h.apikey = key;
    h.Authorization = `Bearer ${key}`;
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
    setStatus('synced');
    return changed;
  } catch {
    setStatus('offline');
    return false;
  }
}

// ─── Attendance Sync ───

export async function pushSubmission(
  submission: ClassAttendanceSubmission,
  studentItems: StudentAttendanceItem[]
): Promise<{ ok: boolean; conflict?: boolean }> {
  if (!isSupabaseConfigured()) return { ok: false };

  const clientOpId = crypto.randomUUID();
  const baseUrl = getSupabaseFunctionsUrl();
  const payload = { submission, studentItems, clientOpId };

  try {
    const res = await fetchWithTimeout(`${baseUrl}/submit-attendance`, {
      method: 'POST',
      headers: fetchHeaders(),
      body: JSON.stringify(payload),
    });

    if (res.status === 409) {
      return { ok: false, conflict: true };
    }
    if (!res.ok) {
      await enqueue({ clientOpId, endpoint: 'submit-attendance', payload, createdAt: new Date().toISOString() });
      return { ok: false };
    }

    return { ok: true };
  } catch {
    await enqueue({ clientOpId, endpoint: 'submit-attendance', payload, createdAt: new Date().toISOString() });
    return { ok: false };
  }
}

export async function pullTodaySubmissions(): Promise<ClassAttendanceSubmission[]> {
  if (!isSupabaseConfigured()) return [];
  const baseUrl = getSupabaseFunctionsUrl();
  const today = new Date().toISOString().slice(0, 10);
  try {
    const res = await fetchWithTimeout(`${baseUrl}/submit-attendance?date=${today}`, {
      method: 'GET',
      headers: fetchHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.submissions ?? [];
  } catch {
    return [];
  }
}

// ─── Flush offline queue ───

export async function flushOfflineQueue(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const items = await dequeueAll();
  let flushed = 0;
  const baseUrl = getSupabaseFunctionsUrl();

  for (const item of items) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}/${item.endpoint}`, {
        method: 'POST',
        headers: fetchHeaders(),
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
    const res = await fetchWithTimeout(`${baseUrl}/publish-import-batch`, {
      method: 'POST',
      headers: fetchHeaders(),
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
const POLL_INTERVAL_MS = 60_000;

export function startSync(): () => void {
  if (!isSupabaseConfigured() || typeof window === 'undefined') return () => {};

  // Initial pull
  void pullSchedule();
  void flushOfflineQueue();

  // Polling fallback (Realtime is primary but polling ensures resilience)
  _pollTimer = setInterval(() => { void pullSchedule(); }, POLL_INTERVAL_MS);

  // Realtime
  startRealtime();

  // Wake/online handlers
  const onWake = () => {
    if (document.visibilityState === 'visible') {
      void pullSchedule();
      void flushOfflineQueue();
    }
  };
  const onOnline = () => {
    void pullSchedule();
    void flushOfflineQueue();
  };

  document.addEventListener('visibilitychange', onWake);
  window.addEventListener('online', onOnline);
  window.addEventListener('focus', onWake);

  return () => {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    if (_realtimeCleanup) { _realtimeCleanup(); _realtimeCleanup = null; }
    document.removeEventListener('visibilitychange', onWake);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('focus', onWake);
  };
}

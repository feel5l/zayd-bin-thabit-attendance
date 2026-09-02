import { AttendanceService } from './attendanceService';
import { DayPeriodAssignment, SchoolSettings, WeekDayKey } from '../types';

/**
 * Cross-device schedule sync (Phase Sync-2).
 *
 * Pulls the shared schedule — period-2 assignments and the period-2 time
 * window — from the `get-schedule` Edge Function and hands it to
 * AttendanceService, so an edit the admin makes on their machine reaches every
 * teacher's tablet without anyone reinstalling or re-importing anything.
 *
 * Three rules this module never breaks:
 *
 *  1. It is strictly additive. If VITE_SUPABASE_URL is unset, the network is
 *     down, or the server answers with anything unexpected, every function
 *     here becomes a no-op and the app keeps running on local data exactly as
 *     it does today. Sync failing must never stop a teacher recording
 *     attendance.
 *  2. It owns no business logic. Mapping happens here; storage, caches and
 *     change notification stay inside AttendanceService.
 *  3. It never pulls student or attendance data. The endpoint does not serve
 *     it, and this module would not know what to do with it if it did.
 */

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

/** How often to re-check the server while the app is open. */
const POLL_INTERVAL_MS = 60_000;
/** Give up on a single attempt well before it can stall the UI. */
const REQUEST_TIMEOUT_MS = 8_000;

const VALID_DAYS: WeekDayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'];

export type SyncStatus = 'disabled' | 'idle' | 'syncing' | 'synced' | 'offline';

export const SYNC_STATUS_EVENT = 'attendance_schedule_sync_status_event';

let lastStatus: SyncStatus = SUPABASE_URL ? 'idle' : 'disabled';
let lastSyncedAt: Date | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let inFlight = false;

export const isSyncConfigured = (): boolean => Boolean(SUPABASE_URL);
export const getSyncStatus = (): SyncStatus => lastStatus;
export const getLastSyncedAt = (): Date | null => lastSyncedAt;

function setStatus(next: SyncStatus): void {
  if (next === lastStatus) return;
  lastStatus = next;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, { detail: { status: next } }));
  }
}

interface ServerAssignment {
  id: string;
  class_id: string;
  class_name: string;
  day_of_week: string;
  day_arabic: string;
  teacher_id: string;
  teacher_name: string;
  period_number: number;
  subject?: string | null;
  notes?: string | null;
}

interface ServerSchedule {
  assignments?: ServerAssignment[];
  settings?: Record<string, unknown> | null;
}

/** Server row -> app shape. Rows that fail validation are dropped, not guessed at. */
function toAssignment(row: ServerAssignment): DayPeriodAssignment | null {
  if (!row || !row.id || !row.class_id || !row.teacher_id) return null;
  if (!VALID_DAYS.includes(row.day_of_week as WeekDayKey)) return null;
  return {
    id: row.id,
    classId: row.class_id,
    className: row.class_name,
    day: row.day_of_week as WeekDayKey,
    dayArabic: row.day_arabic,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    periodNumber: row.period_number ?? 2,
    subject: row.subject ?? undefined,
    notes: row.notes ?? undefined
  };
}

/** Only the two fields the server is authoritative for; the rest stay local. */
function toSettingsPatch(settings: Record<string, unknown> | null | undefined): Partial<SchoolSettings> {
  if (!settings) return {};
  const patch: Partial<SchoolSettings> = {};
  const isTime = (v: unknown): v is string => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
  if (isTime(settings.period2StartTime)) patch.period2StartTime = settings.period2StartTime;
  if (isTime(settings.period2EndTime)) patch.period2EndTime = settings.period2EndTime;
  return patch;
}

/**
 * Pull once. Resolves to true when local data actually changed.
 * Never throws — a failed sync is reported through status, not exceptions.
 */
export async function syncScheduleNow(): Promise<boolean> {
  if (!SUPABASE_URL || inFlight) return false;

  inFlight = true;
  setStatus('syncing');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (SUPABASE_ANON_KEY) {
      headers.apikey = SUPABASE_ANON_KEY;
      headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-schedule`, {
      method: 'GET',
      headers,
      signal: controller.signal
    });

    if (!response.ok) {
      // A cold-start 401 or a transient 5xx is expected occasionally. Stay on
      // local data and try again on the next tick rather than surfacing noise.
      setStatus('offline');
      return false;
    }

    const data: ServerSchedule = await response.json();

    const assignments = (data.assignments ?? [])
      .map(toAssignment)
      .filter((a): a is DayPeriodAssignment => a !== null);

    // An empty or fully invalid payload means something is wrong server side.
    // Keeping the last known-good local schedule is safer than wiping it.
    if (assignments.length === 0) {
      setStatus('offline');
      return false;
    }

    const changed = AttendanceService.applyServerSchedule({
      assignments,
      settingsPatch: toSettingsPatch(data.settings)
    });

    lastSyncedAt = new Date();
    setStatus('synced');
    return changed;
  } catch (err) {
    setStatus('offline');
    return false;
  } finally {
    clearTimeout(timeout);
    inFlight = false;
  }
}

/**
 * Start syncing: once now, then on a timer, plus whenever the device comes
 * back to the foreground or regains connectivity — the moments a teacher's
 * tablet is most likely to be holding a stale schedule.
 */
export function startScheduleSync(): () => void {
  if (!SUPABASE_URL || typeof window === 'undefined') return () => {};

  void syncScheduleNow();

  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => { void syncScheduleNow(); }, POLL_INTERVAL_MS);

  const onWake = () => {
    if (document.visibilityState === 'visible') void syncScheduleNow();
  };
  const onOnline = () => { void syncScheduleNow(); };

  document.addEventListener('visibilitychange', onWake);
  window.addEventListener('online', onOnline);
  window.addEventListener('focus', onWake);

  return () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    document.removeEventListener('visibilitychange', onWake);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('focus', onWake);
  };
}

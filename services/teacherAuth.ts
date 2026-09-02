import { User } from '../types';

/**
 * Server-side teacher identification.
 *
 * The app used to match the number a teacher typed against a full roster that
 * shipped inside its own JavaScript — which meant 20 teachers' phone numbers
 * and national IDs were downloadable by anyone who opened the site. The
 * matching now happens in the teacher-login Edge Function, which compares
 * hashes and returns only a public profile, so those details no longer leave
 * the database.
 *
 * A teacher who has signed in once on a device is remembered locally (keyed by
 * a hash of their number, never the number itself), so a dropped connection on
 * the morning of the second period does not lock them out of recording
 * attendance.
 */

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const TRUST_KEY = 'zbt_device_known_teachers_v1';
const REQUEST_TIMEOUT_MS = 8_000;

export const isTeacherAuthRemote = (): boolean => Boolean(SUPABASE_URL);

/** Digits only, with 966 / 00966 folded to a leading 0. Mirrors the server. */
export function normaliseSaudiPhone(raw: string): string {
  let d = (raw || '').replace(/[^0-9]/g, '');
  if (d.startsWith('00966')) d = '0' + d.slice(5);
  else if (d.startsWith('966')) d = '0' + d.slice(3);
  if (d.length === 9 && d.startsWith('5')) d = '0' + d;
  return d;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

type TrustStore = Record<string, User>;

function readTrustStore(): TrustStore {
  try {
    const raw = localStorage.getItem(TRUST_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function rememberOnDevice(identifierHash: string, user: User): void {
  try {
    const store = readTrustStore();
    store[identifierHash] = user;
    localStorage.setItem(TRUST_KEY, JSON.stringify(store));
  } catch {
    /* a full or disabled localStorage must not block a successful login */
  }
}

interface ServerTeacher {
  id: string;
  display_name: string;
  subject?: string | null;
  assigned_class_id?: string | null;
  avatar?: string | null;
  role?: string | null;
  username?: string | null;
  sequence_number?: number | null;
}

function toUser(t: ServerTeacher): User {
  return {
    id: t.id,
    username: t.username ?? t.id,
    name: t.display_name,
    role: (t.role === 'admin' ? 'admin' : 'teacher'),
    password: '',
    subject: t.subject ?? undefined,
    assignedClassId: t.assigned_class_id ?? undefined,
    avatar: t.avatar ?? undefined,
    sequenceNumber: t.sequence_number ?? undefined
  };
}

export type TeacherLookupOutcome =
  | { status: 'found'; user: User; source: 'server' | 'device' }
  | { status: 'not_found' }
  | { status: 'ambiguous' }
  | { status: 'unavailable' };

/**
 * Identify a teacher from what they typed (phone number, or national ID).
 * Tries the server first, then falls back to a profile this device has already
 * seen. Never throws.
 */
export async function lookupTeacher(identifier: string): Promise<TeacherLookupOutcome> {
  const raw = (identifier || '').trim();
  if (!raw) return { status: 'not_found' };

  const normalised = normaliseSaudiPhone(raw) || raw;
  let identifierHash = '';
  try {
    identifierHash = await sha256Hex(normalised);
  } catch {
    identifierHash = '';
  }

  if (SUPABASE_URL) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (SUPABASE_ANON_KEY) {
        headers.apikey = SUPABASE_ANON_KEY;
        headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
      }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/teacher-login`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ identifier: raw }),
        signal: controller.signal
      });

      if (res.status === 404) return { status: 'not_found' };
      if (res.status === 409) return { status: 'ambiguous' };

      if (res.ok) {
        const data = await res.json();
        if (data?.found && data.teacher) {
          const user = toUser(data.teacher as ServerTeacher);
          if (identifierHash) rememberOnDevice(identifierHash, user);
          return { status: 'found', user, source: 'server' };
        }
        return { status: 'not_found' };
      }
      // Any other status: fall through to the device cache below.
    } catch {
      // Network failure or timeout: fall through to the device cache below.
    } finally {
      clearTimeout(timer);
    }
  }

  if (identifierHash) {
    const known = readTrustStore()[identifierHash];
    if (known) return { status: 'found', user: known, source: 'device' };
  }

  // Remote configured but unreachable, and this device has not seen this
  // teacher before — the caller should say so rather than deny the number.
  return SUPABASE_URL ? { status: 'unavailable' } : { status: 'not_found' };
}

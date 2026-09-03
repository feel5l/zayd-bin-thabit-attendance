/**
 * Server-side admin login — verifies password and issues a device token
 * required by get-attendance so the admin dashboard can pull teacher submissions.
 */

import { User } from '../types';
import { setDeviceToken } from './deviceAuth';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const REQUEST_TIMEOUT_MS = 8_000;

export type AdminLoginOutcome =
  | { status: 'ok'; user: User; bootstrapped?: boolean; source: 'server' }
  | { status: 'invalid' }
  | { status: 'unavailable' };

function toAdminUser(admin: Record<string, unknown>, fallback?: User): User {
  return {
    id: String(admin.id ?? fallback?.id ?? 'admin'),
    username: String(admin.username ?? fallback?.username ?? 'admin'),
    name: String(admin.display_name ?? fallback?.name ?? 'مدير المدرسة'),
    role: 'admin',
    password: '',
    subject: typeof admin.subject === 'string' ? admin.subject : fallback?.subject,
    avatar: typeof admin.avatar === 'string' ? admin.avatar : fallback?.avatar,
  };
}

/**
 * Authenticate the school admin against the server and store a device token.
 * Returns unavailable when Supabase is not configured or the network fails —
 * callers may fall back to the local VITE_ADMIN_PASSWORD check.
 */
export async function loginAdmin(
  password: string,
  username = 'admin',
  fallbackUser?: User
): Promise<AdminLoginOutcome> {
  if (!SUPABASE_URL || !password) return { status: 'unavailable' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (SUPABASE_ANON_KEY) {
      headers.apikey = SUPABASE_ANON_KEY;
      headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        password,
        username,
        deviceLabel: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : null,
      }),
      signal: controller.signal,
    });

    if (res.status === 401) return { status: 'invalid' };
    if (!res.ok) return { status: 'unavailable' };

    const data = await res.json();
    if (!data?.ok || !data.admin) return { status: 'invalid' };

    const user = toAdminUser(data.admin as Record<string, unknown>, fallbackUser);
    if (typeof data.deviceToken === 'string' && data.deviceToken) {
      setDeviceToken(data.deviceToken, { teacherId: user.id, role: 'admin' });
    }
    return { status: 'ok', user, bootstrapped: Boolean(data.bootstrapped), source: 'server' };
  } catch {
    return { status: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

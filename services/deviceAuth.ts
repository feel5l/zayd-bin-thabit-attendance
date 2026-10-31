/**
 * Device token storage for cross-device attendance sync.
 *
 * teacher-login / admin-login issue a one-time plaintext token; only its hash
 * is stored on the server. The client must keep the plaintext to call
 * submit-attendance and get-attendance (x-device-token header).
 */

import { getSupabaseFunctionsUrl, getAnonKey } from './supabaseClient';

const DEVICE_TOKEN_KEY = 'zbt_device_token_v1';
const DEVICE_TOKEN_META_KEY = 'zbt_device_token_meta_v1';

/**
 * Legacy "known teachers on this device" cache. It only ever allowed a login
 * without a server round-trip, which the product no longer wants: the server is
 * the sole judge of a session. It is never written when the server is
 * configured, and it is wiped on every logout.
 */
export const TEACHER_TRUST_KEY = 'zbt_device_known_teachers_v1';

/** Fired (on window) when the server says our device token is no longer valid. */
export const SESSION_REVOKED_EVENT = 'zbt_session_revoked';

export interface DeviceTokenMeta {
  teacherId: string;
  role: 'teacher' | 'admin';
  issuedAt: string;
}

export function getDeviceToken(): string | null {
  try {
    return localStorage.getItem(DEVICE_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getDeviceTokenMeta(): DeviceTokenMeta | null {
  try {
    const raw = localStorage.getItem(DEVICE_TOKEN_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeviceTokenMeta;
    if (!parsed?.teacherId || !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setDeviceToken(
  token: string,
  meta: { teacherId: string; role: 'teacher' | 'admin' }
): void {
  if (!token) return;
  try {
    localStorage.setItem(DEVICE_TOKEN_KEY, token);
    localStorage.setItem(
      DEVICE_TOKEN_META_KEY,
      JSON.stringify({
        teacherId: meta.teacherId,
        role: meta.role,
        issuedAt: new Date().toISOString(),
      } satisfies DeviceTokenMeta)
    );
  } catch {
    /* localStorage full/disabled — sync will degrade gracefully */
  }
}

export function clearDeviceToken(): void {
  try {
    localStorage.removeItem(DEVICE_TOKEN_KEY);
    localStorage.removeItem(DEVICE_TOKEN_META_KEY);
  } catch {
    /* ignore */
  }
}

export function clearDeviceTrust(): void {
  try {
    localStorage.removeItem(TEACHER_TRUST_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Ask the server to revoke this device token (logout). Fire-and-forget with
 * keepalive so it still completes if the page is closing. If the device is
 * offline the request cannot be sent; the token is still forgotten locally and
 * simply runs out at its normal expiry.
 */
export function revokeDeviceToken(token: string): void {
  const base = getSupabaseFunctionsUrl();
  if (!token || !base || typeof fetch !== 'function') return;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-device-token': token };
  const key = getAnonKey();
  if (key) {
    headers.apikey = key;
    headers.Authorization = `Bearer ${key}`;
  }
  try {
    void fetch(`${base}/logout`, { method: 'POST', headers, body: '{}', keepalive: true }).catch(() => {});
  } catch {
    /* never block or break a logout */
  }
}

/** Tell the app the server rejected our session so it can send the user to the login screen. */
export function notifySessionRevoked(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SESSION_REVOKED_EVENT));
}

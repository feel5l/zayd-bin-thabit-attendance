/**
 * Device token storage for cross-device attendance sync.
 *
 * teacher-login / admin-login issue a one-time plaintext token; only its hash
 * is stored on the server. The client must keep the plaintext to call
 * submit-attendance and get-attendance (x-device-token header).
 */

const DEVICE_TOKEN_KEY = 'zbt_device_token_v1';
const DEVICE_TOKEN_META_KEY = 'zbt_device_token_meta_v1';

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

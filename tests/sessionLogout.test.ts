import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FN = 'https://example.supabase.co/functions/v1';

async function load() {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
  const device = await import('../services/deviceAuth');
  const { AttendanceService } = await import('../services/attendanceService');
  return { device, AttendanceService };
}

describe('logout ends the session on the server', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('revokeDeviceToken POSTs the token to /logout with keepalive', async () => {
    const { device } = await load();
    device.revokeDeviceToken('tok-123');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${FN}/logout`);
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    expect(init.headers['x-device-token']).toBe('tok-123');
  });

  it('logging out revokes the token on the server and wipes every local credential', async () => {
    const { device, AttendanceService } = await load();
    device.setDeviceToken('tok-abc', { teacherId: 't1', role: 'teacher' });
    localStorage.setItem(device.TEACHER_TRUST_KEY, JSON.stringify({ somehash: { id: 't1', name: 'x' } }));

    AttendanceService.setCurrentUser(null);

    const logoutCalls = fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/logout'));
    expect(logoutCalls).toHaveLength(1);
    expect(logoutCalls[0][1].headers['x-device-token']).toBe('tok-abc');
    expect(device.getDeviceToken()).toBeNull();
    expect(device.getDeviceTokenMeta()).toBeNull();
    expect(localStorage.getItem(device.TEACHER_TRUST_KEY)).toBeNull();
  });

  it('does not call the server when there is no token (nothing to revoke)', async () => {
    const { AttendanceService } = await load();
    AttendanceService.setCurrentUser(null);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a failing /logout request never breaks the logout', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const { device, AttendanceService } = await load();
    device.setDeviceToken('tok-off', { teacherId: 't1', role: 'teacher' });
    expect(() => AttendanceService.setCurrentUser(null)).not.toThrow();
    expect(device.getDeviceToken()).toBeNull();
  });
});

describe('the server is the sole judge of a session', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('a 401 invalid_device_token on an authenticated call fires the session-revoked event', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_device_token' }), { status: 401, headers: { 'Content-Type': 'application/json' } }),
    ));
    const { device } = await load();
    const { adminManage } = await import('../services/syncAdapter');
    device.setDeviceToken('revoked-token', { teacherId: 'admin', role: 'admin' });
    const seen = vi.fn();
    window.addEventListener(device.SESSION_REVOKED_EVENT, seen);

    const r = await adminManage('student.save', { id: 's1', name: 'x', classId: 'c1' });
    await new Promise((res) => setTimeout(res, 20)); // the body is read asynchronously

    expect(r.ok).toBe(false);
    expect(seen).toHaveBeenCalledTimes(1);
    window.removeEventListener(device.SESSION_REVOKED_EVENT, seen);
  });

  it('other errors (e.g. a validation 400) do not end the session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_parent_phone' }), { status: 400, headers: { 'Content-Type': 'application/json' } }),
    ));
    const { device } = await load();
    const { adminManage } = await import('../services/syncAdapter');
    device.setDeviceToken('good-token', { teacherId: 'admin', role: 'admin' });
    const seen = vi.fn();
    window.addEventListener(device.SESSION_REVOKED_EVENT, seen);
    await adminManage('student.save', { id: 's1', name: 'x', classId: 'c1' });
    await new Promise((res) => setTimeout(res, 20));
    expect(seen).not.toHaveBeenCalled();
    window.removeEventListener(device.SESSION_REVOKED_EVENT, seen);
  });

  it('a teacher login never leaves a "known on this device" profile behind', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        found: true,
        deviceToken: 'fresh-token',
        teacher: { id: 't1', display_name: 'معلم', role: 'teacher' },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    ));
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    const { lookupTeacher } = await import('../services/teacherAuth');
    const device = await import('../services/deviceAuth');

    const out = await lookupTeacher('0555555555');

    expect(out.status).toBe('found');
    expect(device.getDeviceToken()).toBe('fresh-token');
    expect(localStorage.getItem(device.TEACHER_TRUST_KEY)).toBeNull();
  });
});

describe('server contract', () => {
  const read = (rel: string) => readFileSync(resolve(__dirname, '..', rel), 'utf-8');

  it('the logout function only stamps revoked_at for the hash of the presented token', () => {
    const src = read('supabase/functions/logout/index.ts');
    expect(src).toContain('revoked_at');
    expect(src).toContain('token_hash');
    expect(src).not.toMatch(/\.delete\(/);
  });

  it('every function that authenticates a device rejects a revoked token', () => {
    for (const fn of ['get-attendance', 'submit-attendance', 'admin-manage', 'get-student-contacts', 'publish-import-batch']) {
      expect(read(`supabase/functions/${fn}/index.ts`), fn).toMatch(/device\.revoked_at/);
    }
  });
});

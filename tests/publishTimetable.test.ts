import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setDeviceToken, clearDeviceToken } from '../services/deviceAuth';

describe('publishTimetable', () => {
  beforeEach(() => {
    localStorage.clear();
    clearDeviceToken();
    vi.resetModules();
    vi.doMock('../services/supabaseClient', () => ({
      isSupabaseConfigured: () => true,
      getSupabaseFunctionsUrl: () => 'https://example.test/functions/v1',
      getAnonKey: () => 'anon',
      getSupabaseClient: () => null,
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the admin device token (publish-import-batch is admin-only)', async () => {
    setDeviceToken('admin-token-123', { teacherId: 'user-admin', role: 'admin' });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: 'published', versionId: 'v1' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { publishTimetable } = await import('../services/syncAdapter');
    const result = await publishTimetable({
      period2Assignments: [{
        id: 'assign_class-3-1_sunday', classId: 'class-3-1', className: 'ثالث 1', day: 'sunday',
        dayArabic: 'الأحد', teacherId: 'teacher-1', teacherName: 'معلم', periodNumber: 2,
      }],
    });

    expect(result).toEqual({ ok: true, versionId: 'v1' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://example.test/functions/v1/publish-import-batch');
    expect((init.headers as Record<string, string>)['x-device-token']).toBe('admin-token-123');
  });

  it('reports failure when the server rejects the publish', async () => {
    setDeviceToken('teacher-token', { teacherId: 'teacher-1', role: 'teacher' });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'admin_only' }), { status: 403 })));
    const { publishTimetable } = await import('../services/syncAdapter');
    expect(await publishTimetable({ period2Assignments: [] })).toEqual({ ok: false });
  });
});

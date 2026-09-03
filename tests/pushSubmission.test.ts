import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setDeviceToken, clearDeviceToken, getDeviceToken } from '../services/deviceAuth';

describe('pushSubmission auth failures', () => {
  beforeEach(() => {
    localStorage.clear();
    clearDeviceToken();
    vi.resetModules();
  });

  it('returns needsAuth when device token is missing', async () => {
    vi.doMock('../services/supabaseClient', () => ({
      isSupabaseConfigured: () => true,
      getSupabaseFunctionsUrl: () => 'https://example.test/functions/v1',
      getAnonKey: () => 'anon',
      getSupabaseClient: () => null,
    }));

    const { pushSubmission } = await import('../services/syncAdapter');
    const result = await pushSubmission(
      {
        id: 'sub-1',
        date: '2026-09-03',
        classId: 'class-3-1',
        className: 'ثالث 1',
        gradeLevel: '3',
        teacherId: 'teacher-1',
        teacherName: 'معلم',
        periodNumber: 2,
        submittedAt: new Date().toISOString(),
        totalStudents: 1,
        presentCount: 0,
        absentCount: 1,
        lateCount: 0,
        excusedCount: 0,
        students: [],
      },
      [{ studentId: 's1', studentName: 'طالب', status: 'absent' }]
    );

    expect(result.ok).toBe(false);
    expect(result.needsAuth).toBe(true);
  });

  it('does not enqueue permanent 403 not_assigned failures', async () => {
    setDeviceToken('tok-abc', { teacherId: 'teacher-1', role: 'teacher' });
    expect(getDeviceToken()).toBe('tok-abc');

    const fetchMock = vi.fn().mockResolvedValue({
      status: 403,
      ok: false,
      json: async () => ({ error: 'not_assigned_to_class' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    vi.doMock('../services/supabaseClient', () => ({
      isSupabaseConfigured: () => true,
      getSupabaseFunctionsUrl: () => 'https://example.test/functions/v1',
      getAnonKey: () => 'anon',
      getSupabaseClient: () => null,
    }));

    // Re-import after mocks — syncAdapter already may be cached; use dynamic with reset
    const mod = await import('../services/syncAdapter');
    const result = await mod.pushSubmission(
      {
        id: 'sub-2',
        date: '2026-09-03',
        classId: 'class-3-1',
        className: 'ثالث 1',
        gradeLevel: '3',
        teacherId: 'teacher-1',
        teacherName: 'معلم',
        periodNumber: 2,
        submittedAt: new Date().toISOString(),
        totalStudents: 1,
        presentCount: 0,
        absentCount: 1,
        lateCount: 0,
        excusedCount: 0,
        students: [],
      },
      [{ studentId: 's1', studentName: 'طالب', status: 'absent' }]
    );

    expect(result.ok).toBe(false);
    expect(result.notAssigned).toBe(true);
    expect(result.error).toBe('not_assigned_to_class');

    vi.unstubAllGlobals();
  });
});

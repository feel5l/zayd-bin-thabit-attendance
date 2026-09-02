import { describe, expect, it, beforeEach } from 'vitest';
import { OFFICIAL_TEACHERS_LIST } from '../services/teachersData';
import { extractPeriod2AssignmentsFromTimetable } from '../services/timetableData';

// A minimal localStorage so AttendanceService can boot under vitest's node env.
function installLocalStorage() {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); }
  };
  if (typeof (globalThis as any).window === 'undefined') {
    (globalThis as any).window = globalThis;
  }
  (globalThis as any).window.dispatchEvent = () => true;
  (globalThis as any).window.addEventListener = () => {};
}

describe('teacher id resolution', () => {
  beforeEach(() => {
    installLocalStorage();
  });

  it('leaves an id that already matches its own account untouched', async () => {
    const { AttendanceService } = await import('../services/attendanceService');

    // Regression guard. The legacy timetable numbering (teacher-1..teacher-22)
    // overlaps the real account ids (teacher-5..teacher-25), and the legacy map
    // is not idempotent: teacher-11 -> teacher-10 -> teacher-13. Resolving an
    // id that is ALREADY a correct account id must therefore be a no-op.
    // Before this guard existed, 34 of 42 period-2 assignments silently
    // resolved to a different teacher than the one stored against them.
    const khaled = OFFICIAL_TEACHERS_LIST.find(t => t.id === 'teacher-11')!;
    expect(AttendanceService.resolveTeacherLoginId('teacher-11', khaled.name)).toBe('teacher-11');
    expect(AttendanceService.resolveTeacherLoginId('teacher-11', 'أ. خالد الملا')).toBe('teacher-11');
  });

  it('still maps a legacy timetable id to the right account', async () => {
    const { AttendanceService } = await import('../services/attendanceService');

    // In the legacy space teacher-11 is "محمد الملحم", who is really teacher-10.
    // The name is what tells the two spaces apart.
    expect(AttendanceService.resolveTeacherLoginId('teacher-11', 'أ. محمد الملحم')).toBe('teacher-10');
    expect(AttendanceService.resolveTeacherLoginId('teacher-1', 'أ. أسامة الدوغان')).toBe('teacher-14');
  });

  it('resolves every extracted period-2 assignment to the teacher it names', async () => {
    const { AttendanceService } = await import('../services/attendanceService');
    const users = AttendanceService.getUsers();

    const drifted = extractPeriod2AssignmentsFromTimetable()
      .map(a => ({ a, resolved: AttendanceService.resolveTeacherLoginId(a.teacherId, a.teacherName) }))
      .filter(({ a, resolved }) => resolved !== a.teacherId)
      .map(({ a, resolved }) => {
        const was = users.find(u => u.id === a.teacherId)?.name ?? a.teacherId;
        const now = users.find(u => u.id === resolved)?.name ?? resolved;
        return `${a.classId}/${a.day}: ${was} -> ${now}`;
      });

    expect(drifted).toEqual([]);
  });
});

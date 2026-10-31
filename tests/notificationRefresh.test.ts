import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const stamp = (sec: number) => new Date(Date.UTC(2026, 10, 2, 5, 0, sec)).toISOString();
const sheet = (over: Record<string, unknown> = {}) => ({
  id: 'sub-1', date: '2026-11-02', classId: 'class-3-1', className: 'ثالث 1', gradeLevel: 'الصف الثالث الابتدائي',
  teacherId: 'teacher-18', teacherName: 'أ. معلم', periodNumber: 2, submittedAt: stamp(0), updatedAt: stamp(0),
  totalStudents: 3, presentCount: 1, absentCount: 1, lateCount: 1, excusedCount: 0, notes: '',
  students: [
    { studentId: 'a', studentName: 'طالب أ', status: 'absent', reason: 'سبب' },
    { studentId: 'b', studentName: 'طالب ب', status: 'late', minutesLate: 10 },
    { studentId: 'c', studentName: 'طالب ج', status: 'present' },
  ],
  ...over,
}) as any;

describe('an edited class sheet refreshes its notification', () => {
  let svc: any; let events: number;
  const onEvent = () => { events++; };

  beforeEach(async () => {
    localStorage.clear(); vi.resetModules(); events = 0;
    const mod = await import('../services/attendanceService');
    svc = mod.AttendanceService;
    window.addEventListener(mod.NOTIFICATION_EVENT, onEvent);
  });
  afterEach(async () => {
    const mod = await import('../services/attendanceService');
    window.removeEventListener(mod.NOTIFICATION_EVENT, onEvent);
  });

  it('announces a new sheet once', () => {
    expect(svc.applyServerSubmissions([sheet()])).toBe(true);
    const list = svc.getNotifications();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ submissionId: 'sub-1', absentCount: 1, lateCount: 1, presentCount: 1, read: false });
    expect(list[0].absentStudents.map((s: any) => s.studentName).sort()).toEqual(['طالب أ', 'طالب ب']);
  });

  it('does not re-announce an identical sheet', () => {
    svc.applyServerSubmissions([sheet()]);
    const before = events;
    expect(svc.applyServerSubmissions([sheet()])).toBe(false);
    expect(svc.getNotifications()).toHaveLength(1);
    expect(events).toBe(before);
  });

  it('updates the announcement in place when the teacher corrects the sheet (no stale absentees)', () => {
    svc.applyServerSubmissions([sheet()]);
    const id = svc.getNotifications()[0].id;
    svc.markNotificationAsRead(id);
    expect(svc.getNotifications()[0].read).toBe(true);

    const fixed = sheet({
      updatedAt: stamp(60), presentCount: 3, absentCount: 0, lateCount: 0,
      students: [
        { studentId: 'a', studentName: 'طالب أ', status: 'present' },
        { studentId: 'b', studentName: 'طالب ب', status: 'present' },
        { studentId: 'c', studentName: 'طالب ج', status: 'present' },
      ],
    });
    expect(svc.applyServerSubmissions([fixed])).toBe(true);

    const list = svc.getNotifications();
    expect(list).toHaveLength(1);                       // replaced, not duplicated
    expect(list[0].id).toBe(id);
    expect(list[0]).toMatchObject({ presentCount: 3, absentCount: 0, lateCount: 0, read: false });
    expect(list[0].absentStudents).toEqual([]);         // nobody is still listed as absent
  });

  it('a change that does not alter counts or absentees (e.g. a note) does not touch the notification', () => {
    svc.applyServerSubmissions([sheet()]);
    const before = JSON.stringify(svc.getNotifications());
    svc.applyServerSubmissions([sheet({ updatedAt: stamp(30), notes: 'ملاحظة جديدة' })]);
    expect(JSON.stringify(svc.getNotifications())).toBe(before);
  });
});

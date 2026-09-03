import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AttendanceService, ATTENDANCE_UPDATE_EVENT } from '../services/attendanceService';
import type { ClassAttendanceSubmission } from '../types';

describe('applyServerSubmissions', () => {
  beforeEach(() => {
    localStorage.clear();
    AttendanceService.resetToDefault();
  });

  it('merges new remote submissions and dispatches attendance update', () => {
    const handler = vi.fn();
    window.addEventListener(ATTENDANCE_UPDATE_EVENT, handler);

    const remote: ClassAttendanceSubmission = {
      id: 'sub-remote-1',
      classId: 'class-3-1',
      className: 'ثالث 1',
      gradeLevel: '3',
      date: '2026-09-03',
      periodNumber: 2,
      teacherId: 'teacher-1',
      teacherName: 'معلم اختبار',
      presentCount: 30,
      absentCount: 2,
      excusedCount: 0,
      lateCount: 0,
      totalStudents: 32,
      students: [
        { studentId: 's1', studentName: 'طالب 1', status: 'absent' },
        { studentId: 's2', studentName: 'طالب 2', status: 'absent' },
      ],
      submittedAt: '2026-09-03T05:00:00.000Z',
      updatedAt: '2026-09-03T05:00:00.000Z',
    };

    const changed = AttendanceService.applyServerSubmissions([remote]);
    expect(changed).toBe(true);
    expect(handler).toHaveBeenCalled();

    const found = AttendanceService.getSubmissions('2026-09-03').find((s) => s.id === 'sub-remote-1');
    expect(found).toBeTruthy();
    expect(found?.absentCount).toBe(2);
    expect(found?.students).toHaveLength(2);

    window.removeEventListener(ATTENDANCE_UPDATE_EVENT, handler);
  });

  it('keeps newer local submission when remote is older (LWW)', () => {
    const local: ClassAttendanceSubmission = {
      id: 'sub-local-1',
      classId: 'class-3-1',
      className: 'ثالث 1',
      gradeLevel: '3',
      date: '2026-09-03',
      periodNumber: 2,
      teacherId: 'teacher-1',
      teacherName: 'معلم محلي',
      presentCount: 31,
      absentCount: 1,
      excusedCount: 0,
      lateCount: 0,
      totalStudents: 32,
      students: [],
      submittedAt: '2026-09-03T06:00:00.000Z',
      updatedAt: '2026-09-03T06:00:00.000Z',
    };

    AttendanceService.applyServerSubmissions([local]);

    const olderRemote: ClassAttendanceSubmission = {
      ...local,
      id: 'sub-remote-old',
      absentCount: 5,
      presentCount: 27,
      updatedAt: '2026-09-03T05:00:00.000Z',
      submittedAt: '2026-09-03T05:00:00.000Z',
    };

    const changed = AttendanceService.applyServerSubmissions([olderRemote]);
    expect(changed).toBe(false);

    const found = AttendanceService.getSubmissions('2026-09-03').find(
      (s) => s.classId === 'class-3-1' && s.date === '2026-09-03'
    );
    expect(found?.absentCount).toBe(1);
    expect(found?.id).toBe('sub-local-1');
  });

  it('replaces older local sheet when remote is newer', () => {
    AttendanceService.applyServerSubmissions([
      {
        id: 'sub-old',
        classId: 'class-5-1',
        className: 'خامس 1',
        gradeLevel: '5',
        date: '2026-09-03',
        periodNumber: 2,
        teacherId: 'teacher-2',
        teacherName: 'معلم',
        presentCount: 30,
        absentCount: 0,
        excusedCount: 0,
        lateCount: 0,
        totalStudents: 30,
        students: [],
        submittedAt: '2026-09-03T04:00:00.000Z',
        updatedAt: '2026-09-03T04:00:00.000Z',
      },
    ]);

    const changed = AttendanceService.applyServerSubmissions([
      {
        id: 'sub-new',
        classId: 'class-5-1',
        className: 'خامس 1',
        gradeLevel: '5',
        date: '2026-09-03',
        periodNumber: 2,
        teacherId: 'teacher-2',
        teacherName: 'معلم',
        presentCount: 28,
        absentCount: 2,
        excusedCount: 0,
        lateCount: 0,
        totalStudents: 30,
        students: [{ studentId: 'a', studentName: 'أ', status: 'absent' }],
        submittedAt: '2026-09-03T07:00:00.000Z',
        updatedAt: '2026-09-03T07:00:00.000Z',
      },
    ]);

    expect(changed).toBe(true);
    const found = AttendanceService.getSubmissions('2026-09-03').find((s) => s.classId === 'class-5-1');
    expect(found?.absentCount).toBe(2);
    expect(found?.id).toBe('sub-new');
  });
});

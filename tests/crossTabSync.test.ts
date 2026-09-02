import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AttendanceService,
  ATTENDANCE_UPDATE_EVENT,
  NOTIFICATION_EVENT,
} from '../services/attendanceService';
import type { AttendanceNotification } from '../types';

describe('cross-tab storage sync', () => {
  beforeEach(() => {
    localStorage.clear();
    AttendanceService.resetToDefault();
  });

  it('invalidates submission cache and dispatches attendance update on storage event', () => {
    const attendanceHandler = vi.fn();
    window.addEventListener(ATTENDANCE_UPDATE_EVENT, attendanceHandler);

    AttendanceService.registerStorageSyncListener();

    // Prime cache in this tab
    const before = AttendanceService.getSubmissions();
    expect(Array.isArray(before)).toBe(true);

    const updated = [
      ...before,
      {
        id: 'sub-cross-tab-test',
        classId: 'class-3-1',
        className: 'ثالث 1',
        gradeLevel: '3',
        date: '2026-09-02',
        periodNumber: 2,
        teacherId: 'teacher-1',
        teacherName: 'معلم اختبار',
        presentCount: 30,
        absentCount: 2,
        excusedCount: 0,
        lateCount: 0,
        totalStudents: 32,
        students: [],
        submittedAt: new Date().toISOString(),
      },
    ];

    localStorage.setItem('zbt_submissions_prod_v4', JSON.stringify(updated));
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'zbt_submissions_prod_v4',
        newValue: JSON.stringify(updated),
        storageArea: localStorage,
      })
    );

    expect(attendanceHandler).toHaveBeenCalledTimes(1);
    const after = AttendanceService.getSubmissions();
    expect(after.some((s) => s.id === 'sub-cross-tab-test')).toBe(true);

    window.removeEventListener(ATTENDANCE_UPDATE_EVENT, attendanceHandler);
  });

  it('dispatches notification event with latest notification from another tab', () => {
    const notifHandler = vi.fn();
    window.addEventListener(NOTIFICATION_EVENT, notifHandler);

    AttendanceService.registerStorageSyncListener();

    const notification: AttendanceNotification = {
      id: 'notif-cross-tab',
      submissionId: 'sub-1',
      timestamp: new Date().toISOString(),
      date: '2026-09-02',
      classId: 'class-3-1',
      className: 'ثالث 1',
      gradeLevel: '3',
      teacherId: 'teacher-1',
      teacherName: 'معلم اختبار',
      periodNumber: 2,
      presentCount: 30,
      absentCount: 2,
      excusedCount: 0,
      lateCount: 0,
      totalStudents: 32,
      absentStudents: [],
      read: false,
    };

    localStorage.setItem('zbt_notifications_prod_v4', JSON.stringify([notification]));
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'zbt_notifications_prod_v4',
        newValue: JSON.stringify([notification]),
        storageArea: localStorage,
      })
    );

    expect(notifHandler).toHaveBeenCalledTimes(1);
    const event = notifHandler.mock.calls[0][0] as CustomEvent<AttendanceNotification>;
    expect(event.detail.id).toBe('notif-cross-tab');

    window.removeEventListener(NOTIFICATION_EVENT, notifHandler);
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AttendanceService } from '../services/attendanceService';
import { setDeviceToken, clearDeviceToken } from '../services/deviceAuth';

describe('applyServerRoster', () => {
  beforeEach(() => {
    localStorage.clear();
    AttendanceService.resetToDefault();
  });

  it('adds new, moves transferred and drops removed students; keeps local contact fields', () => {
    const [a, b] = AttendanceService.getStudents();
    AttendanceService.applyStudentContacts([{ id: a.id, parentPhone: '0555555555' }]);

    const changed = AttendanceService.applyServerRoster([
      { id: a.id, name: a.name, class_id: 'class-5-1', class_name: 'خامس 1', grade_level: 'الصف الخامس الابتدائي', student_number: a.studentNumber, gender: 'male' },
      { id: 's_new_1', name: 'طالب جديد', class_id: 'class-3-1', class_name: 'ثالث 1', grade_level: 'الصف الثالث الابتدائي', student_number: '9999', gender: 'male' },
    ]);
    expect(changed).toBe(true);

    const list = AttendanceService.getStudents();
    expect(list).toHaveLength(2);
    expect(list.find((s) => s.id === a.id)).toMatchObject({ classId: 'class-5-1', parentPhone: '0555555555' });
    expect(list.find((s) => s.id === 's_new_1')).toMatchObject({ classId: 'class-3-1', nationalId: '' });
    expect(list.find((s) => s.id === b.id)).toBeUndefined();
  });

  it('ignores an empty roster so a failed pull never wipes the class lists', () => {
    const before = AttendanceService.getStudents().length;
    expect(AttendanceService.applyServerRoster([])).toBe(false);
    expect(AttendanceService.getStudents()).toHaveLength(before);
  });
});

describe('applyServerDirectory', () => {
  beforeEach(() => {
    localStorage.clear();
    AttendanceService.resetToDefault();
  });

  it('adds new teachers, mirrors edits, drops deactivated ones and updates homerooms', () => {
    const teachers = AttendanceService.getUsers().filter((u) => u.role === 'teacher');
    const [t1, t2] = teachers;
    const rows = teachers.map((t) => ({
      id: t.id, display_name: t.name, subject: t.subject ?? null, assigned_class_id: t.assignedClassId ?? null,
      role: 'teacher', is_active: true, sequence_number: t.sequenceNumber ?? null,
    }));
    rows[0] = { ...rows[0], display_name: 'اسم معدّل' };
    rows[1] = { ...rows[1], is_active: false };
    rows.push({ id: 'u_new_teacher', display_name: 'معلم جديد', subject: 'علوم', assigned_class_id: null, role: 'teacher', is_active: true, sequence_number: null });

    const cls = AttendanceService.getClasses()[0];
    const changed = AttendanceService.applyServerDirectory({
      teachers: rows,
      classes: [{ id: cls.id, homeroom_teacher_id: 'u_new_teacher' }],
    });
    expect(changed).toBe(true);

    const users = AttendanceService.getUsers();
    expect(users.find((u) => u.id === t1.id)?.name).toBe('اسم معدّل');
    expect(users.find((u) => u.id === t2.id)).toBeUndefined();
    expect(users.find((u) => u.id === 'u_new_teacher')).toMatchObject({ role: 'teacher', subject: 'علوم' });
    expect(users.some((u) => u.role === 'admin')).toBe(true);
    expect(AttendanceService.getClasses().find((c) => c.id === cls.id)).toMatchObject({ teacherId: 'u_new_teacher', teacherName: 'معلم جديد' });
  });
});

describe('adminManage', () => {
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
  afterEach(() => vi.unstubAllGlobals());

  it('refuses without a device token (needs re-login) and never calls the server', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { adminManage } = await import('../services/syncAdapter');
    expect(await adminManage('student.remove', { id: 's1' })).toMatchObject({ ok: false, needsAuth: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the action with the admin token and reports server errors', async () => {
    setDeviceToken('admin-token', { teacherId: 'user-admin', role: 'admin' });
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).endsWith('/admin-manage')) {
        return new Response(JSON.stringify({ error: 'phone_in_use' }), { status: 409 });
      }
      return new Response('{}', { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { adminManage, adminManageErrorMessage } = await import('../services/syncAdapter');
    const r = await adminManage('teacher.save', { id: 'u1', name: 'x', phone: '0500000000' });
    expect(r).toMatchObject({ ok: false, error: 'phone_in_use' });
    expect(adminManageErrorMessage(r.error)).toContain('مسجّل لمعلم آخر');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://example.test/functions/v1/admin-manage');
    expect((init.headers as Record<string, string>)['x-device-token']).toBe('admin-token');
    expect(JSON.parse(String(init.body))).toMatchObject({ action: 'teacher.save', id: 'u1' });
  });
});

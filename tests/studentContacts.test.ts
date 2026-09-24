import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AttendanceService } from '../services/attendanceService';

const ROOT = join(__dirname, '..');

describe('student PII stays out of the bundle (S2)', () => {
  it('roster files carry no national ids, phones, birth dates or nationality', () => {
    for (const g of [3, 4, 5, 6]) {
      const src = readFileSync(join(ROOT, `services/studentsGrade${g}.ts`), 'utf8');
      expect(src).not.toMatch(/nationalId: '[^']+'/);
      expect(src).not.toMatch(/parentPhone: '[^']+'/);
      expect(src).not.toMatch(/parentName: '[^']+'/);
      expect(src).not.toMatch(/birthDate:/);
      expect(src).not.toMatch(/nationality:/);
      expect(src).not.toMatch(/'0?5\d{8}'/);
    }
  });
});

describe('applyStudentContacts / scrubStudentContacts', () => {
  beforeEach(() => {
    localStorage.clear();
    AttendanceService.resetToDefault();
  });

  it('fills empty fields from the server and scrubs exactly those on logout', () => {
    const [first, second] = AttendanceService.getStudents();
    AttendanceService.saveStudent({ ...second, parentPhone: '0500000001' }); // local admin edit

    const changed = AttendanceService.applyStudentContacts([
      { id: first.id, parentName: 'ولي أمر', parentPhone: '0555555555', nationalId: '1000000001' },
      { id: second.id, parentPhone: '0599999999', parentName: 'ولي أمر ٢' },
      { id: 'unknown-student', parentPhone: '0511111111' },
    ]);
    expect(changed).toBe(2);

    const afterApply = AttendanceService.getStudents();
    expect(afterApply.find((s) => s.id === first.id)).toMatchObject({ parentPhone: '0555555555', nationalId: '1000000001' });
    // Local edit wins over the server value.
    expect(afterApply.find((s) => s.id === second.id)?.parentPhone).toBe('0500000001');

    AttendanceService.scrubStudentContacts();
    const afterScrub = AttendanceService.getStudents();
    expect(afterScrub.find((s) => s.id === first.id)).toMatchObject({ parentPhone: '', nationalId: '', parentName: '' });
    // Only server-filled fields are removed; the local edit survives.
    expect(afterScrub.find((s) => s.id === second.id)?.parentPhone).toBe('0500000001');
    expect(afterScrub.find((s) => s.id === second.id)?.parentName).toBe('');
  });

  it('is idempotent', () => {
    const [first] = AttendanceService.getStudents();
    const rec = [{ id: first.id, parentPhone: '0555555555' }];
    expect(AttendanceService.applyStudentContacts(rec)).toBe(1);
    expect(AttendanceService.applyStudentContacts(rec)).toBe(0);
  });
});

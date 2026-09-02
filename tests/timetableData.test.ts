import { describe, expect, it } from 'vitest';
import {
  LEGACY_TIMETABLE_TEACHER_ID_MAP,
  extractPeriod2AssignmentsFromTimetable,
  isUnmappedTimetableTeacherId,
  mapLegacyTimetableTeacherId
} from '../services/timetableData';
import { OFFICIAL_TEACHERS_LIST } from '../services/teachersData';

describe('timetable legacy teacher mapping', () => {
  it('maps teacher-12, teacher-19, and teacher-21 to unmapped-* ids', () => {
    expect(LEGACY_TIMETABLE_TEACHER_ID_MAP['teacher-12']).toBe('unmapped-محمد-القحطاني');
    expect(LEGACY_TIMETABLE_TEACHER_ID_MAP['teacher-19']).toBe('unmapped-مكمل-لغة');
    expect(LEGACY_TIMETABLE_TEACHER_ID_MAP['teacher-21']).toBe('unmapped-عبدالمحسن-الدوسري');
  });

  it('does not assign unmapped legacy teachers to real login accounts', () => {
    const realTeacherIds = new Set(OFFICIAL_TEACHERS_LIST.map(t => t.id));
    ['teacher-12', 'teacher-19', 'teacher-21'].forEach(legacyId => {
      const mapped = mapLegacyTimetableTeacherId(legacyId);
      expect(isUnmappedTimetableTeacherId(mapped)).toBe(true);
      expect(realTeacherIds.has(mapped)).toBe(false);
      expect(mapped).not.toBe(legacyId);
    });
  });

  it('skips unmapped teachers when extracting period 2 assignments', () => {
    const assignments = extractPeriod2AssignmentsFromTimetable();
    expect(assignments.length).toBeGreaterThan(0);
    assignments.forEach(assignment => {
      expect(isUnmappedTimetableTeacherId(assignment.teacherId)).toBe(false);
      expect(OFFICIAL_TEACHERS_LIST.some(t => t.id === assignment.teacherId)).toBe(true);
    });
  });
});

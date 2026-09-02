import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OFFICIAL_CLASSES_LIST } from '../services/officialClassesData';
import { OFFICIAL_STUDENTS_LIST, TOTAL_OFFICIAL_STUDENTS_COUNT } from '../services/officialStudentsData';
import { OFFICIAL_TEACHERS_LIST } from '../services/teachersData';

const ROOT = process.cwd();

describe('official school data integrity', () => {
  it('keeps the official student roster baseline in sync', () => {
    expect(OFFICIAL_STUDENTS_LIST).toHaveLength(TOTAL_OFFICIAL_STUDENTS_COUNT);
    expect(OFFICIAL_STUDENTS_LIST.length).toBeGreaterThan(0);
  });

  it('assigns a homeroom teacher to every official class', () => {
    const teacherIds = new Set(OFFICIAL_TEACHERS_LIST.map(t => t.id));

    expect(OFFICIAL_CLASSES_LIST).toHaveLength(11);
    OFFICIAL_CLASSES_LIST.forEach(cls => {
      expect(cls.teacherId).toBeTruthy();
      expect(cls.teacherName).toBeTruthy();
      expect(cls.teacherName).not.toBe('غير محدد');
      expect(teacherIds.has(cls.teacherId)).toBe(true);
    });
  });

  it('does not fall back to teachers[0] in attendanceService period assignment seeding', () => {
    const content = readFileSync(join(ROOT, 'services/attendanceService.ts'), 'utf8');
    expect(content).not.toMatch(/teachers\.find\(t => t\.id === cls\.teacherId\) \|\| teachers\[0\]/);
  });
});

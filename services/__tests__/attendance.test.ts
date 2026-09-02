import { describe, it, expect } from 'vitest';
import { extractPeriod2AssignmentsFromTimetable } from '../timetableData';
import { OFFICIAL_TEACHERS_LIST } from '../teachersData';

describe('period 2 assignment extraction', () => {
  const assignments = extractPeriod2AssignmentsFromTimetable();
  const accountIds = new Set(OFFICIAL_TEACHERS_LIST.map(t => t.id));

  it('produces at least one assignment per weekday', () => {
    for (const day of ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday']) {
      expect(assignments.some(a => a.day === day)).toBe(true);
    }
  });

  it('only ever assigns teachers that have a real account', () => {
    const bad = assignments.filter(a => !accountIds.has(a.teacherId));
    expect(bad.map(b => `${b.teacherId} @ ${b.classId}/${b.day}`)).toEqual([]);
  });

  it('never assigns two teachers to the same class on the same day', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const a of assignments) {
      const key = `${a.day}::${a.classId}`;
      if (seen.has(key)) dupes.push(key);
      seen.add(key);
    }
    expect(dupes).toEqual([]);
  });
});

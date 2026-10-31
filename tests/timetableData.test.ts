import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  OFFICIAL_TIMETABLE_RECORDS,
  LEGACY_TIMETABLE_TEACHER_ID_MAP,
  extractPeriod2AssignmentsFromTimetable,
  isUnmappedTimetableTeacherId,
  mapLegacyTimetableTeacherId
} from '../services/timetableData';
import { OFFICIAL_TEACHERS_LIST } from '../services/teachersData';

describe('timetable legacy teacher mapping', () => {
  it('maps legacy teacher-12 (محمد القحطاني) to the renamed account teacher-7, and keeps teacher-19 / teacher-21 unmapped', () => {
    // Migration 0014 renamed teacher-7 to «محمد فهد عائض القحطاني» and approved his period-2 slots.
    expect(LEGACY_TIMETABLE_TEACHER_ID_MAP['teacher-12']).toBe('teacher-7');
    expect(LEGACY_TIMETABLE_TEACHER_ID_MAP['teacher-19']).toBe('unmapped-مكمل-لغة');
    expect(LEGACY_TIMETABLE_TEACHER_ID_MAP['teacher-21']).toBe('unmapped-عبدالمحسن-الدوسري');
  });

  it('does not assign unmapped legacy teachers to real login accounts', () => {
    const realTeacherIds = new Set(OFFICIAL_TEACHERS_LIST.map(t => t.id));
    ['teacher-19', 'teacher-21'].forEach(legacyId => {
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

describe('period 2 in the static timetable matches the approved 1448 grid', () => {
  // The approved grid is the school's «Numbers file» of 2026-09-28, stored in migration 0014 and
  // live in daily_period_assignments. The static timetable behind the teacher/class views and the
  // «تثبيت من الجدول المعتمد» / «إعادة ضبط» buttons must say the same thing, otherwise one click
  // overwrites the approved assignments on the server with an older term's timetable.
  const sql = readFileSync(resolve(__dirname, '..', 'supabase/migrations/0014_timetable_1448_period2.sql'), 'utf-8');
  const block = sql.match(/src\(class_id,day_of_week,day_arabic,teacher_id,subject\) as \(values (.*?)\)\s*insert into/s)![1];
  const approved = [...block.matchAll(/\('(class-\d-\d)','(\w+)','[^']+','(teacher-\d+)','([^']+)'\)/g)]
    .map(m => `${m[1]}|${m[2]}|${m[3]}|${m[4]}`).sort();

  it('parses the approved grid (11 classes x 5 days)', () => {
    expect(approved).toHaveLength(55);
  });

  it('extractPeriod2AssignmentsFromTimetable() returns exactly the approved grid', () => {
    const got = extractPeriod2AssignmentsFromTimetable().map(a => `${a.classId}|${a.day}|${a.teacherId}|${a.subject}`).sort();
    expect(got).toEqual(approved);
  });

  it('every period-2 cell in the timetable records belongs to an approved slot', () => {
    const cells = OFFICIAL_TIMETABLE_RECORDS.flatMap(r =>
      r.entries.filter(e => e.periodNumber === 2).map(e => `${e.classId}|${e.day}|${mapLegacyTimetableTeacherId(r.teacherId)}|${e.subject}`));
    expect(cells.sort()).toEqual(approved);
  });

  it('no teacher is booked twice in the same day and period', () => {
    OFFICIAL_TIMETABLE_RECORDS.forEach(r => {
      const seen = new Set<string>();
      r.entries.forEach(e => {
        const k = `${e.day}|${e.periodNumber}`;
        expect(seen.has(k), `${r.teacherName} double-booked at ${k}`).toBe(false);
        seen.add(k);
      });
    });
  });
});

describe('admin-manage keeps assignments consistent', () => {
  const src = readFileSync(resolve(__dirname, '..', 'supabase/functions/admin-manage/index.ts'), 'utf-8');

  it('writes the short class name (same form as students, submissions and timetable cells)', () => {
    expect(src).toMatch(/class_name:\s*cls\.short_name \?\? cls\.name/);
    expect(src).toMatch(/from\("classes"\)\.select\("id, name, short_name"\)/);
  });

  it('drops the «approved timetable» note when an assignment is changed by hand', () => {
    const fields = src.slice(src.indexOf('const fields = {'), src.indexOf('const { error } = existing'));
    expect(fields).toContain('notes: null');
  });
});


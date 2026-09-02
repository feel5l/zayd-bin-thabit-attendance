/**
 * Data integrity checker for the school attendance system.
 * Run with: npm run verify:data
 * Exits with code 1 if any check fails.
 */
import { OFFICIAL_TEACHERS_LIST } from '../services/teachersData';
import { OFFICIAL_TIMETABLE_RECORDS } from '../services/timetableData';
import { OFFICIAL_CLASSES_LIST } from '../services/officialClassesData';

const errors: string[] = [];
const warnings: string[] = [];

const accountIds = new Set(OFFICIAL_TEACHERS_LIST.map(t => t.id));
const classIds = new Set(OFFICIAL_CLASSES_LIST.map(c => c.id));

// CHECK 1: every teacherId used by the timetable must be a real account
for (const record of OFFICIAL_TIMETABLE_RECORDS) {
  if (record.teacherId.startsWith('unmapped-')) {
    warnings.push(`UNMAPPED timetable teacher: ${record.teacherId} (${record.teacherName}) — pending owner decision`);
    continue;
  }
  if (!accountIds.has(record.teacherId)) {
    errors.push(`Timetable teacherId "${record.teacherId}" (${record.teacherName}) has no matching account in OFFICIAL_TEACHERS_LIST`);
  }
}

// CHECK 2: every classId used by the timetable must be a real class
for (const record of OFFICIAL_TIMETABLE_RECORDS) {
  for (const entry of record.entries) {
    if (!classIds.has(entry.classId)) {
      errors.push(`Timetable entry references unknown class "${entry.classId}" (teacher ${record.teacherId}, ${entry.day} p${entry.periodNumber})`);
    }
  }
}

// CHECK 3: no two teachers may hold period 2 for the same class on the same day
const period2Slots = new Map<string, string[]>();
for (const record of OFFICIAL_TIMETABLE_RECORDS) {
  for (const entry of record.entries) {
    if (entry.periodNumber !== 2) continue;
    const key = `${entry.day}::${entry.classId}`;
    const list = period2Slots.get(key) || [];
    list.push(`${record.teacherId} (${record.teacherName})`);
    period2Slots.set(key, list);
  }
}
for (const [key, holders] of period2Slots) {
  if (holders.length > 1) {
    errors.push(`Period-2 conflict on ${key}: ${holders.join(' | ')}`);
  }
}

// CHECK 4: every class must have exactly one homeroom teacher
for (const cls of OFFICIAL_CLASSES_LIST) {
  if (!cls.teacherId) {
    errors.push(`Class "${cls.id}" has an empty teacherId`);
  } else if (!accountIds.has(cls.teacherId)) {
    errors.push(`Class "${cls.id}" points at unknown teacher "${cls.teacherId}"`);
  }
}

// CHECK 5: no two teacher accounts may claim the same homeroom class
const homerooms = new Map<string, string[]>();
for (const t of OFFICIAL_TEACHERS_LIST) {
  if (!t.assignedClassId) continue;
  const list = homerooms.get(t.assignedClassId) || [];
  list.push(`${t.id} (${t.name})`);
  homerooms.set(t.assignedClassId, list);
}
for (const [classId, holders] of homerooms) {
  if (holders.length > 1) {
    errors.push(`Homeroom conflict on ${classId}: ${holders.join(' | ')}`);
  }
}

// CHECK 6: accounts with no timetable at all
const timetableIds = new Set(OFFICIAL_TIMETABLE_RECORDS.map(r => r.teacherId));
for (const t of OFFICIAL_TEACHERS_LIST) {
  if (!timetableIds.has(t.id)) {
    warnings.push(`Account ${t.id} (${t.name}) has no timetable record`);
  }
}

for (const w of warnings) console.warn('WARN  ' + w);
for (const e of errors) console.error('ERROR ' + e);
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length > 0 ? 1 : 0);

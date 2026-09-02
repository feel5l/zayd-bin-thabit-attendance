import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { OFFICIAL_CLASSES_LIST } from '../services/officialClassesData';
import { OFFICIAL_STUDENTS_LIST, TOTAL_OFFICIAL_STUDENTS_COUNT } from '../services/officialStudentsData';
import { OFFICIAL_TEACHERS_LIST } from '../services/teachersData';
import {
  LEGACY_TIMETABLE_TEACHER_ID_MAP,
  extractPeriod2AssignmentsFromTimetable,
  mapLegacyTimetableTeacherId,
  isUnmappedTimetableTeacherId
} from '../services/timetableData';

const ROOT = process.cwd();
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.md', '.json']);

interface VerifyIssue {
  level: 'error' | 'warn';
  message: string;
}

const issues: VerifyIssue[] = [];

function addIssue(level: VerifyIssue['level'], message: string): void {
  issues.push({ level, message });
}

function walkSourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walkSourceFiles(fullPath, files);
      continue;
    }
    const ext = entry.slice(entry.lastIndexOf('.'));
    if (SOURCE_EXTENSIONS.has(ext)) {
      files.push(fullPath);
    }
  }
  return files;
}

function verifyNoHardcodedPasswords(): void {
  const forbidden = [['Aa', '12345'].join(''), 'admin' + '123'];
  const files = walkSourceFiles(ROOT).filter(path =>
    !path.includes('scripts/verifyData.ts') &&
    !path.includes('/tests/')
  );

  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf8');
    for (const token of forbidden) {
      if (content.includes(token)) {
        addIssue('error', `Hardcoded credential "${token}" found in ${relative(ROOT, filePath)}`);
      }
    }
  }
}

function verifyNoPhoneEndsWith(): void {
  const loginModalPath = join(ROOT, 'components/LoginModal.tsx');
  const content = readFileSync(loginModalPath, 'utf8');
  if (content.includes('.endsWith(')) {
    addIssue('error', 'LoginModal.tsx still uses endsWith for phone matching');
  }
}

function verifyStudentCount(): void {
  if (OFFICIAL_STUDENTS_LIST.length !== TOTAL_OFFICIAL_STUDENTS_COUNT) {
    addIssue(
      'error',
      `Student count mismatch: list=${OFFICIAL_STUDENTS_LIST.length}, constant=${TOTAL_OFFICIAL_STUDENTS_COUNT}`
    );
  }
  if (OFFICIAL_STUDENTS_LIST.length === 0) {
    addIssue('error', 'OFFICIAL_STUDENTS_LIST is empty');
  }
}

function verifyHomeroomTeachers(): void {
  const teacherIds = new Set(OFFICIAL_TEACHERS_LIST.map(t => t.id));

  OFFICIAL_CLASSES_LIST.forEach(cls => {
    if (!cls.teacherId) {
      addIssue('error', `Class ${cls.id} is missing homeroom teacherId`);
      return;
    }
    if (!cls.teacherName || cls.teacherName === 'غير محدد') {
      addIssue('error', `Class ${cls.id} is missing homeroom teacherName`);
    }
    if (!teacherIds.has(cls.teacherId)) {
      addIssue('error', `Class ${cls.id} homeroom teacherId "${cls.teacherId}" not found in OFFICIAL_TEACHERS_LIST`);
    }
  });
}

function verifyLegacyTeacherMap(): void {
  const requiredUnmapped = {
    'teacher-12': 'unmapped-محمد-القحطاني',
    'teacher-19': 'unmapped-مكمل-لغة',
    'teacher-21': 'unmapped-عبدالمحسن-الدوسري'
  };

  for (const [legacyId, expected] of Object.entries(requiredUnmapped)) {
    if (LEGACY_TIMETABLE_TEACHER_ID_MAP[legacyId] !== expected) {
      addIssue(
        'error',
        `LEGACY_TIMETABLE_TEACHER_ID_MAP["${legacyId}"] must be "${expected}"`
      );
    }
  }

  const teacherIds = new Set(OFFICIAL_TEACHERS_LIST.map(t => t.id));
  for (const [legacyId, mappedId] of Object.entries(LEGACY_TIMETABLE_TEACHER_ID_MAP)) {
    if (isUnmappedTimetableTeacherId(mappedId)) continue;
    if (!teacherIds.has(mappedId)) {
      addIssue('error', `Mapped teacher id "${mappedId}" for legacy "${legacyId}" not found in OFFICIAL_TEACHERS_LIST`);
    }
  }
}

function verifyPeriod2Assignments(): void {
  const teacherIds = new Set(OFFICIAL_TEACHERS_LIST.map(t => t.id));
  const assignments = extractPeriod2AssignmentsFromTimetable();

  assignments.forEach(assignment => {
    if (isUnmappedTimetableTeacherId(assignment.teacherId)) {
      addIssue('error', `Period 2 assignment contains unmapped teacher id "${assignment.teacherId}"`);
      return;
    }
    if (!teacherIds.has(assignment.teacherId)) {
      addIssue(
        'error',
        `Period 2 assignment for ${assignment.classId}/${assignment.day} references unknown teacher "${assignment.teacherId}"`
      );
    }
  });

  const unmappedLegacyIds = ['teacher-12', 'teacher-19', 'teacher-21'];
  unmappedLegacyIds.forEach(legacyId => {
    const mapped = mapLegacyTimetableTeacherId(legacyId);
    if (!isUnmappedTimetableTeacherId(mapped)) {
      addIssue('error', `Legacy teacher "${legacyId}" should map to an unmapped-* id`);
    }
  });
}

function main(): void {
  verifyNoHardcodedPasswords();
  verifyNoPhoneEndsWith();
  verifyStudentCount();
  verifyHomeroomTeachers();
  verifyLegacyTeacherMap();
  verifyPeriod2Assignments();

  const errors = issues.filter(i => i.level === 'error');
  const warnings = issues.filter(i => i.level === 'warn');

  warnings.forEach(issue => console.warn(`WARN: ${issue.message}`));
  errors.forEach(issue => console.error(`ERROR: ${issue.message}`));

  console.log(`\nverify:data complete — ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(errors.length > 0 ? 1 : 0);
}

main();

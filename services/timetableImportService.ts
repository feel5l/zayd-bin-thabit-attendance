import * as XLSX from 'xlsx';
import { DayPeriodAssignment, SchoolClass, User, WeekDayKey } from '../types';

export interface TimetableImportRow {
  teacherName: string;
  dayArabic: string;
  periodNumber: number;
  className: string;
  subject: string;
}

export interface TimetableImportMeta {
  schoolName?: string;
  tableName?: string;
  teacherCount: number;
  classroomCount: number;
  maxPeriods: number;
  perDayPeriods: Record<string, number>;
}

export interface TimetableImportResult {
  rows: TimetableImportRow[];
  period2Assignments: DayPeriodAssignment[];
  meta: TimetableImportMeta;
  unmatchedTeachers: string[];
  unmatchedClasses: string[];
  warnings: string[];
}

const DAY_KEY_MAP: Record<string, WeekDayKey> = {
  'الأحد': 'sunday',
  'الاحد': 'sunday',
  'الإثنين': 'monday',
  'الاثنين': 'monday',
  'الثلاثاء': 'tuesday',
  'الأربعاء': 'wednesday',
  'الاربعاء': 'wednesday',
  'الخميس': 'thursday'
};

const DAY_LABELS: Record<WeekDayKey, string> = {
  sunday: 'الأحد',
  monday: 'الإثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس'
};

const SECTION_MAP: Record<string, string> = {
  'أ': '1',
  'ب': '2',
  'ج': '3',
  '1': '1',
  '2': '2',
  '3': '3'
};

const GRADE_MAP: Record<string, string> = {
  'ثالث': '3',
  'رابع': '4',
  'خامس': '5',
  'سادس': '6'
};

const TEACHER_COLUMN_ALIASES = ['اسم المعلم', 'المعلم', 'teacher_name', 'teacher'];
const DAY_COLUMN_ALIASES = ['اليوم', 'day', 'dayArabic'];
const PERIOD_COLUMN_ALIASES = ['رقم الحصة', 'الحصة', 'period', 'periodNumber'];
const CLASS_COLUMN_ALIASES = ['الفصل', 'class', 'className', 'classroom_name'];
const SUBJECT_COLUMN_ALIASES = ['المادة', 'subject', 'name'];

function normalizeArabicText(value: string): string {
  return value
    .replace(/^أ\.\s*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/أ/g, 'ا')
    .replace(/إ/g, 'ا')
    .replace(/آ/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim()
    .toLowerCase();
}

function findColumnKey(row: Record<string, unknown>, aliases: string[]): string | null {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const normalizedAlias = normalizeArabicText(alias);
    const match = keys.find(key => normalizeArabicText(String(key)) === normalizedAlias);
    if (match) return match;
  }
  return null;
}

export function excelClassNameToClassId(className: string): string | null {
  const trimmed = className.trim();
  const match = trimmed.match(/(ثالث|رابع|خامس|سادس)\s*([أبج123])/);
  if (!match) return null;
  const grade = GRADE_MAP[match[1]];
  const section = SECTION_MAP[match[2]];
  if (!grade || !section) return null;
  return `class-${grade}-${section}`;
}

export function resolveTeacherFromExcelName(
  excelName: string,
  teachers: User[],
  teacherPhones?: Map<string, string>
): User | null {
  const normalizedExcel = normalizeArabicText(excelName);
  const byPhone = teacherPhones?.get(excelName);
  if (byPhone) {
    const phoneMatch = teachers.find(t => t.phone === byPhone);
    if (phoneMatch) return phoneMatch;
  }

  const direct = teachers.find(t => {
    const normalizedOfficial = normalizeArabicText(t.name);
    return (
      normalizedOfficial.includes(normalizedExcel) ||
      normalizedExcel.includes(normalizedOfficial) ||
      normalizedOfficial.split(' ').slice(-2).join(' ') === normalizedExcel ||
      normalizedExcel.split(' ').slice(-2).join(' ') === normalizedOfficial.split(' ').slice(-2).join(' ')
    );
  });
  return direct ?? null;
}

function parseFlatWorkbook(workbook: XLSX.WorkBook): TimetableImportRow[] {
  const sheetName = workbook.SheetNames.find(name => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    if (rows.length === 0) return false;
    const first = rows[0];
    return (
      findColumnKey(first, TEACHER_COLUMN_ALIASES) !== null &&
      findColumnKey(first, DAY_COLUMN_ALIASES) !== null &&
      findColumnKey(first, PERIOD_COLUMN_ALIASES) !== null
    );
  });

  if (!sheetName) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: '' });
  if (rows.length === 0) return [];

  const teacherKey = findColumnKey(rows[0], TEACHER_COLUMN_ALIASES)!;
  const dayKey = findColumnKey(rows[0], DAY_COLUMN_ALIASES)!;
  const periodKey = findColumnKey(rows[0], PERIOD_COLUMN_ALIASES)!;
  const classKey = findColumnKey(rows[0], CLASS_COLUMN_ALIASES)!;
  const subjectKey = findColumnKey(rows[0], SUBJECT_COLUMN_ALIASES)!;

  return rows
    .map(row => ({
      teacherName: String(row[teacherKey] ?? '').trim(),
      dayArabic: String(row[dayKey] ?? '').trim(),
      periodNumber: Number(row[periodKey]),
      className: String(row[classKey] ?? '').trim(),
      subject: String(row[subjectKey] ?? '').trim()
    }))
    .filter(row => row.teacherName && row.dayArabic && row.className && Number.isFinite(row.periodNumber));
}

interface CourseRow {
  row_id: number;
  classroom_name: string;
  name: string;
  teacher_name: string;
}

interface CellRow {
  classroom_name: string;
  cell_number: number;
  course_row_id?: number | string;
  activate?: number | boolean;
}

function parseMinistryWorkbook(workbook: XLSX.WorkBook): TimetableImportRow[] {
  if (!workbook.Sheets.Courses || !workbook.Sheets.Cells || !workbook.Sheets.Workdays) {
    return [];
  }

  const courses = XLSX.utils.sheet_to_json<CourseRow>(workbook.Sheets.Courses);
  const cells = XLSX.utils.sheet_to_json<CellRow>(workbook.Sheets.Cells);
  const workdays = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Workdays)[0];
  const courseMap = new Map<number, CourseRow>(courses.map(course => [course.row_id, course]));

  let perDayPeriods: Record<string, number> = { '1': 7, '2': 7, '3': 7, '4': 6, '5': 6 };
  if (workdays?.per_day_classes) {
    try {
      perDayPeriods = JSON.parse(String(workdays.per_day_classes).replace(/'/g, '"'));
    } catch {
      // keep defaults
    }
  }

  const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const classPeriods = new Map<string, Map<number, number>>();

  cells.forEach(cell => {
    const isActive = cell.activate === 1 || cell.activate === true;
    if (!isActive || cell.course_row_id === undefined || cell.course_row_id === '') return;
    const courseId = Number(cell.course_row_id);
    if (!courseMap.has(courseId)) return;
    if (!classPeriods.has(cell.classroom_name)) {
      classPeriods.set(cell.classroom_name, new Map());
    }
    classPeriods.get(cell.classroom_name)!.set(cell.cell_number, courseId);
  });

  const rows: TimetableImportRow[] = [];
  for (const [className, periodMap] of classPeriods.entries()) {
    for (let dayIndex = 0; dayIndex < dayNames.length; dayIndex++) {
      const dayArabic = dayNames[dayIndex];
      const periodsForDay = perDayPeriods[String(dayIndex + 1)] ?? 7;
      let offset = 0;
      for (let i = 0; i < dayIndex; i++) {
        offset += perDayPeriods[String(i + 1)] ?? 7;
      }
      for (let period = 1; period <= periodsForDay; period++) {
        const cellNumber = offset + (period - 1);
        const courseId = periodMap.get(cellNumber);
        if (!courseId) continue;
        const course = courseMap.get(courseId);
        if (!course) continue;
        rows.push({
          teacherName: course.teacher_name,
          dayArabic,
          periodNumber: period,
          className,
          subject: course.name
        });
      }
    }
  }

  return rows;
}

function readMeta(workbook: XLSX.WorkBook): TimetableImportMeta {
  const metaRows = workbook.Sheets._META
    ? XLSX.utils.sheet_to_json<{ Key: string; Value: string | number }>(workbook.Sheets._META)
    : [];
  const metaMap = Object.fromEntries(metaRows.map(row => [row.Key, row.Value]));
  const workdays = workbook.Sheets.Workdays
    ? XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Workdays)[0]
    : undefined;
  const teachers = workbook.Sheets.Teachers
    ? XLSX.utils.sheet_to_json(workbook.Sheets.Teachers)
    : [];
  const classrooms = workbook.Sheets.Classrooms
    ? XLSX.utils.sheet_to_json(workbook.Sheets.Classrooms)
    : [];

  let perDayPeriods: Record<string, number> = { '1': 7, '2': 7, '3': 7, '4': 6, '5': 6 };
  if (workdays?.per_day_classes) {
    try {
      perDayPeriods = JSON.parse(String(workdays.per_day_classes).replace(/'/g, '"'));
    } catch {
      // keep defaults
    }
  }

  return {
    schoolName: metaMap.source_school_name ? String(metaMap.source_school_name) : undefined,
    tableName: metaMap.table_name ? String(metaMap.table_name) : undefined,
    teacherCount: teachers.length,
    classroomCount: classrooms.length,
    maxPeriods: Number(workdays?.number_of_classes ?? 7),
    perDayPeriods
  };
}

function buildTeacherPhoneMap(workbook: XLSX.WorkBook): Map<string, string> {
  const map = new Map<string, string>();
  if (!workbook.Sheets.Teachers) return map;
  const teachers = XLSX.utils.sheet_to_json<{ name: string; phone_number?: string | number }>(
    workbook.Sheets.Teachers
  );
  teachers.forEach(teacher => {
    if (teacher.name && teacher.phone_number) {
      map.set(teacher.name, String(teacher.phone_number));
    }
  });
  return map;
}

export function buildPeriod2AssignmentsFromRows(
  rows: TimetableImportRow[],
  classes: SchoolClass[],
  teachers: User[],
  teacherPhones?: Map<string, string>
): {
  assignments: DayPeriodAssignment[];
  unmatchedTeachers: string[];
  unmatchedClasses: string[];
  warnings: string[];
} {
  const unmatchedTeachers = new Set<string>();
  const unmatchedClasses = new Set<string>();
  const warnings: string[] = [];
  const period2Rows = rows.filter(row => row.periodNumber === 2);
  const assignments: DayPeriodAssignment[] = [];

  period2Rows.forEach(row => {
    const dayKey = DAY_KEY_MAP[row.dayArabic] ?? DAY_KEY_MAP[normalizeArabicText(row.dayArabic)];
    if (!dayKey) {
      warnings.push(`تعذر التعرف على اليوم: ${row.dayArabic}`);
      return;
    }

    const classId = excelClassNameToClassId(row.className);
    if (!classId) {
      unmatchedClasses.add(row.className);
      return;
    }

    const classItem = classes.find(cls => cls.id === classId);
    if (!classItem) {
      unmatchedClasses.add(row.className);
      return;
    }

    const teacher = resolveTeacherFromExcelName(row.teacherName, teachers, teacherPhones);
    if (!teacher) {
      unmatchedTeachers.add(row.teacherName);
      return;
    }

    assignments.push({
      id: `assign_${classId}_${dayKey}`,
      classId,
      className: classItem.name,
      day: dayKey,
      dayArabic: DAY_LABELS[dayKey],
      teacherId: teacher.id,
      teacherName: teacher.name,
      periodNumber: 2,
      subject: row.subject,
      notes: `مستورد من Excel — ${row.subject}`
    });
  });

  return {
    assignments,
    unmatchedTeachers: [...unmatchedTeachers],
    unmatchedClasses: [...unmatchedClasses],
    warnings
  };
}

export function parseTimetableWorkbook(
  workbook: XLSX.WorkBook,
  classes: SchoolClass[],
  teachers: User[]
): TimetableImportResult {
  const meta = readMeta(workbook);
  const teacherPhones = buildTeacherPhoneMap(workbook);
  const flatRows = parseFlatWorkbook(workbook);
  const rows = flatRows.length > 0 ? flatRows : parseMinistryWorkbook(workbook);
  const {
    assignments,
    unmatchedTeachers,
    unmatchedClasses,
    warnings
  } = buildPeriod2AssignmentsFromRows(rows, classes, teachers, teacherPhones);

  if (rows.length === 0) {
    warnings.push('لم يتم العثور على بيانات جدول صالحة في الملف.');
  }

  return {
    rows,
    period2Assignments: assignments,
    meta,
    unmatchedTeachers,
    unmatchedClasses,
    warnings
  };
}

export async function parseTimetableFile(
  file: File,
  classes: SchoolClass[],
  teachers: User[]
): Promise<TimetableImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  return parseTimetableWorkbook(workbook, classes, teachers);
}

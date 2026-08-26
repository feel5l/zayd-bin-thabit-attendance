import { User, SchoolClass, Student, ClassAttendanceSubmission, SchoolSettings, AuditLog, AbsenceExcuseRequest, PeriodSchedule } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    username: 'admin',
    name: 'مدير المدرسة',
    role: 'admin',
    password: 'Aa12345',
    phone: '',
    subject: 'مدير مدرسة زيد بن ثابت الابتدائية',
  },
  {
    id: 'user-teacher1',
    username: 'teacher1',
    name: 'معلم الصف الثالث (1)',
    role: 'teacher',
    password: '',
    assignedClassId: '3-1',
    assignedClassName: 'الصف الثالث (1)',
    phone: '',
    subject: 'مربي الفصل',
  },
  {
    id: 'user-teacher2',
    username: 'teacher2',
    name: 'معلم الصف الثالث (2)',
    role: 'teacher',
    password: '',
    assignedClassId: '3-2',
    assignedClassName: 'الصف الثالث (2)',
    phone: '',
    subject: 'مربي الفصل',
  },
  {
    id: 'user-teacher3',
    username: 'teacher3',
    name: 'معلم الصف الثالث (3)',
    role: 'teacher',
    password: '',
    assignedClassId: '3-3',
    assignedClassName: 'الصف الثالث (3)',
    phone: '',
    subject: 'مربي الفصل',
  },
  {
    id: 'user-teacher4',
    username: 'teacher4',
    name: 'معلم الصف الرابع (1)',
    role: 'teacher',
    password: '',
    assignedClassId: '4-1',
    assignedClassName: 'الصف الرابع (1)',
    phone: '',
    subject: 'مربي الفصل',
  },
  {
    id: 'user-teacher5',
    username: 'teacher5',
    name: 'معلم الصف الرابع (2)',
    role: 'teacher',
    password: '',
    assignedClassId: '4-2',
    assignedClassName: 'الصف الرابع (2)',
    phone: '',
    subject: 'مربي الفصل',
  },
  {
    id: 'user-teacher6',
    username: 'teacher6',
    name: 'معلم الصف الرابع (3)',
    role: 'teacher',
    password: '',
    assignedClassId: '4-3',
    assignedClassName: 'الصف الرابع (3)',
    phone: '',
    subject: 'مربي الفصل',
  },
  {
    id: 'user-teacher7',
    username: 'teacher7',
    name: 'معلم الصف الخامس (1)',
    role: 'teacher',
    password: '',
    assignedClassId: '5-1',
    assignedClassName: 'الصف الخامس (1)',
    phone: '',
    subject: 'مربي الفصل',
  },
  {
    id: 'user-teacher8',
    username: 'teacher8',
    name: 'معلم الصف الخامس (2)',
    role: 'teacher',
    password: '',
    assignedClassId: '5-2',
    assignedClassName: 'الصف الخامس (2)',
    phone: '',
    subject: 'مربي الفصل',
  },
  {
    id: 'user-teacher9',
    username: 'teacher9',
    name: 'معلم الصف الخامس (3)',
    role: 'teacher',
    password: '',
    assignedClassId: '5-3',
    assignedClassName: 'الصف الخامس (3)',
    phone: '',
    subject: 'مربي الفصل',
  },
  {
    id: 'user-teacher10',
    username: 'teacher10',
    name: 'معلم الصف السادس (1)',
    role: 'teacher',
    password: '',
    assignedClassId: '6-1',
    assignedClassName: 'الصف السادس (1)',
    phone: '',
    subject: 'مربي الفصل',
  },
  {
    id: 'user-teacher11',
    username: 'teacher11',
    name: 'معلم الصف السادس (2)',
    role: 'teacher',
    password: '',
    assignedClassId: '6-2',
    assignedClassName: 'الصف السادس (2)',
    phone: '',
    subject: 'مربي الفصل',
  }
];

export const INITIAL_CLASSES: SchoolClass[] = [
  {
    id: '3-1',
    name: 'الصف الثالث الابتدائي - الشعبة (1)',
    shortName: 'ثالث 1',
    gradeLevel: 'الصف الثالث الابتدائي',
    section: '1',
    roomNumber: 'قاعة 101',
    teacherId: 'user-teacher1',
    teacherName: 'معلم الصف (ثالث 1)',
    studentCount: 0,
    color: 'indigo'
  },
  {
    id: '3-2',
    name: 'الصف الثالث الابتدائي - الشعبة (2)',
    shortName: 'ثالث 2',
    gradeLevel: 'الصف الثالث الابتدائي',
    section: '2',
    roomNumber: 'قاعة 102',
    teacherId: 'user-teacher2',
    teacherName: 'معلم الصف (ثالث 2)',
    studentCount: 0,
    color: 'blue'
  },
  {
    id: '3-3',
    name: 'الصف الثالث الابتدائي - الشعبة (3)',
    shortName: 'ثالث 3',
    gradeLevel: 'الصف الثالث الابتدائي',
    section: '3',
    roomNumber: 'قاعة 103',
    teacherId: 'user-teacher3',
    teacherName: 'معلم الصف (ثالث 3)',
    studentCount: 0,
    color: 'cyan'
  },
  {
    id: '4-1',
    name: 'الصف الرابع الابتدائي - الشعبة (1)',
    shortName: 'رابع 1',
    gradeLevel: 'الصف الرابع الابتدائي',
    section: '1',
    roomNumber: 'قاعة 201',
    teacherId: 'user-teacher4',
    teacherName: 'معلم الصف (رابع 1)',
    studentCount: 0,
    color: 'emerald'
  },
  {
    id: '4-2',
    name: 'الصف الرابع الابتدائي - الشعبة (2)',
    shortName: 'رابع 2',
    gradeLevel: 'الصف الرابع الابتدائي',
    section: '2',
    roomNumber: 'قاعة 202',
    teacherId: 'user-teacher5',
    teacherName: 'معلم الصف (رابع 2)',
    studentCount: 0,
    color: 'teal'
  },
  {
    id: '4-3',
    name: 'الصف الرابع الابتدائي - الشعبة (3)',
    shortName: 'رابع 3',
    gradeLevel: 'الصف الرابع الابتدائي',
    section: '3',
    roomNumber: 'قاعة 203',
    teacherId: 'user-teacher6',
    teacherName: 'معلم الصف (رابع 3)',
    studentCount: 0,
    color: 'green'
  },
  {
    id: '5-1',
    name: 'الصف الخامس الابتدائي - الشعبة (1)',
    shortName: 'خامس 1',
    gradeLevel: 'الصف الخامس الابتدائي',
    section: '1',
    roomNumber: 'قاعة 301',
    teacherId: 'user-teacher7',
    teacherName: 'معلم الصف (خامس 1)',
    studentCount: 0,
    color: 'amber'
  },
  {
    id: '5-2',
    name: 'الصف الخامس الابتدائي - الشعبة (2)',
    shortName: 'خامس 2',
    gradeLevel: 'الصف الخامس الابتدائي',
    section: '2',
    roomNumber: 'قاعة 302',
    teacherId: 'user-teacher8',
    teacherName: 'معلم الصف (خامس 2)',
    studentCount: 0,
    color: 'orange'
  },
  {
    id: '5-3',
    name: 'الصف الخامس الابتدائي - الشعبة (3)',
    shortName: 'خامس 3',
    gradeLevel: 'الصف الخامس الابتدائي',
    section: '3',
    roomNumber: 'قاعة 303',
    teacherId: 'user-teacher9',
    teacherName: 'معلم الصف (خامس 3)',
    studentCount: 0,
    color: 'rose'
  },
  {
    id: '6-1',
    name: 'الصف السادس الابتدائي - الشعبة (1)',
    shortName: 'سادس 1',
    gradeLevel: 'الصف السادس الابتدائي',
    section: '1',
    roomNumber: 'قاعة 401',
    teacherId: 'user-teacher10',
    teacherName: 'معلم الصف (سادس 1)',
    studentCount: 0,
    color: 'purple'
  },
  {
    id: '6-2',
    name: 'الصف السادس الابتدائي - الشعبة (2)',
    shortName: 'سادس 2',
    gradeLevel: 'الصف السادس الابتدائي',
    section: '2',
    roomNumber: 'قاعة 402',
    teacherId: 'user-teacher11',
    teacherName: 'معلم الصف (سادس 2)',
    studentCount: 0,
    color: 'violet'
  }
];

export const INITIAL_PERIODS: PeriodSchedule[] = [
  { periodNumber: 1, name: 'الحصة الأولى', startTime: '07:00', endTime: '07:45', isAttendancePeriod: false },
  { periodNumber: 2, name: 'الحصة الثانية (فترة الرصد المعتمدة)', startTime: '07:50', endTime: '08:35', isAttendancePeriod: true },
  { periodNumber: 3, name: 'الحصة الثالثة', startTime: '08:40', endTime: '09:25', isAttendancePeriod: false },
  { periodNumber: 4, name: 'الفسحة المدرسية', startTime: '09:25', endTime: '09:55', isAttendancePeriod: false },
  { periodNumber: 5, name: 'الحصة الرابعة', startTime: '09:55', endTime: '10:40', isAttendancePeriod: false },
  { periodNumber: 6, name: 'الحصة الخامسة', startTime: '10:45', endTime: '11:30', isAttendancePeriod: false },
  { periodNumber: 7, name: 'الحصة السادسة وصلاة الظهر', startTime: '11:35', endTime: '12:20', isAttendancePeriod: false }
];

export const INITIAL_SETTINGS: SchoolSettings = {
  schoolName: 'مدرسة زيد بن ثابت الابتدائية',
  academicYear: '1447 - 1448 هـ',
  term: 'الفصل الدراسي الأول',
  principalName: 'مدير المدرسة',
  vicePrincipalName: 'وكيل شؤون الطلاب',
  period2StartTime: '07:50',
  period2EndTime: '08:45',
  lockAttendanceOutsidePeriod: false,
  smsAlertsEnabled: true,
  whatsappAutoText: 'المكرم ولي أمر الطالب/ [اسم_الطالب]، نفيدكم بغياب ابنكم عن مدرسة زيد بن ثابت الابتدائية اليوم [التاريخ] بالحصة الثانية. نرجو التواصل مع إدارة المدرسة أو تقديم عذر عبر النظام.',
  absenceWarningThreshold: 3
};

export const ABSENCE_REASONS = [
  { id: 'illness_certified', label: 'مرض بعذر طبي معتمد', isExcused: true, category: 'medical' as const },
  { id: 'family_emergency', label: 'ظرف عائلي طارئ', isExcused: true, category: 'family' as const },
  { id: 'official_permission', label: 'إذن رسمي مسبق من الإدارة', isExcused: true, category: 'official' as const },
  { id: 'no_excuse', label: 'غياب بدون عذر', isExcused: false, category: 'unexcused' as const },
  { id: 'travel', label: 'سفر خارج المدينة', isExcused: true, category: 'family' as const },
  { id: 'traffic_delay', label: 'عطل في وسيلة النقل / تأخير مروري', isExcused: true, category: 'other' as const }
];

// Empty and clean data structures ready for production use
export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_SUBMISSIONS: ClassAttendanceSubmission[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_EXCUSES: AbsenceExcuseRequest[] = [];

export const getTodayDateString = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

export const getPastDateString = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

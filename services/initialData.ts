import { User, SchoolClass, Student, ClassAttendanceSubmission, SchoolSettings, AuditLog, AbsenceExcuseRequest, PeriodSchedule } from '../types';
import { OFFICIAL_TEACHERS_LIST } from './teachersData';
import { OFFICIAL_CLASSES_LIST } from './officialClassesData';
import { OFFICIAL_STUDENTS_LIST } from './officialStudentsData';

// Default initial school leadership (Principal: Ziyad Al-Otaibi, Vice Principal: Mohammed Al-Zamami)
export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    username: 'admin',
    name: 'أ. زياد العتيبي',
    role: 'admin',
    password: '',
    phone: '',
    email: '',
    subject: 'مدير المدرسة',
    avatar: '👨‍💼'
  },
  {
    id: 'user-vice',
    username: 'vice_principal',
    name: 'أ. محمد الزمامي',
    role: 'admin',
    password: '',
    phone: '',
    email: '',
    subject: 'وكيل المدرسة',
    avatar: '👨‍💼'
  },
  ...OFFICIAL_TEACHERS_LIST
];

// Clean classes list
export const INITIAL_CLASSES: SchoolClass[] = OFFICIAL_CLASSES_LIST;

// Standard periods schedule
export const INITIAL_PERIODS: PeriodSchedule[] = [
  { periodNumber: 1, name: 'الحصة الأولى', startTime: '07:00', endTime: '07:45', isAttendancePeriod: false },
  { periodNumber: 2, name: 'الحصة الثانية (فترة الرصد المعتمدة)', startTime: '07:50', endTime: '08:35', isAttendancePeriod: true },
  { periodNumber: 3, name: 'الحصة الثالثة', startTime: '08:40', endTime: '09:25', isAttendancePeriod: false },
  { periodNumber: 4, name: 'الفسحة المدرسية', startTime: '09:25', endTime: '09:55', isAttendancePeriod: false },
  { periodNumber: 5, name: 'الحصة الرابعة', startTime: '09:55', endTime: '10:40', isAttendancePeriod: false },
  { periodNumber: 6, name: 'الحصة الخامسة', startTime: '10:45', endTime: '11:30', isAttendancePeriod: false },
  { periodNumber: 7, name: 'الحصة السادسة وصلاة الظهر', startTime: '11:35', endTime: '12:20', isAttendancePeriod: false }
];

// Official school configuration confirming Principal Ziyad Al-Otaibi and Vice Principal Mohammed Al-Zamami
export const INITIAL_SETTINGS: SchoolSettings = {
  schoolName: 'مدرسة زيد بن ثابت الابتدائية',
  academicYear: '1447 - 1448 هـ',
  term: 'الفصل الدراسي الأول',
  principalName: 'زياد العتيبي',
  vicePrincipalName: 'محمد الزمامي',
  period2StartTime: '07:50',
  period2EndTime: '08:45',
  lockAttendanceOutsidePeriod: false,
  smsAlertsEnabled: true,
  whatsappAutoText: 'المكرم ولي أمر الطالب/ [اسم_الطالب]، نفيدكم بغياب ابنكم عن مدرسة زيد بن ثابت الابتدائية اليوم [التاريخ] بالحصة الثانية. نرجو التواصل مع إدارة المدرسة أو تقديم عذر عبر النظام.',
  absenceWarningThreshold: 3
};

// Standard absence reasons dictionary
export const ABSENCE_REASONS = [
  { id: 'illness_certified', label: 'مرض بعذر طبي معتمد', isExcused: true, category: 'medical' as const },
  { id: 'family_emergency', label: 'ظرف عائلي طارئ', isExcused: true, category: 'family' as const },
  { id: 'official_permission', label: 'إذن رسمي مسبق من الإدارة', isExcused: true, category: 'official' as const },
  { id: 'no_excuse', label: 'غياب بدون عذر', isExcused: false, category: 'unexcused' as const },
  { id: 'travel', label: 'سفر خارج المدينة', isExcused: true, category: 'family' as const },
  { id: 'traffic_delay', label: 'عطل في وسيلة النقل / تأخير مروري', isExcused: true, category: 'other' as const }
];

// Clean student roster
export const INITIAL_STUDENTS: Student[] = OFFICIAL_STUDENTS_LIST;

export const INITIAL_SUBMISSIONS: ClassAttendanceSubmission[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_EXCUSES: AbsenceExcuseRequest[] = [];

// Helper date utilities
export const getTodayDateString = (): string => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

export const getPastDateString = (daysAgo: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

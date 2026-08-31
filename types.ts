export type UserRole = 'admin' | 'teacher';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  password?: string;
  assignedClassId?: string;
  assignedClassName?: string;
  avatar?: string;
  phone?: string;
  subject?: string;
  email?: string;
  nationalId?: string;
  sequenceNumber?: number;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AbsenceReason {
  id: string;
  label: string;
  isExcused: boolean;
  category: 'medical' | 'family' | 'official' | 'unexcused' | 'other';
}

export interface Student {
  id: string;
  nationalId: string;
  studentNumber: string;
  name: string;
  gradeLevel: string; // e.g. "الصف الثالث", "الصف الرابع", "الصف الخامس", "الصف السادس"
  classId: string; // e.g. "3-1", "4-1", "5-2"
  className: string; // e.g. "ثالث 1", "رابع 1"
  parentName: string;
  parentPhone: string;
  gender: 'male' | 'female';
  nationality?: string;
  birthDate?: string;
  homePhone?: string;
  relativeName?: string;
  notes?: string;
  chronicCondition?: boolean;
}

export interface StudentAttendanceItem {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  reason?: string;
  notes?: string;
  minutesLate?: number;
  contactedParent?: boolean;
}

export interface ClassAttendanceSubmission {
  id: string;
  date: string; // YYYY-MM-DD
  classId: string;
  className: string;
  gradeLevel: string;
  teacherId: string;
  teacherName: string;
  periodNumber: number; // usually 2 (الحصة الثانية)
  submittedAt: string; // ISO Timestamp
  updatedAt?: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  students: StudentAttendanceItem[];
  verifiedByAdmin?: boolean;
  notes?: string;
}

export interface SchoolClass {
  id: string;
  name: string; // e.g. "الصف الرابع - أ"
  shortName: string; // e.g. "رابع أ"
  gradeLevel: string; // e.g. "الصف الرابع"
  section: string; // e.g. "أ"
  roomNumber: string;
  teacherId: string;
  teacherName: string;
  studentCount: number;
  capacity?: number;
  attendancePeriod?: number;
  academicYear?: string;
  color: string;
}

export interface PeriodSchedule {
  periodNumber: number;
  name: string; // e.g. "الحصة الأولى", "الحصة الثانية"
  startTime: string; // "07:30"
  endTime: string; // "08:15"
  isAttendancePeriod: boolean; // true for Period 2
}

export interface SchoolSettings {
  schoolName: string;
  academicYear: string;
  term: string;
  principalName: string;
  vicePrincipalName: string;
  period2StartTime: string; // "08:30"
  period2EndTime: string; // "09:15"
  lockAttendanceOutsidePeriod: boolean;
  smsAlertsEnabled: boolean;
  whatsappAutoText: string;
  absenceWarningThreshold: number; // e.g. 3, 5 days
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  details: string;
  targetClass?: string;
  type: 'attendance_submit' | 'attendance_edit' | 'student_add' | 'settings_change' | 'login' | 'sms_sent' | 'data_archive' | 'data_restore';
}

export interface AbsenceExcuseRequest {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  date: string;
  reason: string;
  parentNotes: string;
  parentPhone: string;
  attachmentName?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface AbsentStudentDetail {
  studentId: string;
  studentName: string;
  status: 'absent' | 'excused' | 'late';
  reason?: string;
  isExcused: boolean;
  notes?: string;
  minutesLate?: number;
}

export interface AttendanceNotification {
  id: string;
  submissionId: string;
  timestamp: string; // ISO string
  date: string;
  classId: string;
  className: string;
  gradeLevel: string;
  teacherId: string;
  teacherName: string;
  periodNumber: number;
  presentCount: number;
  absentCount: number; // غياب مؤكد / بدون عذر
  excusedCount: number; // غياب معذر / بعذر
  lateCount: number;
  totalStudents: number;
  absentStudents: AbsentStudentDetail[];
  read: boolean;
}

export interface MonthlyClassReportItem {
  classId: string;
  className: string;
  gradeLevel: string;
  teacherName: string;
  studentCount: number;
  totalSessions: number;
  totalPresent: number;
  totalAbsentUnexcused: number;
  totalAbsentExcused: number;
  totalLate: number;
  attendanceRate: number;
}

export interface MonthlyStudentAbsenceSummary {
  studentId: string;
  studentName: string;
  className: string;
  gradeLevel: string;
  unexcusedDays: number;
  excusedDays: number;
  lateDays: number;
  totalAbsences: number;
  attendanceRate: number;
  isChronic: boolean;
}

export interface MonthlyReportData {
  yearMonth: string; // e.g. "2026-08"
  monthName: string;
  schoolName: string;
  principalName: string;
  vicePrincipalName: string;
  counselorName?: string;
  academicYear: string;
  term: string;
  totalSchoolStudents: number;
  totalSchoolDaysRecorded: number;
  schoolAverageAttendanceRate: number;
  totalPresentCount: number;
  totalUnexcusedAbsentCount: number;
  totalExcusedAbsentCount: number;
  totalLateCount: number;
  classesSummary: MonthlyClassReportItem[];
  studentsAbsenceList: MonthlyStudentAbsenceSummary[];
  dailyAttendanceTrend: {
    date: string;
    dayName: string;
    presentCount: number;
    absentCount: number;
    excusedCount: number;
    attendanceRate: number;
  }[];
}

export interface AttendanceArchiveBatch {
  id: string;
  title: string;
  archivedAt: string;
  archivedBy: string;
  archivedByUserId: string;
  cutoffDate: string;
  cutoffMonths: number;
  submissionsCount: number;
  studentsAbsenceCount: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  submissions: ClassAttendanceSubmission[];
  sizeKb: number;
  notes?: string;
}

export interface ArchiveAnalytics {
  activeSubmissionsCount: number;
  oldSubmissionsCount: number;
  archivedBatchesCount: number;
  archivedSubmissionsTotal: number;
  estimatedSizeActiveKb: number;
  estimatedSizeArchivedKb: number;
  oldestSubmissionDate: string | null;
  newestSubmissionDate: string | null;
  cutoffDate3Months: string;
}

export interface TeacherSessionValidation {
  isValid: boolean;
  hasAssignedClass: boolean;
  classExists: boolean;
  className: string;
  studentCount: number;
  isRosterEmpty: boolean;
  issues: string[];
  warnings: string[];
  details: {
    gradeLevel?: string;
    section?: string;
    roomNumber?: string;
    periodName: string;
    periodTime: string;
  };
}

export type WeekDayKey = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday';

export interface DayPeriodAssignment {
  id: string;
  classId: string;
  className: string; // e.g. "الصف الرابع - أ" or "رابع 1"
  day: WeekDayKey; // 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday'
  dayArabic: string; // 'الأحد' | 'الإثنين' | 'الثلاثاء' | 'الأربعاء' | 'الخميس'
  teacherId: string;
  teacherName: string;
  periodNumber: number; // usually 2 (الحصة الثانية)
  subject?: string;
  notes?: string;
}

export interface DayOfWeekOption {
  key: WeekDayKey;
  label: string; // 'الأحد', 'الإثنين', إلخ
  index: number; // 0 for Sunday, 1 for Monday, etc.
}

export type ContactCategory = 'parent' | 'teacher' | 'admin' | 'official' | 'medical' | 'other';

export interface ContactItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  category: ContactCategory;
  roleDescription?: string; // e.g. "ولي أمر الطالب: خالد الحربي (رابع 1)" or "معلم الرياضيات"
  studentId?: string;
  studentName?: string;
  className?: string;
  address?: string;
  notes?: string;
  isFavorite?: boolean;
  googleResourceName?: string; // e.g. "people/c123456"
  googleETag?: string;
  lastUpdated: string; // ISO Timestamp
}

export interface GoogleContactPerson {
  resourceName: string;
  etag?: string;
  names?: { displayName?: string; givenName?: string; familyName?: string }[];
  phoneNumbers?: { value?: string; type?: string; canonicalForm?: string }[];
  emailAddresses?: { value?: string; type?: string }[];
  organizations?: { name?: string; title?: string; department?: string }[];
  biographies?: { value?: string }[];
  photos?: { url?: string }[];
}

export interface ContactsSyncStats {
  totalContacts: number;
  parentsCount: number;
  teachersCount: number;
  adminCount: number;
  officialCount: number;
  googleSyncedCount: number;
  favoritesCount: number;
}





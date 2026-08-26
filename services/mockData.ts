import { User, SchoolClass, Student, ClassAttendanceSubmission, SchoolSettings, AuditLog, AbsenceExcuseRequest, PeriodSchedule } from '../types';
import { ALL_STUDENTS } from './studentsData';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin',
    username: 'admin',
    name: 'مدير المدرسة',
    role: 'admin',
    password: 'Aa12345',
    phone: '0500000000',
    subject: 'مدير مدرسة زيد بن ثابت الابتدائية',
  },
  {
    id: 'user-teacher1',
    username: 'teacher1',
    name: 'معلم الصف الثالث (1)',
    role: 'teacher',
    password: '0550000001',
    assignedClassId: '3-1',
    assignedClassName: 'الصف الثالث (1)',
    phone: '0550000001',
    subject: 'لغتي الجميلة - مربي الفصل',
  },
  {
    id: 'user-teacher2',
    username: 'teacher2',
    name: 'معلم الصف الثالث (2)',
    role: 'teacher',
    password: '0550000002',
    assignedClassId: '3-2',
    assignedClassName: 'الصف الثالث (2)',
    phone: '0550000002',
    subject: 'الرياضيات - مربي الفصل',
  },
  {
    id: 'user-teacher3',
    username: 'teacher3',
    name: 'معلم الصف الثالث (3)',
    role: 'teacher',
    password: '0550000003',
    assignedClassId: '3-3',
    assignedClassName: 'الصف الثالث (3)',
    phone: '0550000003',
    subject: 'العلوم - مربي الفصل',
  },
  {
    id: 'user-teacher4',
    username: 'teacher4',
    name: 'معلم الصف الرابع (1)',
    role: 'teacher',
    password: '0550000004',
    assignedClassId: '4-1',
    assignedClassName: 'الصف الرابع (1)',
    phone: '0550000004',
    subject: 'الدراسات الإسلامية - مربي الفصل',
  },
  {
    id: 'user-teacher5',
    username: 'teacher5',
    name: 'معلم الصف الرابع (2)',
    role: 'teacher',
    password: '0550000005',
    assignedClassId: '4-2',
    assignedClassName: 'الصف الرابع (2)',
    phone: '0550000005',
    subject: 'الرياضيات - مربي الفصل',
  },
  {
    id: 'user-teacher6',
    username: 'teacher6',
    name: 'معلم الصف الرابع (3)',
    role: 'teacher',
    password: '0550000006',
    assignedClassId: '4-3',
    assignedClassName: 'الصف الرابع (3)',
    phone: '0550000006',
    subject: 'التربية الاجتماعية - مربي الفصل',
  },
  {
    id: 'user-teacher7',
    username: 'teacher7',
    name: 'معلم الصف الخامس (1)',
    role: 'teacher',
    password: '0550000007',
    assignedClassId: '5-1',
    assignedClassName: 'الصف الخامس (1)',
    phone: '0550000007',
    subject: 'اللغة الإنجليزية - مربي الفصل',
  },
  {
    id: 'user-teacher8',
    username: 'teacher8',
    name: 'معلم الصف الخامس (2)',
    role: 'teacher',
    password: '0550000008',
    assignedClassId: '5-2',
    assignedClassName: 'الصف الخامس (2)',
    phone: '0550000008',
    subject: 'المهارات الرقمية - مربي الفصل',
  },
  {
    id: 'user-teacher9',
    username: 'teacher9',
    name: 'معلم الصف الخامس (3)',
    role: 'teacher',
    password: '0550000009',
    assignedClassId: '5-3',
    assignedClassName: 'الصف الخامس (3)',
    phone: '0550000009',
    subject: 'العلوم - مربي الفصل',
  },
  {
    id: 'user-teacher10',
    username: 'teacher10',
    name: 'معلم الصف السادس (1)',
    role: 'teacher',
    password: '0550000010',
    assignedClassId: '6-1',
    assignedClassName: 'الصف السادس (1)',
    phone: '0550000010',
    subject: 'الدراسات الإسلامية - مربي الفصل',
  },
  {
    id: 'user-teacher11',
    username: 'teacher11',
    name: 'معلم الصف السادس (2)',
    role: 'teacher',
    password: '0550000011',
    assignedClassId: '6-2',
    assignedClassName: 'الصف السادس (2)',
    phone: '0550000011',
    subject: 'لغتي الجميلة - مربي الفصل',
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
    studentCount: 34,
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
    studentCount: 34,
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
    studentCount: 34,
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
    studentCount: 33,
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
    studentCount: 33,
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
    studentCount: 34,
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
    studentCount: 30,
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
    studentCount: 29,
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
    studentCount: 29,
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
    studentCount: 33,
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
    studentCount: 33,
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

export const INITIAL_STUDENTS: Student[] = ALL_STUDENTS;

export const getTodayDateString = () => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

export const getPastDateString = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

export const INITIAL_SUBMISSIONS: ClassAttendanceSubmission[] = [
  // Today's submissions
  {
    id: `sub-${getTodayDateString()}-4-1`,
    date: getTodayDateString(),
    classId: '4-1',
    className: 'الصف الرابع الابتدائي (1)',
    gradeLevel: 'الصف الرابع الابتدائي',
    teacherId: 'user-teacher4',
    teacherName: 'أ. فهد المطيري',
    periodNumber: 2,
    submittedAt: `${getTodayDateString()}T08:15:32.000Z`,
    totalStudents: 33,
    presentCount: 31,
    absentCount: 1,
    lateCount: 1,
    excusedCount: 0,
    students: [
      { studentId: 's41-02', studentName: 'باسل محمد بشير عمر', status: 'late', minutesLate: 10 },
      { studentId: 's41-05', studentName: 'حمود أحمد نواف الكنيس', status: 'absent', reason: 'غياب بدون عذر' }
    ]
  },
  {
    id: `sub-${getTodayDateString()}-5-2`,
    date: getTodayDateString(),
    classId: '5-2',
    className: 'الصف الخامس الابتدائي (2)',
    gradeLevel: 'الصف الخامس الابتدائي',
    teacherId: 'user-teacher8',
    teacherName: 'أ. ناصر السبيعي',
    periodNumber: 2,
    submittedAt: `${getTodayDateString()}T08:20:10.000Z`,
    totalStudents: 29,
    presentCount: 28,
    absentCount: 0,
    lateCount: 0,
    excusedCount: 1,
    students: [
      { studentId: 's52-06', studentName: 'حمود سليمان العساف', status: 'excused', reason: 'مرض بعذر طبي معتمد', notes: 'تقرير مستشفى الملك فهد بالهفوف' }
    ]
  },
  // Yesterday's Submissions
  {
    id: `sub-${getPastDateString(1)}-3-1`,
    date: getPastDateString(1),
    classId: '3-1',
    className: 'الصف الثالث الابتدائي (1)',
    gradeLevel: 'الصف الثالث الابتدائي',
    teacherId: 'user-teacher1',
    teacherName: 'أ. أحمد الغامدي',
    periodNumber: 2,
    submittedAt: `${getPastDateString(1)}T08:12:00.000Z`,
    totalStudents: 34,
    presentCount: 32,
    absentCount: 1,
    lateCount: 1,
    excusedCount: 0,
    students: [
      { studentId: 's31-06', studentName: 'حسان علي عايش الاهدل', status: 'absent', reason: 'غياب بدون عذر' },
      { studentId: 's31-08', studentName: 'ساري مانع بن راشد المري', status: 'late', minutesLate: 15 }
    ]
  },
  {
    id: `sub-${getPastDateString(1)}-6-1`,
    date: getPastDateString(1),
    classId: '6-1',
    className: 'الصف السادس الابتدائي (1)',
    gradeLevel: 'الصف السادس الابتدائي',
    teacherId: 'user-teacher10',
    teacherName: 'أ. علي الدوسري',
    periodNumber: 2,
    submittedAt: `${getPastDateString(1)}T08:25:00.000Z`,
    totalStudents: 33,
    presentCount: 31,
    absentCount: 1,
    lateCount: 0,
    excusedCount: 1,
    students: [
      { studentId: 's61-05', studentName: 'سامر علي احمد الصلاحي', status: 'excused', reason: 'ظرف عائلي طارئ' },
      { studentId: 's61-17', studentName: 'عمار نصر العماري', status: 'absent', reason: 'غياب بدون عذر' }
    ]
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-01',
    timestamp: `${getTodayDateString()}T08:15:32.000Z`,
    userId: 'user-teacher4',
    userName: 'أ. فهد المطيري',
    role: 'teacher',
    action: 'رصد حضور الحصة الثانية',
    details: 'تم اعتماد كشف حضور الصف الرابع (1) لليوم بنجاح (31 حاضر، 1 غائب، 1 متأخر)',
    targetClass: '4-1',
    type: 'attendance_submit'
  },
  {
    id: 'log-02',
    timestamp: `${getTodayDateString()}T08:20:10.000Z`,
    userId: 'user-teacher8',
    userName: 'أ. ناصر السبيعي',
    role: 'teacher',
    action: 'رصد حضور الحصة الثانية',
    details: 'تم اعتماد كشف حضور الصف الخامس (2) لليوم بنجاح (28 حاضر، 1 بعذر)',
    targetClass: '5-2',
    type: 'attendance_submit'
  }
];

export const INITIAL_EXCUSES: AbsenceExcuseRequest[] = [
  {
    id: 'excuse-01',
    studentId: 's52-06',
    studentName: 'حمود سليمان العساف',
    classId: '5-2',
    className: 'خامس 2',
    date: getTodayDateString(),
    reason: 'مرض بعذر طبي معتمد',
    parentNotes: 'مراجعة قسم الطوارئ بمستشفى الملك فهد بالهفوف وراحة يومين.',
    parentPhone: '966536407059',
    attachmentName: 'تقرير_طبي_معتمد.pdf',
    status: 'approved',
    submittedAt: `${getTodayDateString()}T07:15:00.000Z`,
    reviewedBy: 'أ. إبراهيم السبيعي (مدير المدرسة)',
    reviewNotes: 'تم قبول العذر واعتماده في سجلات نور المدرسية.'
  }
];

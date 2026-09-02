import { User, SchoolClass, Student, ClassAttendanceSubmission, SchoolSettings, AuditLog, AbsenceExcuseRequest, PeriodSchedule, StudentReferralForm } from '../types';
// Deliberately the PII-free roster: importing teachersData here would ship
// every teacher's phone number and national ID inside the public bundle.
// Identity checking lives on the server — see services/teacherAuth.ts.
import { PUBLIC_TEACHERS_LIST } from './teachersPublic';
import { OFFICIAL_CLASSES_LIST } from './officialClassesData';
import { OFFICIAL_STUDENTS_LIST } from './officialStudentsData';

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
  ...PUBLIC_TEACHERS_LIST
];

// Clean classes list
export const INITIAL_CLASSES: SchoolClass[] = OFFICIAL_CLASSES_LIST;

// Standard periods schedule
export const INITIAL_PERIODS: PeriodSchedule[] = [
  { periodNumber: 1, name: 'الحصة الأولى', startTime: '07:00', endTime: '07:45', isAttendancePeriod: false },
  { periodNumber: 2, name: 'الحصة الثانية (فترة الرصد المعتمدة)', startTime: '07:45', endTime: '08:30', isAttendancePeriod: true },
  { periodNumber: 3, name: 'الحصة الثالثة', startTime: '08:35', endTime: '09:20', isAttendancePeriod: false },
  { periodNumber: 4, name: 'الفسحة المدرسية', startTime: '09:20', endTime: '09:50', isAttendancePeriod: false },
  { periodNumber: 5, name: 'الحصة الرابعة', startTime: '09:50', endTime: '10:35', isAttendancePeriod: false },
  { periodNumber: 6, name: 'الحصة الخامسة', startTime: '10:40', endTime: '11:25', isAttendancePeriod: false },
  { periodNumber: 7, name: 'الحصة السادسة وصلاة الظهر', startTime: '11:30', endTime: '12:15', isAttendancePeriod: false }
];

// Official school configuration confirming Principal Ziyad Al-Otaibi and Vice Principal Mohammed Al-Zamami
export const INITIAL_SETTINGS: SchoolSettings = {
  schoolName: 'مدرسة زيد بن ثابت الابتدائية',
  academicYear: '1447 - 1448 هـ',
  term: 'الفصل الدراسي الأول',
  principalName: 'زياد العتيبي',
  vicePrincipalName: 'محمد الزمامي',
  period2StartTime: '07:45',
  period2EndTime: '08:30',
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

// Quick behavioral note presets for classroom observation during Period 2
export interface BehavioralPreset {
  id: string;
  label: string;
  icon?: string;
  type: 'positive' | 'attention' | 'neutral';
}

export const BEHAVIORAL_NOTE_PRESETS: BehavioralPreset[] = [
  { id: 'excellent_participation', label: 'متميز ومتفاعل', icon: '🌟', type: 'positive' },
  { id: 'exemplary_conduct', label: 'قدوة حسنة وانضباط عالي', icon: '⭐', type: 'positive' },
  { id: 'homework_done', label: 'إنجاز الواجب والمهام بإتقان', icon: '📝', type: 'positive' },
  { id: 'helpful_peer', label: 'تعاون ومساعدة الزملاء', icon: '🤝', type: 'positive' },
  { id: 'forgot_book', label: 'عدم إحضار الكتاب / الأدوات', icon: '📚', type: 'attention' },
  { id: 'distracted', label: 'تشتت وانشغال أثناء الشرح', icon: '⚠️', type: 'attention' },
  { id: 'sleepy', label: 'إرهاق أو نعاس أثناء الحصة', icon: '💤', type: 'attention' },
  { id: 'frequent_leave', label: 'تكرار الاستئذان من الفصل', icon: '🚪', type: 'attention' },
  { id: 'side_talk', label: 'أحاديث جانبية متكررة', icon: '🗣️', type: 'attention' },
  { id: 'needs_guidance', label: 'يحتاج متابعة وتوجيه سلوكي', icon: '💬', type: 'attention' }
];

// Clean student roster
export const INITIAL_STUDENTS: Student[] = OFFICIAL_STUDENTS_LIST;

export const INITIAL_SUBMISSIONS: ClassAttendanceSubmission[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_EXCUSES: AbsenceExcuseRequest[] = [];

// Official referral reasons list matching Ministry of Education Student Guidance Form (IMG_3909)
export const OFFICIAL_REFERRAL_REASONS = [
  { id: 'neglect_homework', label: 'إهمال في أداء الواجب', icon: '📝' },
  { id: 'no_book', label: 'عدم إحضار الكتاب', icon: '📚' },
  { id: 'disruptive', label: 'مشاغبة', icon: '⚠️' },
  { id: 'late_for_class', label: 'تأخر عن الحصة', icon: '⏰' },
  { id: 'academic_weakness', label: 'ضعف دراسي', icon: '📉' },
  { id: 'other', label: 'أخرى (تذكر)', icon: '✏️' }
];

export const INITIAL_REFERRAL_FORMS: StudentReferralForm[] = [
  {
    id: 'ref-1447-001',
    referralNumber: 'تح-1447-001',
    date: getTodayDateString(),
    hijriDate: '1447/03/10 هـ',
    attachmentsCount: 'لا يوجد',
    studentId: 'st-5-1-01',
    studentName: 'إبراهيم بن عبدالله بن صالح الدوسري',
    gradeLevel: 'الصف الخامس الابتدائي',
    className: 'خامس 1',
    section: '1',
    reasons: ['إهمال في أداء الواجب', 'عدم إحضار الكتاب'],
    referralSource: 'teacher',
    referrerName: 'أ. صالح مسعود حمد الدوسري',
    problemDescription: 'تكرار عدم إحضار كتاب المادة والواجبات المدرسية لثلاث حصص متتالية رغم التنبيه الشفهي المستمر، مما أثر على تفاعله داخل الصف.',
    teacherSignature: 'صالح الدوسري',
    actionTakenByCounselor: 'تم استقبال الطالب والجلوس معه لمعرفة الأسباب، وأفاد بنسيان تنظيم الحقيبة المدرسية، تم إرشاده لكيفية إعداد الجدول اليومي والتواصل مع ولي أمره هاتفياً للمتابعة المنزلية.',
    referredNextTo: 'subject_teacher',
    referredNextDate: '1447/03/11 هـ',
    counselorName: 'المرشد الطلابي',
    counselorSignature: 'التوجيه الطلابي',
    counselorDate: '1447/03/11 هـ',
    status: 'resolved',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ref-1447-002',
    referralNumber: 'تح-1447-002',
    date: getTodayDateString(),
    hijriDate: '1447/03/12 هـ',
    attachmentsCount: 'كشف درجات تجريبي',
    studentId: 'st-4-2-05',
    studentName: 'أحمد بن فيصل بن محمد القحطاني',
    gradeLevel: 'الصف الرابع الابتدائي',
    className: 'رابع 2',
    section: '2',
    reasons: ['ضعف دراسي', 'تأخر عن الحصة'],
    referralSource: 'teacher',
    referrerName: 'أ. محمد فهد عائض آل جحيش',
    problemDescription: 'ملاحظة صعوبة في استيعاب المهارات الأساسية للدرس مع تأخر متكرر عن دخول الحصة الثانية.',
    teacherSignature: 'محمد آل جحيش',
    actionTakenByCounselor: 'تم إدراج الطالب ضمن برنامج الرعاية التربوية والتعليم المساند، وتنسيق خطة تعزيز فردية مع معلم المادة وولي الأمر.',
    referredNextTo: 'none',
    counselorName: 'المرشد الطلابي',
    counselorSignature: 'التوجيه الطلابي',
    status: 'in_progress',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

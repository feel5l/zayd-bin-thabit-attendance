import { 
  User, SchoolClass, Student, ClassAttendanceSubmission, 
  SchoolSettings, AuditLog, AbsenceExcuseRequest, 
  StudentAttendanceItem, PeriodSchedule, AttendanceNotification, AbsentStudentDetail,
  MonthlyReportData, MonthlyClassReportItem, MonthlyStudentAbsenceSummary,
  AttendanceArchiveBatch, ArchiveAnalytics, TeacherSessionValidation,
  DayPeriodAssignment, WeekDayKey, DayOfWeekOption
} from '../types';
import { 
  INITIAL_USERS, INITIAL_CLASSES, INITIAL_STUDENTS, 
  INITIAL_SUBMISSIONS, INITIAL_SETTINGS, INITIAL_AUDIT_LOGS, 
  INITIAL_EXCUSES, INITIAL_PERIODS, getTodayDateString, getPastDateString 
} from './initialData';

const STORAGE_KEYS = {
  USERS: 'zbt_users_prod_v2',
  CLASSES: 'zbt_classes_prod_v2',
  STUDENTS: 'zbt_students_prod_v2',
  SUBMISSIONS: 'zbt_submissions_prod_v2',
  SETTINGS: 'zbt_settings_prod_v2',
  AUDIT_LOGS: 'zbt_logs_prod_v2',
  EXCUSES: 'zbt_excuses_prod_v2',
  SIMULATED_TIME: 'zbt_simulated_time_prod_v2',
  CURRENT_USER: 'zbt_current_user_prod_v2',
  NOTIFICATIONS: 'zbt_notifications_prod_v2',
  ARCHIVES: 'zbt_attendance_archives_prod_v2',
  TEACHER_REMINDERS: 'zbt_teacher_reminders_prod_v2',
  PERIOD_ASSIGNMENTS: 'zbt_period_assignments_prod_v2',
  LAST_ACTIVITY: 'zbt_last_activity_prod_v2'
};

export const NOTIFICATION_EVENT = 'attendance_notification_event';
export const TEACHER_REMINDER_EVENT = 'attendance_teacher_reminder_event';
export const SESSION_TIMEOUT_EVENT = 'attendance_session_timeout_event';

export const WEEKDAYS_LIST: { key: WeekDayKey; label: string; index: number }[] = [
  { key: 'sunday', label: 'الأحد', index: 0 },
  { key: 'monday', label: 'الإثنين', index: 1 },
  { key: 'tuesday', label: 'الثلاثاء', index: 2 },
  { key: 'wednesday', label: 'الأربعاء', index: 3 },
  { key: 'thursday', label: 'الخميس', index: 4 }
];



export class AttendanceService {
  // --- In-Memory Fast Cache Layer ---
  private static _initialized = false;
  private static _cacheUsers: User[] | null = null;
  private static _cacheClasses: SchoolClass[] | null = null;
  private static _cacheStudents: Student[] | null = null;
  private static _cacheSubmissions: ClassAttendanceSubmission[] | null = null;
  private static _cacheSettings: SchoolSettings | null = null;
  private static _cacheAuditLogs: AuditLog[] | null = null;
  private static _cacheExcuses: AbsenceExcuseRequest[] | null = null;
  private static _cachePeriodAssignments: DayPeriodAssignment[] | null = null;
  private static _cacheNotifications: AttendanceNotification[] | null = null;
  private static _cacheTeacherReminders: Record<string, any> | null = null;
  private static _cacheCurrentUser: User | null = null;
  private static _currentUserLoaded = false;

  // --- Initialization & Local Storage ---
  static initStorage(): void {
    if (this._initialized) return;
    this._initialized = true;

    // Purge legacy mock data if present
    try {
      if (typeof localStorage !== 'undefined') {
        const legacyKeys = [
          'zbt_users_prod_v1',
          'zbt_classes_prod_v1',
          'zbt_students_prod_v1',
          'zbt_submissions_prod_v1',
          'zbt_settings_prod_v1',
          'zbt_logs_prod_v1',
          'zbt_excuses_prod_v1',
          'zbt_current_user_prod_v1',
          'zbt_contacts_prod_v1'
        ];
        legacyKeys.forEach(k => {
          if (localStorage.getItem(k)) {
            localStorage.removeItem(k);
          }
        });
      }
    } catch (e) {}

    // 1. Users (Leadership: Ziyad Al-Otaibi & Mohammed Al-Zamami)
    const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!storedUsers) {
      this._cacheUsers = INITIAL_USERS;
      try { localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS)); } catch (e) {}
    } else {
      try {
        const parsed: User[] = JSON.parse(storedUsers);
        this._cacheUsers = Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_USERS;
      } catch (e) {
        this._cacheUsers = INITIAL_USERS;
        try { localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS)); } catch (err) {}
      }
    }

    // 2. Classes
    const storedClasses = localStorage.getItem(STORAGE_KEYS.CLASSES);
    if (!storedClasses) {
      this._cacheClasses = INITIAL_CLASSES;
      try { localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(INITIAL_CLASSES)); } catch (e) {}
    } else {
      try {
        const parsed: SchoolClass[] = JSON.parse(storedClasses);
        this._cacheClasses = Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CLASSES;
      } catch (e) {
        this._cacheClasses = INITIAL_CLASSES;
        try { localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(INITIAL_CLASSES)); } catch (err) {}
      }
    }

    // 3. Students
    const storedStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!storedStudents) {
      this._cacheStudents = INITIAL_STUDENTS;
      try { localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS)); } catch (e) {}
    } else {
      try {
        const parsed: Student[] = JSON.parse(storedStudents);
        this._cacheStudents = Array.isArray(parsed) ? parsed : INITIAL_STUDENTS;
      } catch (e) {
        this._cacheStudents = INITIAL_STUDENTS;
        try { localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS)); } catch (err) {}
      }
    }

    // Recalculate class student counts in memory
    if (this._cacheClasses && this._cacheStudents) {
      const studentCountMap: Record<string, number> = {};
      this._cacheStudents.forEach(s => {
        if (s.classId) {
          studentCountMap[s.classId] = (studentCountMap[s.classId] || 0) + 1;
        }
      });
      let updated = false;
      this._cacheClasses.forEach(c => {
        const count = studentCountMap[c.id] || 0;
        if (c.studentCount !== count) {
          c.studentCount = count;
          updated = true;
        }
      });
      if (updated) {
        try { localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(this._cacheClasses)); } catch (e) {}
      }
    }

    // Submissions
    if (!localStorage.getItem(STORAGE_KEYS.SUBMISSIONS)) {
      this._cacheSubmissions = INITIAL_SUBMISSIONS;
      try { localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(INITIAL_SUBMISSIONS)); } catch (e) {}
    }
    // Settings
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      this._cacheSettings = INITIAL_SETTINGS;
      try { localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS)); } catch (e) {}
    }
    // Audit Logs
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      this._cacheAuditLogs = INITIAL_AUDIT_LOGS;
      try { localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS)); } catch (e) {}
    }
    // Excuses
    if (!localStorage.getItem(STORAGE_KEYS.EXCUSES)) {
      this._cacheExcuses = INITIAL_EXCUSES;
      try { localStorage.setItem(STORAGE_KEYS.EXCUSES, JSON.stringify(INITIAL_EXCUSES)); } catch (e) {}
    }
    // Period Assignments
    if (!localStorage.getItem(STORAGE_KEYS.PERIOD_ASSIGNMENTS)) {
      this.initDefaultPeriodAssignments();
    }
  }

  // --- Day-by-Day Period 2 Teacher Assignments Engine ---
  static initDefaultPeriodAssignments(): void {
    const classes = this.getClasses();
    const teachers = this.getUsers().filter(u => u.role === 'teacher');
    if (classes.length === 0 || teachers.length === 0) return;

    const assignments: DayPeriodAssignment[] = [];

    // Helper day map
    const days: { key: WeekDayKey; label: string }[] = [
      { key: 'sunday', label: 'الأحد' },
      { key: 'monday', label: 'الإثنين' },
      { key: 'tuesday', label: 'الثلاثاء' },
      { key: 'wednesday', label: 'الأربعاء' },
      { key: 'thursday', label: 'الخميس' }
    ];

    // Build standard weekly assignments for each class across all 5 school days
    classes.forEach((cls, classIndex) => {
      days.forEach((day, dayIndex) => {
        const teacherOffset = (classIndex + dayIndex) % teachers.length;
        const assignedTeacher = teachers[teacherOffset];

        assignments.push({
          id: `assign_${cls.id}_${day.key}`,
          classId: cls.id,
          className: cls.name,
          day: day.key,
          dayArabic: day.label,
          teacherId: assignedTeacher.id,
          teacherName: assignedTeacher.name,
          periodNumber: 2,
          subject: assignedTeacher.subject || 'الحصة الثانية',
          notes: `جدول الحصة الثانية ليوم ${day.label}`
        });
      });
    });

    this._cachePeriodAssignments = assignments;
    try { localStorage.setItem(STORAGE_KEYS.PERIOD_ASSIGNMENTS, JSON.stringify(assignments)); } catch (e) {}
  }

  static getPeriodAssignments(): DayPeriodAssignment[] {
    this.initStorage();
    if (this._cachePeriodAssignments) {
      return this._cachePeriodAssignments;
    }
    const data = localStorage.getItem(STORAGE_KEYS.PERIOD_ASSIGNMENTS);
    if (!data) {
      this.initDefaultPeriodAssignments();
      return this._cachePeriodAssignments || [];
    }
    try {
      this._cachePeriodAssignments = JSON.parse(data);
      return this._cachePeriodAssignments || [];
    } catch {
      return [];
    }
  }

  static savePeriodAssignment(assignment: DayPeriodAssignment, performedBy?: User): void {
    const assignments = [...this.getPeriodAssignments()];
    const index = assignments.findIndex(a => 
      a.id === assignment.id || 
      (a.classId === assignment.classId && a.day === assignment.day && a.periodNumber === assignment.periodNumber)
    );

    if (index >= 0) {
      assignments[index] = { ...assignments[index], ...assignment };
    } else {
      assignments.push(assignment);
    }

    this._cachePeriodAssignments = assignments;
    try { localStorage.setItem(STORAGE_KEYS.PERIOD_ASSIGNMENTS, JSON.stringify(assignments)); } catch (e) {}

    if (performedBy) {
      this.logAudit({
        userId: performedBy.id,
        userName: performedBy.name,
        role: performedBy.role,
        action: 'تحديث جدول إسناد الحصة الثانية',
        details: `تم إسناد فصل (${assignment.className}) ليوم (${assignment.dayArabic}) إلى المعلم: ${assignment.teacherName}`,
        type: 'settings_change'
      });
    }
  }

  static saveAllPeriodAssignments(assignments: DayPeriodAssignment[], performedBy?: User): void {
    this._cachePeriodAssignments = assignments;
    try { localStorage.setItem(STORAGE_KEYS.PERIOD_ASSIGNMENTS, JSON.stringify(assignments)); } catch (e) {}
    if (performedBy) {
      this.logAudit({
        userId: performedBy.id,
        userName: performedBy.name,
        role: performedBy.role,
        action: 'تحديث الجدول الأسبوعي لإسناد الحصة الثانية',
        details: `تم حفظ وتحديث الجدول الأسبوعي الشامل لتوزيع المعلمين على الفصول في الحصة الثانية (${assignments.length} إسناد).`,
        type: 'settings_change'
      });
    }
  }

  /**
   * Returns current day-of-week key: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday'
   * Defaults to 'sunday' if today is weekend (Friday/Saturday) for smooth previewing
   */
  static getCurrentDayKey(): { key: WeekDayKey; label: string } {
    const d = new Date();
    const dayNum = d.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
    switch (dayNum) {
      case 0: return { key: 'sunday', label: 'الأحد' };
      case 1: return { key: 'monday', label: 'الإثنين' };
      case 2: return { key: 'tuesday', label: 'الثلاثاء' };
      case 3: return { key: 'wednesday', label: 'الأربعاء' };
      case 4: return { key: 'thursday', label: 'الخميس' };
      default: return { key: 'sunday', label: 'الأحد (يوم عمل تجريبي)' };
    }
  }

  /**
   * Get the assigned class for a teacher for a specific day (default: current day)
   */
  static getTeacherAssignedClassForDay(teacherId: string, dayKey?: WeekDayKey): SchoolClass | null {
    const currentDay = dayKey || this.getCurrentDayKey().key;
    const assignments = this.getPeriodAssignments();
    const match = assignments.find(a => a.teacherId === teacherId && a.day === currentDay && a.periodNumber === 2);
    
    const classes = this.getClasses();
    if (match) {
      const foundCls = classes.find(c => c.id === match.classId);
      if (foundCls) return foundCls;
    }

    // Fallback: If no day assignment, check static assignedClassId on user profile
    const users = this.getUsers();
    const teacher = users.find(u => u.id === teacherId);
    if (teacher?.assignedClassId) {
      const staticCls = classes.find(c => c.id === teacher.assignedClassId);
      if (staticCls) return staticCls;
    }

    return null;
  }

  /**
   * Get the teacher assigned to a specific class for a specific day
   */
  static getClassAssignedTeacherForDay(classId: string, dayKey?: WeekDayKey): User | null {
    const currentDay = dayKey || this.getCurrentDayKey().key;
    const assignments = this.getPeriodAssignments();
    const match = assignments.find(a => a.classId === classId && a.day === currentDay && a.periodNumber === 2);
    
    const users = this.getUsers();
    if (match) {
      const foundTeacher = users.find(u => u.id === match.teacherId);
      if (foundTeacher) return foundTeacher;
    }

    // Fallback: class default teacherId
    const classes = this.getClasses();
    const cls = classes.find(c => c.id === classId);
    if (cls?.teacherId) {
      const defaultTeacher = users.find(u => u.id === cls.teacherId);
      if (defaultTeacher) return defaultTeacher;
    }

    return null;
  }

  /**
   * Get full weekly schedule for a teacher (all 5 days)
   */
  static getTeacherWeeklySchedule(teacherId: string): { day: WeekDayKey; dayArabic: string; classItem: SchoolClass | null }[] {
    const days = WEEKDAYS_LIST;
    const assignments = this.getPeriodAssignments();
    const classes = this.getClasses();

    return days.map(d => {
      const match = assignments.find(a => a.teacherId === teacherId && a.day === d.key && a.periodNumber === 2);
      const classItem = match ? classes.find(c => c.id === match.classId) || null : null;
      return {
        day: d.key,
        dayArabic: d.label,
        classItem
      };
    });
  }

  // --- Session Inactivity Timeout (30 minutes) ---
  static updateLastActivity(): void {
    try { localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString()); } catch (e) {}
  }

  static getLastActivity(): number {
    const item = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
    return item ? parseInt(item, 10) : Date.now();
  }

  static checkSessionExpired(timeoutMinutes: number = 30): boolean {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;
    const last = this.getLastActivity();
    const now = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;
    return (now - last) > timeoutMs;
  }


  // --- Users & Auth ---
  static getUsers(): User[] {
    this.initStorage();
    if (this._cacheUsers) return this._cacheUsers;
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!data) return INITIAL_USERS;
    try {
      const parsed = JSON.parse(data);
      this._cacheUsers = Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_USERS;
      return this._cacheUsers;
    } catch {
      return INITIAL_USERS;
    }
  }

  static saveUser(user: User, performedBy?: User): void {
    const users = [...this.getUsers()];
    const idx = users.findIndex(u => u.id === user.id);
    const isNew = idx === -1;
    if (isNew) {
      users.push(user);
    } else {
      users[idx] = user;
    }
    this._cacheUsers = users;
    try { localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)); } catch (e) {}

    // If teacher is assigned to a class, sync the class's teacher info
    if (user.assignedClassId) {
      const classes = [...this.getClasses()];
      const targetCls = classes.find(c => c.id === user.assignedClassId);
      if (targetCls) {
        targetCls.teacherId = user.id;
        targetCls.teacherName = user.name;
        this._cacheClasses = classes;
        try { localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes)); } catch (e) {}
      }
    }

    if (performedBy) {
      this.logAudit({
        userId: performedBy.id,
        userName: performedBy.name,
        role: performedBy.role,
        action: isNew ? 'إضافة مستخدم / معلم جديد' : 'تعديل بيانات مستخدم / معلم',
        details: `${isNew ? 'تمت إضافة المعلم' : 'تم تحديث بيانات المعلم'}: ${user.name} (${user.subject || 'بدون تخصص'}) - الفصل المسند: ${user.assignedClassName || 'لا يوجد'}`,
        type: 'settings_change'
      });
    }
  }

  static deleteUser(userId: string, performedBy?: User): void {
    let users = this.getUsers().filter(u => u.id !== userId);
    const target = this.getUsers().find(u => u.id === userId);
    this._cacheUsers = users;
    try { localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)); } catch (e) {}

    // If teacher was assigned to class, clear assignment
    if (target?.assignedClassId) {
      const classes = [...this.getClasses()];
      const cls = classes.find(c => c.id === target.assignedClassId);
      if (cls && cls.teacherId === userId) {
        cls.teacherId = '';
        cls.teacherName = 'لم يُحدد مربي الفصل';
        this._cacheClasses = classes;
        try { localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes)); } catch (e) {}
      }
    }

    if (performedBy && target) {
      this.logAudit({
        userId: performedBy.id,
        userName: performedBy.name,
        role: performedBy.role,
        action: 'حذف مستخدم / معلم',
        details: `تم حذف المعلم/المستخدم: ${target.name} من النظام`,
        type: 'settings_change'
      });
    }
  }

  static getCurrentUser(): User | null {
    if (this._currentUserLoaded) return this._cacheCurrentUser;
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    this._currentUserLoaded = true;
    if (data) {
      try {
        this._cacheCurrentUser = JSON.parse(data);
        return this._cacheCurrentUser;
      } catch (e) {
        this._cacheCurrentUser = null;
        return null;
      }
    }
    this._cacheCurrentUser = null;
    return null;
  }

  static setCurrentUser(user: User | null): void {
    this._cacheCurrentUser = user;
    this._currentUserLoaded = true;
    if (user) {
      try { localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user)); } catch (e) {}
      this.logAudit({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'تسجيل دخول للنظام',
        details: `تسجيل الدخول بدور: ${user.role === 'admin' ? 'مدير المدرسة' : `معلم (${user.assignedClassName || 'بدون فصل'})`}`,
        type: 'login'
      });
    } else {
      try { localStorage.removeItem(STORAGE_KEYS.CURRENT_USER); } catch (e) {}
    }
  }

  // --- Classes & Students ---
  static getClasses(): SchoolClass[] {
    this.initStorage();
    if (this._cacheClasses) return this._cacheClasses;
    const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
    if (!data) return INITIAL_CLASSES;
    try {
      const parsed = JSON.parse(data);
      this._cacheClasses = Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CLASSES;
      return this._cacheClasses;
    } catch {
      return INITIAL_CLASSES;
    }
  }

  static saveClass(schoolClass: SchoolClass, performedBy?: User): void {
    const classes = [...this.getClasses()];
    const idx = classes.findIndex(c => c.id === schoolClass.id);
    const isNew = idx === -1;
    
    // Automatically calculate actual student count
    const students = this.getStudents();
    schoolClass.studentCount = students.filter(s => s.classId === schoolClass.id).length;

    if (isNew) {
      classes.push(schoolClass);
    } else {
      classes[idx] = schoolClass;
    }
    this._cacheClasses = classes;
    try { localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes)); } catch (e) {}

    // Sync teacher's assigned class if assigned
    if (schoolClass.teacherId) {
      const users = [...this.getUsers()];
      const teacher = users.find(u => u.id === schoolClass.teacherId);
      if (teacher) {
        teacher.assignedClassId = schoolClass.id;
        teacher.assignedClassName = `${schoolClass.gradeLevel} (${schoolClass.section})`;
        this._cacheUsers = users;
        try { localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)); } catch (e) {}
      }
    }

    if (performedBy) {
      this.logAudit({
        userId: performedBy.id,
        userName: performedBy.name,
        role: performedBy.role,
        action: isNew ? 'إضافة شعبة / فصل جديد' : 'تعديل بيانات الشعبة',
        details: `${isNew ? 'تمت إضافة الشعبة' : 'تم تعديل الشعبة'}: ${schoolClass.name} - مربي الفصل: ${schoolClass.teacherName} (${schoolClass.roomNumber})`,
        targetClass: schoolClass.name,
        type: 'settings_change'
      });
    }
  }

  static deleteClass(classId: string, performedBy?: User): void {
    let classes = this.getClasses().filter(c => c.id !== classId);
    const target = this.getClasses().find(c => c.id === classId);
    this._cacheClasses = classes;
    try { localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes)); } catch (e) {}

    if (performedBy && target) {
      this.logAudit({
        userId: performedBy.id,
        userName: performedBy.name,
        role: performedBy.role,
        action: 'حذف شعبة / فصل',
        details: `تم حذف الشعبة: ${target.name} من النظام`,
        targetClass: target.name,
        type: 'settings_change'
      });
    }
  }

  static recalculateAllClassCounts(): void {
    const classes = [...this.getClasses()];
    const students = this.getStudents();
    const countMap: Record<string, number> = {};
    students.forEach(s => {
      if (s.classId) countMap[s.classId] = (countMap[s.classId] || 0) + 1;
    });
    classes.forEach(c => {
      c.studentCount = countMap[c.id] || 0;
    });
    this._cacheClasses = classes;
    try { localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes)); } catch (e) {}
  }

  static getStudents(classId?: string): Student[] {
    this.initStorage();
    let list = this._cacheStudents;
    if (!list) {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            list = parsed;
          }
        } catch {
          list = INITIAL_STUDENTS;
        }
      }
      if (!list) list = INITIAL_STUDENTS;
      this._cacheStudents = list;
    }
    if (classId) {
      return list.filter(s => s.classId === classId);
    }
    return list;
  }

  static saveStudent(student: Student, performedBy?: User): void {
    const students = [...this.getStudents()];
    const idx = students.findIndex(s => s.id === student.id);
    const isNew = idx === -1;
    if (isNew) {
      students.push(student);
    } else {
      students[idx] = student;
    }
    this._cacheStudents = students;
    try { localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students)); } catch (e) {}
    
    // Recalculate class counts
    this.recalculateAllClassCounts();

    if (performedBy) {
      this.logAudit({
        userId: performedBy.id,
        userName: performedBy.name,
        role: performedBy.role,
        action: isNew ? 'إضافة طالب جديد' : 'تعديل بيانات طالب',
        details: `${isNew ? 'تمت إضافة الطالب' : 'تم تعديل بيانات الطالب'}: ${student.name} - ${student.className} (هوية: ${student.nationalId || student.studentNumber})`,
        targetClass: student.className,
        type: 'settings_change'
      });
    }
  }

  static transferStudent(studentId: string, targetClassId: string, performedBy?: User): Student | null {
    const students = [...this.getStudents()];
    const student = students.find(s => s.id === studentId);
    if (!student) return null;

    const classes = this.getClasses();
    const targetClass = classes.find(c => c.id === targetClassId);
    if (!targetClass) return null;

    const oldClassName = student.className;
    student.classId = targetClass.id;
    student.className = targetClass.shortName;
    student.gradeLevel = targetClass.gradeLevel;

    this._cacheStudents = students;
    try { localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students)); } catch (e) {}
    this.recalculateAllClassCounts();

    if (performedBy) {
      this.logAudit({
        userId: performedBy.id,
        userName: performedBy.name,
        role: performedBy.role,
        action: 'نقل طالب بين الشعب',
        details: `تم نقل الطالب: ${student.name} من شعبة (${oldClassName}) إلى شعبة (${targetClass.shortName})`,
        targetClass: targetClass.name,
        type: 'settings_change'
      });
    }

    return student;
  }

  static deleteStudent(studentId: string, performedBy?: User): void {
    let students = this.getStudents().filter(s => s.id !== studentId);
    const student = this.getStudents().find(s => s.id === studentId);
    this._cacheStudents = students;
    try { localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students)); } catch (e) {}

    this.recalculateAllClassCounts();

    if (performedBy && student) {
      this.logAudit({
        userId: performedBy.id,
        userName: performedBy.name,
        role: performedBy.role,
        action: 'حذف طالب من السجلات',
        details: `تم حذف الطالب: ${student.name} (${student.className}) من النظام`,
        targetClass: student.className,
        type: 'settings_change'
      });
    }
  }

  // --- Batch Import & Distribution ---
  static createDefaultElementaryClasses(performedBy?: User): SchoolClass[] {
    const grades = [
      { num: 1, name: 'الصف الأول الابتدائي', short: 'أول' },
      { num: 2, name: 'الصف الثاني الابتدائي', short: 'ثاني' },
      { num: 3, name: 'الصف الثالث الابتدائي', short: 'ثالث' },
      { num: 4, name: 'الصف الرابع الابتدائي', short: 'رابع' },
      { num: 5, name: 'الصف الخامس الابتدائي', short: 'خامس' },
      { num: 6, name: 'الصف السادس الابتدائي', short: 'سادس' }
    ];
    const sections = [
      { key: '1', name: 'أ', label: '1' },
      { key: '2', name: 'ب', label: '2' }
    ];
    const colors = ['#059669', '#2563eb', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#4f46e5', '#ca8a04', '#0d9488', '#ea580c', '#e11d48', '#475569'];
    
    const existingClasses = this.getClasses();
    const teachers = this.getUsers().filter(u => u.role === 'teacher');
    let colorIdx = 0;
    let teacherIdx = 0;
    const generated: SchoolClass[] = [...existingClasses];

    grades.forEach(grade => {
      sections.forEach(sec => {
        const classId = `c_${grade.num}_${sec.key}`;
        if (!generated.some(c => c.id === classId)) {
          const assignedTeacher = teachers[teacherIdx % Math.max(1, teachers.length)];
          teacherIdx++;
          const newCls: SchoolClass = {
            id: classId,
            name: `${grade.name} (${sec.name})`,
            shortName: `${grade.short} ${sec.label}`,
            gradeLevel: grade.name,
            section: sec.name,
            roomNumber: `قاعة ${grade.num}0${sec.key}`,
            teacherId: assignedTeacher ? assignedTeacher.id : '',
            teacherName: assignedTeacher ? assignedTeacher.name : 'غير محدد',
            studentCount: 0,
            color: colors[colorIdx % colors.length]
          };
          colorIdx++;
          generated.push(newCls);

          if (assignedTeacher) {
            assignedTeacher.assignedClassId = newCls.id;
            assignedTeacher.assignedClassName = `${newCls.gradeLevel} (${newCls.section})`;
          }
        }
      });
    });

    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(generated));
    const allUsers = this.getUsers();
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));

    if (performedBy) {
      this.logAudit({
        userId: performedBy.id,
        userName: performedBy.name,
        role: performedBy.role,
        action: 'توليد فصول المدرسة الابتدائية',
        details: `تم إنشاء وتجهيز ${generated.length} فصول وشعب دراسية للمدرسة وتوزيع المعلمين عليها`,
        type: 'settings_change'
      });
    }

    return generated;
  }

  static saveStudentsBatch(
    newStudents: Student[], 
    mode: 'merge' | 'replace' | 'skip_duplicates' = 'merge', 
    performedBy?: User
  ): { added: number; updated: number; skipped: number; total: number } {
    let currentStudents = mode === 'replace' ? [] : this.getStudents();
    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const student of newStudents) {
      if (!student.name || student.name.trim() === '') continue;

      const existingIdx = currentStudents.findIndex(s => 
        (student.nationalId && s.nationalId === student.nationalId) ||
        (student.studentNumber && s.studentNumber === student.studentNumber) ||
        (s.name.trim().toLowerCase() === student.name.trim().toLowerCase() && s.classId === student.classId)
      );

      if (existingIdx !== -1) {
        if (mode === 'skip_duplicates') {
          skipped++;
        } else {
          // Merge / Update
          currentStudents[existingIdx] = {
            ...currentStudents[existingIdx],
            ...student,
            id: currentStudents[existingIdx].id // Keep existing ID
          };
          updated++;
        }
      } else {
        currentStudents.push(student);
        added++;
      }
    }

    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(currentStudents));
    this.recalculateAllClassCounts();

    if (performedBy) {
      this.logAudit({
        userId: performedBy.id,
        userName: performedBy.name,
        role: performedBy.role,
        action: 'استيراد قائمة طلاب وتوزيعهم',
        details: `تم استيراد قائمة الطلاب بنجاح: إضافة ${added} جديد، تحديث ${updated}، وتخطي ${skipped} مكرر (إجمالي المسجلين: ${currentStudents.length})`,
        type: 'settings_change'
      });
    }

    return { added, updated, skipped, total: currentStudents.length };
  }

  // --- Submissions ---
  static getSubmissions(date?: string): ClassAttendanceSubmission[] {
    this.initStorage();
    let list = this._cacheSubmissions;
    if (!list) {
      const data = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            list = parsed;
          }
        } catch {
          list = INITIAL_SUBMISSIONS;
        }
      }
      if (!list) list = INITIAL_SUBMISSIONS;
      this._cacheSubmissions = list;
    }
    if (date) {
      return list.filter(s => s.date === date);
    }
    return list;
  }

  static getTodaySubmissionForClass(classId: string, date: string = getTodayDateString()): ClassAttendanceSubmission | undefined {
    const subs = this.getSubmissions(date);
    return subs.find(s => s.classId === classId);
  }

  static saveAttendanceSubmission(submission: ClassAttendanceSubmission, user: User): void {
    const subs = [...this.getSubmissions()];
    const existingIdx = subs.findIndex(s => s.classId === submission.classId && s.date === submission.date);
    
    if (existingIdx > -1) {
      subs[existingIdx] = {
        ...submission,
        updatedAt: new Date().toISOString()
      };
      this.logAudit({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'تعديل كشف الحضور',
        details: `تم تحديث كشف حضور ${submission.className} بتاريخ ${submission.date}. الحضور: ${submission.presentCount}، الغياب: ${submission.absentCount}`,
        targetClass: submission.className,
        type: 'attendance_edit'
      });
    } else {
      subs.unshift(submission);
      this.logAudit({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'رفع غياب الحصة الثانية',
        details: `تم تسجيل كشف ${submission.className} للحصة الثانية بتاريخ ${submission.date}. الحضور: ${submission.presentCount}، الغياب: ${submission.absentCount}`,
        targetClass: submission.className,
        type: 'attendance_submit'
      });
    }
    this._cacheSubmissions = subs;
    try { localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(subs)); } catch (e) {}

    // Create and dispatch real-time Toast Notification for Admin
    const absentStudents: AbsentStudentDetail[] = (submission.students || [])
      .filter(st => st.status === 'absent' || st.status === 'excused' || st.status === 'late')
      .map(st => ({
        studentId: st.studentId,
        studentName: st.studentName,
        status: st.status as 'absent' | 'excused' | 'late',
        reason: st.reason,
        isExcused: st.status === 'excused',
        notes: st.notes,
        minutesLate: st.minutesLate
      }));

    const notification: AttendanceNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      submissionId: submission.id,
      timestamp: new Date().toISOString(),
      date: submission.date,
      classId: submission.classId,
      className: submission.className,
      gradeLevel: submission.gradeLevel,
      teacherId: user.id,
      teacherName: user.name,
      periodNumber: submission.periodNumber || 2,
      presentCount: submission.presentCount,
      absentCount: submission.absentCount,
      excusedCount: submission.excusedCount,
      lateCount: submission.lateCount,
      totalStudents: submission.totalStudents,
      absentStudents,
      read: false
    };

    this.saveNotification(notification);
  }

  // --- Notifications Management ---
  static getNotifications(): AttendanceNotification[] {
    this.initStorage();
    if (this._cacheNotifications) return this._cacheNotifications;
    const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!data) return [];
    try {
      this._cacheNotifications = JSON.parse(data);
      return this._cacheNotifications || [];
    } catch {
      return [];
    }
  }

  static saveNotification(notification: AttendanceNotification): void {
    const list = [...this.getNotifications()];
    list.unshift(notification);
    const trimmed = list.slice(0, 50);
    this._cacheNotifications = trimmed;
    try { localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(trimmed)); } catch (e) {}

    // Dispatch DOM event for instant React reactive toast popup across components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, {
        detail: notification
      }));
    }
  }

  static markNotificationAsRead(id: string): void {
    const list = [...this.getNotifications()];
    const item = list.find(n => n.id === id);
    if (item) {
      item.read = true;
      this._cacheNotifications = list;
      try { localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list)); } catch (e) {}
    }
  }

  static markAllNotificationsAsRead(): void {
    const list = [...this.getNotifications()];
    list.forEach(n => { n.read = true; });
    this._cacheNotifications = list;
    try { localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list)); } catch (e) {}
  }

  static clearNotifications(): void {
    this._cacheNotifications = [];
    try { localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS); } catch (e) {}
  }

  // --- Teacher Reminders & Alert Broadcast ---
  static getTeacherReminders(): Record<string, { timestamp: string; teacherName: string; className: string; channel: 'whatsapp' | 'system' | 'broadcast' }> {
    this.initStorage();
    if (this._cacheTeacherReminders) return this._cacheTeacherReminders;
    const data = localStorage.getItem(STORAGE_KEYS.TEACHER_REMINDERS);
    if (!data) return {};
    try {
      this._cacheTeacherReminders = JSON.parse(data);
      return this._cacheTeacherReminders || {};
    } catch {
      return {};
    }
  }

  static isTeacherRemindedToday(classId: string): boolean {
    const reminders = this.getTeacherReminders();
    const item = reminders[classId];
    if (!item) return false;
    const today = getTodayDateString();
    return item.timestamp.startsWith(today);
  }

  static sendTeacherReminder(
    classId: string, 
    teacherName: string, 
    className: string, 
    channel: 'whatsapp' | 'system' | 'broadcast' = 'system',
    performedBy?: User
  ): void {
    const reminders = { ...this.getTeacherReminders() };
    reminders[classId] = {
      timestamp: new Date().toISOString(),
      teacherName,
      className,
      channel
    };
    this._cacheTeacherReminders = reminders;
    try { localStorage.setItem(STORAGE_KEYS.TEACHER_REMINDERS, JSON.stringify(reminders)); } catch (e) {}

    if (performedBy) {
      this.logAudit({
        userId: performedBy.id,
        userName: performedBy.name,
        role: performedBy.role,
        action: `إرسال تذكير (${channel === 'whatsapp' ? 'واتساب' : 'تنبيه فوري'}) للمعلم`,
        details: `تم إرسال تذكير لرصد غياب الحصة الثانية للأستاذ: ${teacherName} (${className}) عبر ${channel === 'whatsapp' ? 'رابط الواتساب' : 'إشعار النظام الفوري'}`,
        targetClass: className,
        type: 'sms_sent'
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TEACHER_REMINDER_EVENT, {
        detail: { classId, teacherName, className, channel }
      }));
    }
  }

  static sendBroadcastTeacherReminders(
    pendingClasses: { id: string; name: string; teacherName: string; teacherId: string }[],
    performedBy?: User
  ): void {
    const reminders = { ...this.getTeacherReminders() };
    const nowIso = new Date().toISOString();
    
    pendingClasses.forEach(c => {
      reminders[c.id] = {
        timestamp: nowIso,
        teacherName: c.teacherName,
        className: c.name,
        channel: 'broadcast'
      };
    });
    this._cacheTeacherReminders = reminders;
    try { localStorage.setItem(STORAGE_KEYS.TEACHER_REMINDERS, JSON.stringify(reminders)); } catch (e) {}

    if (performedBy) {
      this.logAudit({
        userId: performedBy.id,
        userName: performedBy.name,
        role: performedBy.role,
        action: 'تنبيه جماعي لجميع المعلمين المتأخرين',
        details: `تم إرسال تذكير جماعي عاجل إلى (${pendingClasses.length}) معلمين لاستكمال رصد الحصة الثانية`,
        type: 'sms_sent'
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(TEACHER_REMINDER_EVENT, {
        detail: { count: pendingClasses.length, broadcast: true }
      }));
    }
  }

  // Test submission generator for linked database models
  static simulateTeacherSubmission(targetClassId?: string): AttendanceNotification {
    const classes = this.getClasses();
    if (classes.length === 0) {
      throw new Error('لا توجد فصول دراسية مسجلة في قاعدة البيانات حالياً');
    }
    const users = this.getUsers().filter(u => u.role === 'teacher');
    
    // Pick class or default
    const cls = targetClassId ? classes.find(c => c.id === targetClassId) || classes[0] : classes[Math.floor(Math.random() * classes.length)];
    const teacher = users.find(u => u.assignedClassId === cls.id || u.id === cls.teacherId) || users[0] || { 
      id: cls.teacherId || 'teacher-default', 
      name: cls.teacherName || 'مربي الفصل', 
      role: 'teacher' as const, 
      username: 'teacher' 
    };
    const classStudents = this.getStudents(cls.id);

    // Pick 1-2 absent, 1 excused, 1 late for rich demo
    const shuffled = [...classStudents].sort(() => 0.5 - Math.random());
    const absentStudent1 = shuffled[0];
    const absentStudent2 = shuffled[1];
    const excusedStudent = shuffled[2];
    const lateStudent = shuffled[3];

    const studentItems: StudentAttendanceItem[] = classStudents.map((st, idx) => {
      if (absentStudent1 && st.id === absentStudent1.id) {
        return {
          studentId: st.id,
          studentName: st.name,
          status: 'absent',
          reason: 'بدون عذر مسبق',
          notes: 'تم التواصل مع ولي الأمر ولم يرد'
        };
      }
      if (absentStudent2 && st.id === absentStudent2.id && classStudents.length > 5) {
        return {
          studentId: st.id,
          studentName: st.name,
          status: 'absent',
          reason: 'غياب غير مبرر'
        };
      }
      if (excusedStudent && st.id === excusedStudent.id) {
        return {
          studentId: st.id,
          studentName: st.name,
          status: 'excused',
          reason: 'إجازة مرضية معتمدة من المركز الصحي',
          notes: 'التقرير الطبي مرفق في المنصة'
        };
      }
      if (lateStudent && st.id === lateStudent.id) {
        return {
          studentId: st.id,
          studentName: st.name,
          status: 'late',
          minutesLate: 15,
          reason: 'ازدحام مروري',
          notes: 'حضر في منتصف الحصة'
        };
      }
      return {
        studentId: st.id,
        studentName: st.name,
        status: 'present'
      };
    });

    const presentCount = studentItems.filter(s => s.status === 'present').length;
    const absentCount = studentItems.filter(s => s.status === 'absent').length;
    const excusedCount = studentItems.filter(s => s.status === 'excused').length;
    const lateCount = studentItems.filter(s => s.status === 'late').length;

    const submission: ClassAttendanceSubmission = {
      id: `sub-${getTodayDateString()}-${cls.id}-${Date.now()}`,
      date: getTodayDateString(),
      classId: cls.id,
      className: cls.name,
      gradeLevel: cls.gradeLevel,
      teacherId: teacher.id,
      teacherName: cls.teacherName || teacher.name,
      periodNumber: 2,
      submittedAt: new Date().toISOString(),
      totalStudents: classStudents.length,
      presentCount,
      absentCount,
      excusedCount,
      lateCount,
      students: studentItems
    };

    // Save & Trigger
    this.saveAttendanceSubmission(submission, teacher as User);
    
    // Return latest generated notification
    const latestNotif = this.getNotifications()[0];
    return latestNotif;
  }

  // Reset today's submissions for clean testing
  static resetTodaySubmissions(date: string = getTodayDateString()): void {
    const subs = this.getSubmissions();
    const filtered = subs.filter(s => s.date !== date);
    this._cacheSubmissions = filtered;
    try { localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(filtered)); } catch (e) {}

    // Clear today's teacher reminders
    this._cacheTeacherReminders = {};
    try { localStorage.removeItem(STORAGE_KEYS.TEACHER_REMINDERS); } catch (e) {}

    this.logAudit({
      userId: 'admin-1',
      userName: 'إدارة المدرسة',
      role: 'admin',
      action: 'إعادة تعيين رصد اليوم (تصفير)',
      details: `تمت إعادة تعيين وتصفير كشوفات غياب اليوم (${date}) لتمكين إعادة المحاكاة والاختبار`,
      type: 'settings_change'
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENT, {
        detail: { type: 'reset_today', date }
      }));
    }
  }

  // Batch simulation for multiple pending teachers
  static simulateAllPendingTeachers(
    date: string = getTodayDateString(),
    onStep?: (className: string, teacherName: string, count: number) => void
  ): number {
    const classes = this.getClasses();
    const todaySubs = this.getSubmissions(date);
    const pendingClasses = classes.filter(c => !todaySubs.some(s => s.classId === c.id));
    
    pendingClasses.forEach((cls, idx) => {
      this.simulateTeacherSubmission(cls.id);
      if (onStep) {
        onStep(cls.name, cls.teacherName, idx + 1);
      }
    });

    return pendingClasses.length;
  }


  // --- Settings ---
  static getSettings(): SchoolSettings {
    this.initStorage();
    if (this._cacheSettings) return this._cacheSettings;
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) return INITIAL_SETTINGS;
    try {
      const parsed = JSON.parse(data);
      this._cacheSettings = parsed && typeof parsed === 'object' ? parsed : INITIAL_SETTINGS;
      return this._cacheSettings;
    } catch {
      return INITIAL_SETTINGS;
    }
  }

  static saveSettings(settings: SchoolSettings, user: User): void {
    this._cacheSettings = settings;
    try { localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings)); } catch (e) {}
    this.logAudit({
      userId: user.id,
      userName: user.name,
      role: user.role,
      action: 'تحديث إعدادات النظام',
      details: 'تم حفظ وتحديث إعدادات المدرسة ومواعيد الحصة الثانية وقوالب الرسائل',
      type: 'settings_change'
    });
  }

  // --- Audit Logs ---
  static getAuditLogs(): AuditLog[] {
    this.initStorage();
    if (this._cacheAuditLogs) return this._cacheAuditLogs;
    const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (!data) return INITIAL_AUDIT_LOGS;
    try {
      const parsed = JSON.parse(data);
      this._cacheAuditLogs = Array.isArray(parsed) ? parsed : INITIAL_AUDIT_LOGS;
      return this._cacheAuditLogs;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  }

  static logAudit(log: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const logs = [...this.getAuditLogs()];
    const newEntry: AuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newEntry);
    const trimmed = logs.slice(0, 100);
    this._cacheAuditLogs = trimmed;
    try { localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(trimmed)); } catch (e) {}
  }

  // --- Excuses ---
  static getExcuses(): AbsenceExcuseRequest[] {
    this.initStorage();
    if (this._cacheExcuses) return this._cacheExcuses;
    const data = localStorage.getItem(STORAGE_KEYS.EXCUSES);
    if (!data) return INITIAL_EXCUSES;
    try {
      const parsed = JSON.parse(data);
      this._cacheExcuses = Array.isArray(parsed) ? parsed : INITIAL_EXCUSES;
      return this._cacheExcuses;
    } catch {
      return INITIAL_EXCUSES;
    }
  }

  static saveExcuse(excuse: AbsenceExcuseRequest): void {
    const excuses = [...this.getExcuses()];
    const idx = excuses.findIndex(e => e.id === excuse.id);
    if (idx > -1) {
      excuses[idx] = excuse;
    } else {
      excuses.unshift(excuse);
    }
    this._cacheExcuses = excuses;
    try { localStorage.setItem(STORAGE_KEYS.EXCUSES, JSON.stringify(excuses)); } catch (e) {}
  }

  // --- Periods & Time Check Logic ---
  static getPeriods(): PeriodSchedule[] {
    return INITIAL_PERIODS;
  }

  // Check if current time is within Period 2 (الحصة الثانية)
  static isPeriod2Active(settings: SchoolSettings, simulatedTime?: string): {
    isActive: boolean;
    currentPeriodName: string;
    period2Start: string;
    period2End: string;
    currentTimeStr: string;
    minutesRemaining?: number;
  } {
    let now = new Date();
    if (simulatedTime) {
      const [hours, minutes] = simulatedTime.split(':').map(Number);
      now.setHours(hours, minutes, 0, 0);
    }

    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMins = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMins}`;

    const [startH, startM] = settings.period2StartTime.split(':').map(Number);
    const [endH, endM] = settings.period2EndTime.split(':').map(Number);

    const currentTotalMins = now.getHours() * 60 + now.getMinutes();
    const startTotalMins = startH * 60 + startM;
    const endTotalMins = endH * 60 + endM;

    const isActive = currentTotalMins >= startTotalMins && currentTotalMins <= endTotalMins;
    const minutesRemaining = isActive ? (endTotalMins - currentTotalMins) : 0;

    let currentPeriodName = 'خارج أوقات الدوام';
    for (const p of INITIAL_PERIODS) {
      const [pH1, pM1] = p.startTime.split(':').map(Number);
      const [pH2, pM2] = p.endTime.split(':').map(Number);
      const pStart = pH1 * 60 + pM1;
      const pEnd = pH2 * 60 + pM2;
      if (currentTotalMins >= pStart && currentTotalMins <= pEnd) {
        currentPeriodName = p.name;
        break;
      }
    }

    return {
      isActive,
      currentPeriodName,
      period2Start: settings.period2StartTime,
      period2End: settings.period2EndTime,
      currentTimeStr,
      minutesRemaining
    };
  }

  // --- Teacher Session Data Validation ---
  static validateTeacherSessionData(user: User): TeacherSessionValidation {
    this.initStorage();
    const settings = this.getSettings();
    const classes = this.getClasses();
    const periodInfo = this.isPeriod2Active(settings);

    const issues: string[] = [];
    const warnings: string[] = [];

    // If admin, data is verified globally
    if (user.role !== 'teacher') {
      return {
        isValid: true,
        hasAssignedClass: true,
        classExists: true,
        className: 'إدارة المدرسة (لوحة التحكم المركزية)',
        studentCount: this.getStudents().length,
        isRosterEmpty: false,
        issues: [],
        warnings: [],
        details: {
          periodName: periodInfo.currentPeriodName,
          periodTime: `${settings.period2StartTime} - ${settings.period2EndTime}`
        }
      };
    }

    // 1. Check assigned class ID on user
    const hasAssignedClass = !!user.assignedClassId;
    if (!hasAssignedClass) {
      issues.push('لم يتم إسناد أي فصل دراسي لحساب هذا المعلم. يُرجى مراجعة إدارة المدرسة لإسناد الفصل.');
    }

    // 2. Find target class object
    const targetClass = hasAssignedClass ? classes.find(c => c.id === user.assignedClassId) : undefined;
    const classExists = !!targetClass;
    if (hasAssignedClass && !classExists) {
      issues.push(`الفصل الدراسي المسند (${user.assignedClassId}) غير متوفر في سجل الفصول الحالي.`);
    }

    // 3. Check student roster for this class
    const classStudents = targetClass ? this.getStudents(targetClass.id) : [];
    const studentCount = classStudents.length;
    const isRosterEmpty = studentCount === 0;

    if (classExists && isRosterEmpty) {
      issues.push(`قائمة طلاب ${targetClass?.name || 'الفصل'} فارغة تماماً (0 طالب). لم يتم العثور على أي طالب مسجل في هذا الفصل.`);
    }

    // 4. Check total school student directory
    const totalStudents = this.getStudents().length;
    if (totalStudents === 0) {
      issues.push('قاعدة بيانات طلاب المدرسة فارغة بالكامل (0 طالب).');
    }

    // 5. Non-blocking warning: Period 2 window
    if (!periodInfo.isActive) {
      warnings.push(`الوقت الحالي (${periodInfo.currentTimeStr}) خارج نافذة رصد الحصة الثانية المعتمدة (${settings.period2StartTime} - ${settings.period2EndTime}).`);
    }

    const isValid = issues.length === 0;

    return {
      isValid,
      hasAssignedClass,
      classExists,
      className: targetClass?.name || user.assignedClassName || 'شعبة غير محددة',
      studentCount,
      isRosterEmpty,
      issues,
      warnings,
      details: {
        gradeLevel: targetClass?.gradeLevel,
        section: targetClass?.section,
        roomNumber: targetClass?.roomNumber,
        periodName: periodInfo.currentPeriodName,
        periodTime: `${settings.period2StartTime} - ${settings.period2EndTime}`
      }
    };
  }

  // --- Analytics & Aggregates ---
  static getTodaySchoolStats(date: string = getTodayDateString()) {
    const classes = this.getClasses();
    const submissions = this.getSubmissions(date);
    const allStudents = this.getStudents();
    const totalStudents = allStudents.length;

    let submittedCount = 0;
    let pendingCount = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    const classStatuses = classes.map(cls => {
      const sub = submissions.find(s => s.classId === cls.id);
      if (sub) {
        submittedCount++;
        presentCount += sub.presentCount;
        absentCount += sub.absentCount;
        lateCount += sub.lateCount;
        excusedCount += sub.excusedCount;
        return {
          ...cls,
          isSubmitted: true,
          submission: sub
        };
      } else {
        pendingCount++;
        return {
          ...cls,
          isSubmitted: false,
          submission: undefined
        };
      }
    });

    const completionRate = classes.length > 0 ? Math.round((submittedCount / classes.length) * 100) : 0;
    const attendanceRate = (presentCount + absentCount) > 0 ? Math.round((presentCount / (presentCount + absentCount)) * 100) : 0;

    return {
      totalClasses: classes.length,
      submittedCount,
      pendingCount,
      completionRate,
      totalStudents,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      attendanceRate,
      classStatuses
    };
  }

  // Get detailed absences and tardiness records for a specific date
  static getDetailedAbsences(date: string = getTodayDateString()): {
    studentId: string;
    studentName: string;
    className: string;
    gradeLevel?: string;
    status: 'absent' | 'excused' | 'late';
    reason?: string;
    notes?: string;
    contactedParent?: boolean;
    minutesLate?: number;
  }[] {
    const subs = this.getSubmissions(date);
    const results: {
      studentId: string;
      studentName: string;
      className: string;
      gradeLevel?: string;
      status: 'absent' | 'excused' | 'late';
      reason?: string;
      notes?: string;
      contactedParent?: boolean;
      minutesLate?: number;
    }[] = [];

    subs.forEach(sub => {
      sub.students.forEach(st => {
        if (st.status !== 'present') {
          results.push({
            studentId: st.studentId,
            studentName: st.studentName,
            className: sub.className,
            gradeLevel: sub.gradeLevel,
            status: st.status as 'absent' | 'excused' | 'late',
            reason: st.reason,
            notes: st.notes,
            contactedParent: st.contactedParent,
            minutesLate: st.minutesLate
          });
        }
      });
    });

    return results;
  }

  // Calculate Student History
  static getStudentHistory(studentId: string) {
    const submissions = this.getSubmissions();
    const history: {
      date: string;
      status: 'present' | 'absent' | 'late' | 'excused';
      reason?: string;
      notes?: string;
      teacherName: string;
      className: string;
    }[] = [];

    submissions.forEach(sub => {
      const rec = sub.students.find(s => s.studentId === studentId);
      if (rec) {
        history.push({
          date: sub.date,
          status: rec.status,
          reason: rec.reason,
          notes: rec.notes,
          teacherName: sub.teacherName,
          className: sub.className
        });
      }
    });

    const totalDays = history.length;
    const absentDays = history.filter(h => h.status === 'absent').length;
    const excusedDays = history.filter(h => h.status === 'excused').length;
    const lateDays = history.filter(h => h.status === 'late').length;
    const presentDays = history.filter(h => h.status === 'present').length;
    const attendancePercentage = totalDays > 0 ? Math.round(((presentDays + lateDays) / totalDays) * 100) : 100;

    return {
      history: history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      totalDays,
      presentDays,
      absentDays,
      excusedDays,
      lateDays,
      attendancePercentage,
      isChronicAbsentee: (absentDays + excusedDays) >= 3
    };
  }

  // --- Monthly Report Analytics & Generation ---
  static getMonthlyReportData(yearMonth: string = new Date().toISOString().substring(0, 7)): MonthlyReportData {
    const settings = this.getSettings();
    const allStudents = this.getStudents();
    const classes = this.getClasses();
    const allSubmissions = this.getSubmissions();
    
    // Filter submissions for this month (e.g. "2026-08")
    const monthSubmissions = allSubmissions.filter(s => s.date.startsWith(yearMonth));

    // Unique dates recorded this month
    const uniqueDates = Array.from(new Set(monthSubmissions.map(s => s.date))).sort();

    // Arabic Month Formatting
    const [yearStr, monthStr] = yearMonth.split('-');
    const dateObj = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
    const monthName = dateObj.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });

    let totalPresentCount = 0;
    let totalUnexcusedAbsentCount = 0;
    let totalExcusedAbsentCount = 0;
    let totalLateCount = 0;

    // Build Class Summaries
    const classesSummary: MonthlyClassReportItem[] = classes.map(cls => {
      const clsSubs = monthSubmissions.filter(s => s.classId === cls.id);
      const totalSessions = clsSubs.length;
      let totalPresent = 0;
      let totalAbsentUnexcused = 0;
      let totalAbsentExcused = 0;
      let totalLate = 0;

      clsSubs.forEach(sub => {
        totalPresent += sub.presentCount;
        totalAbsentUnexcused += sub.absentCount;
        totalAbsentExcused += sub.excusedCount;
        totalLate += sub.lateCount;
      });

      totalPresentCount += totalPresent;
      totalUnexcusedAbsentCount += totalAbsentUnexcused;
      totalExcusedAbsentCount += totalAbsentExcused;
      totalLateCount += totalLate;

      const totalRecorded = totalPresent + totalAbsentUnexcused + totalAbsentExcused;
      const attendanceRate = totalRecorded > 0 ? Math.round((totalPresent / totalRecorded) * 100) : 100;

      return {
        classId: cls.id,
        className: cls.name,
        gradeLevel: cls.gradeLevel,
        teacherName: cls.teacherName,
        studentCount: cls.studentCount,
        totalSessions,
        totalPresent,
        totalAbsentUnexcused,
        totalAbsentExcused,
        totalLate,
        attendanceRate
      };
    });

    // Build Student-by-Student Absence Summaries
    const studentsAbsenceList: MonthlyStudentAbsenceSummary[] = [];

    allStudents.forEach(st => {
      let unexcusedDays = 0;
      let excusedDays = 0;
      let lateDays = 0;
      let presentDays = 0;

      monthSubmissions.forEach(sub => {
        const item = sub.students.find(s => s.studentId === st.id);
        if (item) {
          if (item.status === 'absent') unexcusedDays++;
          else if (item.status === 'excused') excusedDays++;
          else if (item.status === 'late') lateDays++;
          else if (item.status === 'present') presentDays++;
        }
      });

      const totalDays = presentDays + unexcusedDays + excusedDays + lateDays;
      const totalAbsences = unexcusedDays + excusedDays;
      const attendanceRate = totalDays > 0 ? Math.round(((presentDays + lateDays) / totalDays) * 100) : 100;

      if (totalAbsences > 0 || lateDays > 0) {
        studentsAbsenceList.push({
          studentId: st.id,
          studentName: st.name,
          className: st.className,
          gradeLevel: st.gradeLevel,
          unexcusedDays,
          excusedDays,
          lateDays,
          totalAbsences,
          attendanceRate,
          isChronic: totalAbsences >= 3
        });
      }
    });

    // Sort students by total absences descending
    studentsAbsenceList.sort((a, b) => b.totalAbsences - a.totalAbsences || b.unexcusedDays - a.unexcusedDays);

    // Build Daily Trend
    const dailyAttendanceTrend = uniqueDates.map(d => {
      const daySubs = monthSubmissions.filter(s => s.date === d);
      const dayPres = daySubs.reduce((acc, curr) => acc + curr.presentCount, 0);
      const dayAbs = daySubs.reduce((acc, curr) => acc + curr.absentCount, 0);
      const dayExc = daySubs.reduce((acc, curr) => acc + curr.excusedCount, 0);
      const dayTot = dayPres + dayAbs + dayExc;
      const dayRate = dayTot > 0 ? Math.round((dayPres / dayTot) * 100) : 0;
      
      const dayObj = new Date(d);
      const dayName = dayObj.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric', month: 'numeric' });

      return {
        date: d,
        dayName,
        presentCount: dayPres,
        absentCount: dayAbs,
        excusedCount: dayExc,
        attendanceRate: dayRate
      };
    });

    const totalSchoolDaysRecorded = uniqueDates.length;
    const totalRecordedSchool = totalPresentCount + totalUnexcusedAbsentCount + totalExcusedAbsentCount;
    const schoolAverageAttendanceRate = totalRecordedSchool > 0 
      ? Math.round((totalPresentCount / totalRecordedSchool) * 100) 
      : 100;

    return {
      yearMonth,
      monthName,
      schoolName: settings.schoolName,
      principalName: settings.principalName,
      vicePrincipalName: settings.vicePrincipalName,
      counselorName: 'أ. أحمد السعدون', // الموجه الطلابي
      academicYear: settings.academicYear,
      term: settings.term,
      totalSchoolStudents: allStudents.length,
      totalSchoolDaysRecorded,
      schoolAverageAttendanceRate,
      totalPresentCount,
      totalUnexcusedAbsentCount,
      totalExcusedAbsentCount,
      totalLateCount,
      classesSummary,
      studentsAbsenceList,
      dailyAttendanceTrend
    };
  }

  // --- Archiving & Data Management ---
  static getArchiveCutoffDate(months: number = 3): string {
    const d = new Date();
    d.setDate(d.getDate() - (months * 30));
    return d.toISOString().split('T')[0];
  }

  static getArchives(): AttendanceArchiveBatch[] {
    this.initStorage();
    const data = localStorage.getItem(STORAGE_KEYS.ARCHIVES);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static getArchiveById(id: string): AttendanceArchiveBatch | undefined {
    const archives = this.getArchives();
    return archives.find(a => a.id === id);
  }

  static getArchiveAnalytics(cutoffMonths: number = 3): ArchiveAnalytics {
    const activeSubmissions = this.getSubmissions();
    const archives = this.getArchives();
    const cutoffDate = this.getArchiveCutoffDate(cutoffMonths);

    const oldSubmissions = activeSubmissions.filter(s => s.date < cutoffDate);
    const sortedActiveDates = [...activeSubmissions.map(s => s.date)].sort();

    const activeJson = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS) || '';
    const archivedJson = localStorage.getItem(STORAGE_KEYS.ARCHIVES) || '';

    const estimatedSizeActiveKb = Math.round((new Blob([activeJson]).size) / 1024 * 10) / 10;
    const estimatedSizeArchivedKb = Math.round((new Blob([archivedJson]).size) / 1024 * 10) / 10;

    const archivedSubmissionsTotal = archives.reduce((acc, curr) => acc + (curr.submissionsCount || curr.submissions.length), 0);

    return {
      activeSubmissionsCount: activeSubmissions.length,
      oldSubmissionsCount: oldSubmissions.length,
      archivedBatchesCount: archives.length,
      archivedSubmissionsTotal,
      estimatedSizeActiveKb,
      estimatedSizeArchivedKb,
      oldestSubmissionDate: sortedActiveDates.length > 0 ? sortedActiveDates[0] : null,
      newestSubmissionDate: sortedActiveDates.length > 0 ? sortedActiveDates[sortedActiveDates.length - 1] : null,
      cutoffDate3Months: cutoffDate
    };
  }

  static getArchivableSubmissions(cutoffMonths: number = 3, customCutoffDate?: string): ClassAttendanceSubmission[] {
    const activeSubmissions = this.getSubmissions();
    const cutoffDate = customCutoffDate || this.getArchiveCutoffDate(cutoffMonths);
    return activeSubmissions.filter(s => s.date < cutoffDate);
  }

  static archiveOldSubmissions(params: {
    cutoffMonths?: number;
    customCutoffDate?: string;
    title?: string;
    notes?: string;
    user: User;
  }): { batch: AttendanceArchiveBatch; archivedCount: number } {
    const { cutoffMonths = 3, customCutoffDate, title, notes, user } = params;
    const cutoffDate = customCutoffDate || this.getArchiveCutoffDate(cutoffMonths);
    const allActive = this.getSubmissions();

    const toArchive = allActive.filter(s => s.date < cutoffDate);
    if (toArchive.length === 0) {
      throw new Error(`لا توجد سجلات غياب نشطة أقدم من تاريخ القطع المحدد (${cutoffDate}) للأرشفة.`);
    }

    const remainingActive = allActive.filter(s => s.date >= cutoffDate);
    const sortedDates = [...toArchive.map(s => s.date)].sort();
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];

    let totalStudentAbsences = 0;
    toArchive.forEach(sub => {
      totalStudentAbsences += (sub.absentCount + sub.excusedCount + sub.lateCount);
    });

    const batchId = `arch-${Date.now()}`;
    const batchTitle = title || `أرشيف غياب ما قبل ${cutoffDate} (${cutoffMonths} أشهر)`;
    const rawBatchJson = JSON.stringify(toArchive);
    const sizeKb = Math.round((new Blob([rawBatchJson]).size / 1024) * 10) / 10;

    const newBatch: AttendanceArchiveBatch = {
      id: batchId,
      title: batchTitle,
      archivedAt: new Date().toISOString(),
      archivedBy: user.name,
      archivedByUserId: user.id,
      cutoffDate,
      cutoffMonths,
      submissionsCount: toArchive.length,
      studentsAbsenceCount: totalStudentAbsences,
      dateRange: {
        startDate,
        endDate
      },
      submissions: toArchive,
      sizeKb,
      notes: notes || `تم ترحيل ${toArchive.length} كشف غياب بنجاح لتحسين سرعة قاعدة البيانات وتخفيف الحجم النشط.`
    };

    // Save updated active submissions
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(remainingActive));

    // Save archive batches
    const archives = this.getArchives();
    archives.unshift(newBatch);
    localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(archives));

    // Audit Log
    this.logAudit({
      userId: user.id,
      userName: user.name,
      role: user.role,
      action: 'أرشفة بيانات الغياب القديمة',
      details: `تمت أرشفة ${toArchive.length} كشف غياب قديم (الفترة: من ${startDate} إلى ${endDate}) وتخفيف قاعدة البيانات النشطة بمقدار ${sizeKb} KB.`,
      type: 'data_archive'
    });

    return { batch: newBatch, archivedCount: toArchive.length };
  }

  static restoreArchiveBatch(batchId: string, user: User): { restoredCount: number; restoredBatchTitle: string } {
    const archives = this.getArchives();
    const batchIdx = archives.findIndex(a => a.id === batchId);

    if (batchIdx === -1) {
      throw new Error('حزمة الأرشيف المطلوبة غير موجودة.');
    }

    const batch = archives[batchIdx];
    const currentActive = this.getSubmissions();

    // Merge submissions back avoiding duplicates
    const existingIds = new Set(currentActive.map(s => s.id));
    const toRestore = batch.submissions.filter(s => !existingIds.has(s.id));
    const merged = [...toRestore, ...currentActive];

    // Sort descending by date
    merged.sort((a, b) => b.date.localeCompare(a.date));

    // Save restored active submissions
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(merged));

    // Remove restored batch from archives
    archives.splice(batchIdx, 1);
    localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(archives));

    // Audit Log
    this.logAudit({
      userId: user.id,
      userName: user.name,
      role: user.role,
      action: 'استرجاع بيانات غياب مؤرشفة',
      details: `تم استرجاع حزمة "${batch.title}" التي تحتوي على ${batch.submissionsCount} كشف إلى قاعدة البيانات النشطة بنجاح.`,
      type: 'data_restore'
    });

    return {
      restoredCount: batch.submissionsCount,
      restoredBatchTitle: batch.title
    };
  }

  static deleteArchiveBatch(batchId: string, user: User): boolean {
    const archives = this.getArchives();
    const batchIdx = archives.findIndex(a => a.id === batchId);
    if (batchIdx === -1) return false;

    const batch = archives[batchIdx];
    archives.splice(batchIdx, 1);
    localStorage.setItem(STORAGE_KEYS.ARCHIVES, JSON.stringify(archives));

    this.logAudit({
      userId: user.id,
      userName: user.name,
      role: user.role,
      action: 'حذف حزمة أرشيف نهائياً',
      details: `تم حذف حزمة الأرشيف "${batch.title}" (${batch.submissionsCount} كشف) بشكل نهائي.`,
      type: 'data_archive'
    });

    return true;
  }

  static exportArchiveAsJson(batchId: string): void {
    const batch = this.getArchiveById(batchId);
    if (!batch) return;

    const exportData = {
      app: 'منظومة رصد غياب الحصة الثانية - مدرسة زيد بن ثابت',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      archiveBatch: batch
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `أرشيف_غياب_${batch.cutoffDate}_${batch.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  static seedOldHistoricalSubmissions(user: User): number {
    const currentActive = this.getSubmissions();
    const classes = this.getClasses();
    const students = this.getStudents();
    const newHistorical: ClassAttendanceSubmission[] = [];

    // Generate historical dates spanning 95 to 150 days ago
    const sampleDaysAgo = [95, 100, 105, 115, 125, 135, 145, 155];

    sampleDaysAgo.forEach(days => {
      const histDate = getPastDateString(days);
      
      classes.forEach((cls) => {
        const existing = currentActive.find(s => s.classId === cls.id && s.date === histDate);
        if (!existing) {
          const clsStudents = students.filter(s => s.classId === cls.id);
          const absent1 = clsStudents[0];
          const absent2 = clsStudents[1];

          const studentItems: StudentAttendanceItem[] = [];
          if (absent1) {
            studentItems.push({
              studentId: absent1.id,
              studentName: absent1.name,
              status: 'absent',
              reason: 'غياب بدون عذر',
              notes: 'سجل قديم'
            });
          }
          if (absent2) {
            studentItems.push({
              studentId: absent2.id,
              studentName: absent2.name,
              status: 'excused',
              reason: 'مرض بعذر طبي معتمد',
              notes: 'عذر صحي قديم'
            });
          }

          const absentCount = absent1 ? 1 : 0;
          const excusedCount = absent2 ? 1 : 0;
          const presentCount = Math.max(0, cls.studentCount - absentCount - excusedCount);

          newHistorical.push({
            id: `sub-${histDate}-${cls.id}`,
            date: histDate,
            classId: cls.id,
            className: cls.name,
            gradeLevel: cls.gradeLevel,
            teacherId: cls.teacherId,
            teacherName: cls.teacherName,
            periodNumber: 2,
            submittedAt: `${histDate}T08:15:00.000Z`,
            totalStudents: cls.studentCount,
            presentCount,
            absentCount,
            lateCount: 0,
            excusedCount,
            students: studentItems
          });
        }
      });
    });

    const merged = [...currentActive, ...newHistorical];
    merged.sort((a, b) => b.date.localeCompare(a.date));
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(merged));

    this.logAudit({
      userId: user.id,
      userName: user.name,
      role: user.role,
      action: 'توليد بيانات تاريخية قديمة للاختبار',
      details: `تم إنشاء وتوليد ${newHistorical.length} كشف غياب تاريخي قديم (أكثر من 3 أشهر) لتمكين تجربة واختبار ميزة الأرشفة والاسترجاع.`,
      type: 'data_archive'
    });

    return newHistorical.length;
  }

  // System Reset
  static resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.CLASSES);
    localStorage.removeItem(STORAGE_KEYS.STUDENTS);
    localStorage.removeItem(STORAGE_KEYS.SUBMISSIONS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
    localStorage.removeItem(STORAGE_KEYS.EXCUSES);
    localStorage.removeItem(STORAGE_KEYS.SIMULATED_TIME);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.ARCHIVES);
    this.initStorage();
  }
}

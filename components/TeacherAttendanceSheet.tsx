import React, { useState, useEffect } from 'react';
import { User, SchoolClass, Student, StudentAttendanceItem, SchoolSettings, ClassAttendanceSubmission } from '../types';
import { AttendanceService, TEACHER_REMINDER_EVENT } from '../services/attendanceService';
import { ABSENCE_REASONS, getTodayDateString } from '../services/initialData';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Users, 
  Search, 
  Send, 
  Printer, 
  MessageSquare, 
  AlertTriangle, 
  Sparkles, 
  UserCheck,
  FileCheck,
  Info,
  RotateCcw,
  Check,
  CheckCheck,
  Zap,
  Loader2,
  Bell,
  LayoutGrid,
  List
} from 'lucide-react';

interface TeacherAttendanceSheetProps {
  currentUser: User;
  settings: SchoolSettings;
  simulatedTime: string | null;
  onAttendanceSubmitted: () => void;
  onViewStudentProfile?: (studentId: string) => void;
}

export const TeacherAttendanceSheet: React.FC<TeacherAttendanceSheetProps> = ({
  currentUser,
  settings,
  simulatedTime,
  onAttendanceSubmitted,
  onViewStudentProfile
}) => {
  const currentDayInfo = AttendanceService.getCurrentDayKey();
  const classes = AttendanceService.getClasses();

  // Determine initial assigned class for this teacher today from day-by-day database assignments table
  const initialClassId = () => {
    if (currentUser.role === 'admin') {
      return currentUser.assignedClassId || classes[0]?.id || '4-A';
    }
    const todayAssignedClass = AttendanceService.getTeacherAssignedClassForDay(currentUser.id, currentDayInfo.key);
    return todayAssignedClass ? todayAssignedClass.id : (currentUser.assignedClassId || classes[0]?.id || '4-A');
  };

  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, StudentAttendanceItem>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'absent' | 'late' | 'excused' | 'present'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedToday, setIsSubmittedToday] = useState(false);
  const [submissionTime, setSubmissionTime] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [quickActionNotice, setQuickActionNotice] = useState<string | null>(null);
  const [adminReminderAlert, setAdminReminderAlert] = useState<{ active: boolean; message?: string }>(() => ({
    active: AttendanceService.isTeacherRemindedToday(initialClassId())
  }));

  const currentClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const periodInfo = AttendanceService.isPeriod2Active(settings, simulatedTime || undefined);
  const teacherDayAssignedClass = currentUser.role === 'teacher' 
    ? AttendanceService.getTeacherAssignedClassForDay(currentUser.id, currentDayInfo.key)
    : null;


  // Listen to live admin reminder events
  useEffect(() => {
    setAdminReminderAlert({ active: AttendanceService.isTeacherRemindedToday(selectedClassId) });
  }, [selectedClassId]);

  useEffect(() => {
    const handleReminderEvent = (e: any) => {
      const detail = e.detail;
      if (detail && (detail.broadcast || detail.classId === selectedClassId)) {
        setAdminReminderAlert({ 
          active: true, 
          message: '📢 تنبيه عاجل من إدارة المدرسة: نرجو سرعة اعتماد كشف غياب الحصة الثانية لهذا اليوم!' 
        });
      }
    };
    window.addEventListener(TEACHER_REMINDER_EVENT, handleReminderEvent);
    return () => window.removeEventListener(TEACHER_REMINDER_EVENT, handleReminderEvent);
  }, [selectedClassId]);

  // Load students and existing submission on class change
  useEffect(() => {
    if (!currentClass) return;
    const classStudents = AttendanceService.getStudents(currentClass.id);
    setStudents(classStudents);

    // Check if there is an existing submission today
    const todaySub = AttendanceService.getTodaySubmissionForClass(currentClass.id);
    if (todaySub) {
      setIsSubmittedToday(true);
      setSubmissionTime(new Date(todaySub.submittedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }));
      
      // Populate state from today's saved records
      const recordMap: Record<string, StudentAttendanceItem> = {};
      classStudents.forEach(st => {
        const found = todaySub.students.find(s => s.studentId === st.id);
        if (found) {
          recordMap[st.id] = found;
        } else {
          recordMap[st.id] = {
            studentId: st.id,
            studentName: st.name,
            status: 'present'
          };
        }
      });
      setAttendanceRecords(recordMap);
    } else {
      setIsSubmittedToday(false);
      setSubmissionTime(null);
      // Default: All students present
      const initialMap: Record<string, StudentAttendanceItem> = {};
      classStudents.forEach(st => {
        initialMap[st.id] = {
          studentId: st.id,
          studentName: st.name,
          status: 'present'
        };
      });
      setAttendanceRecords(initialMap);
    }
  }, [selectedClassId]);

  // Update a single student status
  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        studentId,
        studentName: student.name,
        status,
        reason: status === 'absent' ? (prev[studentId]?.reason || 'غياب بدون عذر') : (status === 'excused' ? (prev[studentId]?.reason || 'مرض بعذر طبي معتمد') : undefined),
        minutesLate: status === 'late' ? (prev[studentId]?.minutesLate || 10) : undefined
      }
    }));
  };

  // Update absence reason or notes
  const handleDetailChange = (studentId: string, field: 'reason' | 'notes' | 'minutesLate', value: any) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  // Mark all present with feedback
  const handleMarkAllPresent = (targetStudents?: Student[]) => {
    const listToUpdate = targetStudents || students;
    const updated: Record<string, StudentAttendanceItem> = { ...attendanceRecords };
    
    listToUpdate.forEach(st => {
      updated[st.id] = {
        studentId: st.id,
        studentName: st.name,
        status: 'present'
      };
    });
    
    setAttendanceRecords(updated);
    setQuickActionNotice(`تم بنجاح تعيين جميع طلاب الفصل (${listToUpdate.length} طالب) كـ "حاضر" ⚡`);
    setTimeout(() => {
      setQuickActionNotice(null);
    }, 4000);
  };

  // Mark all as saved in submission
  const handleSubmitAttendance = () => {
    setIsSubmitting(true);

    const items: StudentAttendanceItem[] = students.map(st => attendanceRecords[st.id] || {
      studentId: st.id,
      studentName: st.name,
      status: 'present'
    });

    const presentCount = items.filter(i => i.status === 'present').length;
    const absentCount = items.filter(i => i.status === 'absent').length;
    const lateCount = items.filter(i => i.status === 'late').length;
    const excusedCount = items.filter(i => i.status === 'excused').length;

    const submission: ClassAttendanceSubmission = {
      id: `sub-${getTodayDateString()}-${currentClass.id}`,
      date: getTodayDateString(),
      classId: currentClass.id,
      className: currentClass.name,
      gradeLevel: currentClass.gradeLevel,
      teacherId: currentUser.id,
      teacherName: currentUser.name,
      periodNumber: 2,
      submittedAt: new Date().toISOString(),
      totalStudents: students.length,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      students: items
    };

    // Save to service
    AttendanceService.saveAttendanceSubmission(submission, currentUser);

    // Realistic processing animation with loader
    setTimeout(() => {
      setIsSubmitting(false);
      setShowConfirmModal(false);
      setIsSubmittedToday(true);
      setSubmissionTime(new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }));
      setSuccessMessage(`تم حفظ واعتماد كشف الحصة الثانية لفصل ${currentClass.name} (${currentClass.shortName}) بنجاح! تم تحديث سجلات الإدارة فورياً.`);
      
      // Trigger festive celebration
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // ignore if not supported
      }

      onAttendanceSubmitted();
    }, 750);
  };

  // Helper stats
  const itemsList: StudentAttendanceItem[] = Object.values(attendanceRecords);
  const presentTotal = itemsList.filter(i => i.status === 'present').length;
  const absentTotal = itemsList.filter(i => i.status === 'absent').length;
  const lateTotal = itemsList.filter(i => i.status === 'late').length;
  const excusedTotal = itemsList.filter(i => i.status === 'excused').length;

  // Filter students list
  const filteredStudents = students.filter(st => {
    const matchesSearch = st.name.toLowerCase().includes(searchQuery.toLowerCase()) || st.studentNumber.includes(searchQuery);
    if (!matchesSearch) return false;

    const status = attendanceRecords[st.id]?.status || 'present';
    if (statusFilter === 'all') return true;
    return status === statusFilter;
  });

  const isLockStrictAndClosed = settings.lockAttendanceOutsidePeriod && !periodInfo.isActive && currentUser.role !== 'admin';

  // WhatsApp generator helper
  const openWhatsAppForParent = (student: Student) => {
    const record = attendanceRecords[student.id];
    let text = settings.whatsappAutoText
      .replace('[اسم_الطالب]', student.name)
      .replace('[التاريخ]', new Date().toLocaleDateString('ar-SA'));
    
    if (record?.reason) {
      text += ` (السبب المسجل: ${record.reason})`;
    }

    const cleanPhone = student.parentPhone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('0') ? `966${cleanPhone.substring(1)}` : cleanPhone;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Active Admin Reminder Alert Banner */}
      {(!isSubmittedToday || adminReminderAlert.active) && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-4 sm:p-5 rounded-3xl text-slate-950 shadow-lg shadow-amber-500/20 border-2 border-amber-300 flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white text-amber-700 flex items-center justify-center font-black shadow-inner shrink-0">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-950 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  تنبيه إدارة المدرسة 📢
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {currentClass?.name} ({currentClass?.teacherName})
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-black text-slate-950 mt-0.5">
                {adminReminderAlert.message || 'نرجو سرعة اعتماد كشف غياب الحصة الثانية اليوم وإرساله للإدارة'}
              </h4>
              <p className="text-[11px] text-slate-900/80 font-medium">
                تم تفعيل تنبيه مباشر لرصد غياب الطلاب للشعبة لضمان دقة الإحصائيات الميدانية والرسائل الفورية لأولياء الأمور
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleMarkAllPresent()}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-amber-300 text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>رصد الكل حاضر ⚡</span>
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md"
            >
              <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>اعتماد الكشف الآن ✓</span>
            </button>
          </div>
        </div>
      )}

      {/* Second Period Timing Warning & Status Banner */}
      <div className={`p-5 rounded-3xl border shadow-sm transition ${
        periodInfo.isActive 
          ? 'bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 text-white border-emerald-700' 
          : isLockStrictAndClosed 
            ? 'bg-rose-50 border-rose-200 text-rose-900' 
            : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
              periodInfo.isActive ? 'bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-400/40' : 'bg-amber-100 text-amber-700'
            }`}>
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider opacity-80">فترة التحضير الرسمية</span>
                {isSubmittedToday && (
                  <span className="bg-emerald-500 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-3 h-3" />
                    تم رفع الكشف ({submissionTime})
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black font-brand">
                {periodInfo.isActive 
                  ? `نافذة رصد الحصة الثانية نشطة الآن (${settings.period2StartTime} ص - ${settings.period2EndTime} ص)` 
                  : `تنبيه: أنت الآن خارج وقت الحصة الثانية المحدد (${settings.period2StartTime} ص - ${settings.period2EndTime} ص)`}
              </h3>
              <p className="text-xs opacity-90 mt-0.5">
                {periodInfo.isActive 
                  ? `يرجى من مربي الفصل التأكد من مطابقة الغياب الفعلي واعتماد الكشف قبل انتهاء الحصة (متبقي ${periodInfo.minutesRemaining} دقيقة).`
                  : settings.lockAttendanceOutsidePeriod 
                    ? 'النظام في وضع الإغلاق الصارم. يمكنك استخدام محاكي الوقت بالأعلى أو طلب فتح الكشف من الإدارة.'
                    : 'يسمح النظام حالياً بالرصد والتجربة في الوضع المرن.'}
              </p>
            </div>
          </div>

          {/* Class Indicator & Selector */}
          {currentUser.role === 'admin' ? (
            <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-md">
              <span className="text-xs font-bold px-2">معاينة الفصل:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-white text-slate-800 text-xs font-black py-2 px-4 rounded-xl shadow-sm border-0 focus:ring-2 focus:ring-emerald-400 outline-none"
              >
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.teacherName})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white/15 px-3.5 py-2 rounded-2xl backdrop-blur-md border border-white/20">
              <span className="text-emerald-200 text-xs font-bold">فصلك المسند لليوم ({currentDayInfo.label}):</span>
              <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-sm">
                {currentClass?.name || 'فصل المعلم'}
              </span>
            </div>
          )}
        </div>
      </div>


      {/* Empty Roster Alert Banner */}
      {students.length === 0 && (
        <div className="p-5 rounded-3xl bg-amber-50 border-2 border-amber-300 text-amber-950 shadow-sm flex flex-wrap items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-950">
                قائمة الطلاب لهذا الفصل فارغة (0 طالب)
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                لم يتم تسجيل أي طلاب في شعبة <strong className="font-bold">{currentClass.name}</strong> بعد. يمكنك إضافة الطلاب عبر شاشة إدارة الطلاب في لوحة الإدارة.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button 
            onClick={() => setSuccessMessage('')}
            className="text-emerald-600 hover:text-emerald-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Bulk Action Notification Toast */}
      {quickActionNotice && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black flex items-center justify-between shadow-lg shadow-emerald-600/20 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <CheckCheck className="w-4 h-4 text-emerald-100" />
            </div>
            <span>{quickActionNotice}</span>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-normal">
            يمكنك الآن تعديل حالات الغياب الفردية فقط
          </span>
        </div>
      )}

      {/* Fast Bulk Attendance Assistant Card */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-slate-50 rounded-3xl p-4 sm:p-5 border border-emerald-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-black text-slate-900">
                خاصية التحديد الجماعي السريع (رصد الحضور بضغطة زر)
              </h4>
              {presentTotal === students.length && students.length > 0 ? (
                <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  حضور كامل للفصل (100%)
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {students.length - presentTotal} طالب غير حاضر
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              وفر وقتك: اضغط على الزر لتعيين جميع طلاب فصل <strong className="text-slate-900 font-bold">{currentClass.name}</strong> ({students.length} طالب) كـ <strong>"حاضر"</strong> دفعة واحدة، ثم حدد فقط الطلاب المتغيبين.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => handleMarkAllPresent()}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white text-xs font-black rounded-xl transition shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 group"
          >
            <CheckCheck className="w-4 h-4 text-emerald-200 group-hover:scale-110 transition" />
            <span>تحديد الكل "حاضر" الآن ({students.length})</span>
          </button>

          {searchQuery && filteredStudents.length < students.length && filteredStudents.length > 0 && (
            <button
              type="button"
              onClick={() => handleMarkAllPresent(filteredStudents)}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
              title="تحديد نتائج البحث الحالية فقط كـ حاضر"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>تحضير المعروضين فقط ({filteredStudents.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Class Statistics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-400 truncate">إجمالي طلاب الفصل</div>
            <div className="text-lg sm:text-xl font-black text-slate-800">{students.length}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-emerald-600 truncate">الحاضرون</div>
            <div className="text-lg sm:text-xl font-black text-emerald-700">{presentTotal}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-rose-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-rose-600 truncate">الغياب بدون عذر</div>
            <div className="text-lg sm:text-xl font-black text-rose-700">{absentTotal}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-blue-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-blue-600 truncate">غياب بعذر معتمد</div>
            <div className="text-lg sm:text-xl font-black text-blue-700">{excusedTotal}</div>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-amber-200 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-amber-600 truncate">المتأخرون</div>
            <div className="text-lg sm:text-xl font-black text-amber-700">{lateTotal}</div>
          </div>
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search & Layout toggle */}
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الطالب أو الرقم الأكاديمي..."
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'grid' 
                  ? 'bg-white text-emerald-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="عرض كروت مرن (موصى به للجوال)"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">شبكة كروت</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'list' 
                  ? 'bg-white text-emerald-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="عرض جدول مدمج"
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">جدول مدمج</span>
            </button>
          </div>
        </div>

        {/* Filter Pills & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold overflow-x-auto no-scrollbar max-w-full">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition shrink-0 ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              الكل ({students.length})
            </button>
            <button
              onClick={() => setStatusFilter('absent')}
              className={`px-3 py-1.5 rounded-xl transition shrink-0 ${statusFilter === 'absent' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-700 hover:bg-rose-50'}`}
            >
              الغياب ({absentTotal})
            </button>
            <button
              onClick={() => setStatusFilter('late')}
              className={`px-3 py-1.5 rounded-xl transition shrink-0 ${statusFilter === 'late' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700 hover:bg-amber-50'}`}
            >
              المتأخرون ({lateTotal})
            </button>
            <button
              onClick={() => setStatusFilter('excused')}
              className={`px-3 py-1.5 rounded-xl transition shrink-0 ${statusFilter === 'excused' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-700 hover:bg-blue-50'}`}
            >
              بعذر ({excusedTotal})
            </button>
          </div>

          {/* Quick Action Button */}
          <button
            type="button"
            onClick={() => handleMarkAllPresent()}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0 touch-manipulation"
            title="تعيين جميع طلاب الفصل كـ حاضرين بضغطة زر واحدة"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden xs:inline">تحضير الكل حاضر</span>
            <span className="xs:hidden">الكل حاضر</span>
            <span>({students.length})</span>
          </button>
        </div>
      </div>

      {/* Students Attendance List (Responsive Grid / Table) */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">لا يوجد طلاب يطابقون خيارات البحث أو التصفية</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Responsive Card Grid: 1 column on mobile, 2 columns on tablet/small laptops, 3 columns on wide screens */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredStudents.map((student, index) => {
            const currentRecord = attendanceRecords[student.id] || { studentId: student.id, studentName: student.name, status: 'present' };
            const studentHistory = AttendanceService.getStudentHistory(student.id);

            return (
              <div 
                key={student.id}
                className={`p-3.5 sm:p-4 rounded-3xl border transition-all duration-200 flex flex-col justify-between ${
                  currentRecord.status === 'absent'
                    ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20 card-glow-absent'
                    : currentRecord.status === 'excused'
                      ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 card-glow-excused'
                      : currentRecord.status === 'late'
                        ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 card-glow-late'
                        : 'bg-white border-slate-200/90 hover:border-emerald-300 card-glow-present shadow-sm'
                }`}
              >
                <div>
                  {/* Student Basic Header Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-600 text-xs font-black flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm shrink-0 transition-colors ${
                      currentRecord.status === 'absent'
                        ? 'bg-rose-600 text-white shadow-rose-600/30'
                        : currentRecord.status === 'excused'
                          ? 'bg-blue-600 text-white shadow-blue-600/30'
                          : currentRecord.status === 'late'
                            ? 'bg-amber-500 text-white shadow-amber-500/30'
                            : 'bg-gradient-to-br from-slate-700 to-slate-900 text-white'
                    }`}>
                      {student.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 
                          onClick={() => onViewStudentProfile && onViewStudentProfile(student.id)}
                          className="text-sm font-black text-slate-900 hover:text-emerald-700 cursor-pointer transition truncate"
                          title="عرض الملف الأكاديمي للطالب"
                        >
                          {student.name}
                        </h4>
                        {studentHistory.absentDays >= 2 && (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-1.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-0.5 shrink-0">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                            {studentHistory.absentDays} غياب
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold mt-0.5 truncate">
                        <span>رقم: {student.studentNumber}</span>
                        <span>•</span>
                        <span className="truncate">{student.parentName}</span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Status Buttons - 100% Mobile Touch Friendly (44px min height) */}
                  <div className="grid grid-cols-4 gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/70 touch-card-action">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.id, 'present')}
                      className={`min-h-[44px] px-1.5 sm:px-2 py-2 rounded-xl text-xs font-black transition-all duration-150 flex flex-col sm:flex-row items-center justify-center gap-1 active:scale-95 select-none ${
                        currentRecord.status === 'present'
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/50'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900 active:bg-emerald-100'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] sm:text-xs">حاضر</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.id, 'absent')}
                      className={`min-h-[44px] px-1.5 sm:px-2 py-2 rounded-xl text-xs font-black transition-all duration-150 flex flex-col sm:flex-row items-center justify-center gap-1 active:scale-95 select-none ${
                        currentRecord.status === 'absent'
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-400/50'
                          : 'text-slate-600 hover:bg-rose-50 hover:text-rose-700 active:bg-rose-100'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] sm:text-xs">غائب</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.id, 'late')}
                      className={`min-h-[44px] px-1.5 sm:px-2 py-2 rounded-xl text-xs font-black transition-all duration-150 flex flex-col sm:flex-row items-center justify-center gap-1 active:scale-95 select-none ${
                        currentRecord.status === 'late'
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-400/50'
                          : 'text-slate-600 hover:bg-amber-50 hover:text-amber-700 active:bg-amber-100'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] sm:text-xs">متأخر</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.id, 'excused')}
                      className={`min-h-[44px] px-1.5 sm:px-2 py-2 rounded-xl text-xs font-black transition-all duration-150 flex flex-col sm:flex-row items-center justify-center gap-1 active:scale-95 select-none ${
                        currentRecord.status === 'excused'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400/50'
                          : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[11px] sm:text-xs">بعذر</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Details when Absent, Excused or Late */}
                {(currentRecord.status === 'absent' || currentRecord.status === 'excused' || currentRecord.status === 'late') && (
                  <div className="mt-3 pt-3 border-t border-slate-200/70 space-y-2.5 animate-in fade-in duration-200">
                    {/* Quick Reason Chips for 1-Tap Mobile Selection */}
                    {currentRecord.status !== 'late' && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black text-slate-500 ml-0.5">أسباب سريعة:</span>
                        {['غياب بدون عذر', 'مرض / عذر طبي', 'ظرف أسري طارئ', 'سفر'].map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleDetailChange(student.id, 'reason', preset)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition active:scale-95 ${
                              currentRecord.reason === preset
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2 text-xs">
                      {currentRecord.status !== 'late' ? (
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-700 text-[11px]">السبب بالتفصيل:</span>
                          <select
                            value={currentRecord.reason || (currentRecord.status === 'excused' ? 'مرض بعذر طبي معتمد' : 'غياب بدون عذر')}
                            onChange={(e) => handleDetailChange(student.id, 'reason', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                          >
                            {ABSENCE_REASONS.map(r => (
                              <option key={r.id} value={r.label}>{r.label}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-700 text-[11px]">مدة التأخر:</span>
                          <select
                            value={currentRecord.minutesLate || 10}
                            onChange={(e) => handleDetailChange(student.id, 'minutesLate', Number(e.target.value))}
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                          >
                            <option value={5}>5 دقائق</option>
                            <option value={10}>10 دقائق</option>
                            <option value={15}>15 دقيقة</option>
                            <option value={20}>20 دقيقة</option>
                            <option value={30}>30 دقيقة فأكثر</option>
                          </select>
                        </div>
                      )}

                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          value={currentRecord.notes || ''}
                          onChange={(e) => handleDetailChange(student.id, 'notes', e.target.value)}
                          placeholder="ملاحظات المعلم (اختياري)..."
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      {/* WhatsApp Quick Message */}
                      <button
                        type="button"
                        onClick={() => openWhatsAppForParent(student)}
                        className="w-full min-h-[38px] px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm touch-manipulation"
                        title="إرسال إشعار واتساب فوري لولي الأمر"
                      >
                        <MessageSquare className="w-4 h-4 text-emerald-100" />
                        <span>إشعار ولي الأمر بالواتساب</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact Responsive Table/List View */
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[180px]">اسم الطالب</th>
                  <th className="py-3 px-4 min-w-[120px]">الرقم الأكاديمي</th>
                  <th className="py-3 px-4 min-w-[280px] text-center">حالة الحضور</th>
                  <th className="py-3 px-4 min-w-[200px]">تفاصيل الغياب / التأخر</th>
                  <th className="py-3 px-4 w-28 text-center">تواصل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, index) => {
                  const currentRecord = attendanceRecords[student.id] || { studentId: student.id, studentName: student.name, status: 'present' };
                  const studentHistory = AttendanceService.getStudentHistory(student.id);

                  return (
                    <tr 
                      key={student.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        currentRecord.status === 'absent' ? 'bg-rose-50/40' :
                        currentRecord.status === 'excused' ? 'bg-blue-50/40' :
                        currentRecord.status === 'late' ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center font-black text-slate-500">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0 ${
                            currentRecord.status === 'absent' ? 'bg-rose-600' :
                            currentRecord.status === 'excused' ? 'bg-blue-600' :
                            currentRecord.status === 'late' ? 'bg-amber-500' : 'bg-slate-800'
                          }`}>
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <span 
                              onClick={() => onViewStudentProfile && onViewStudentProfile(student.id)}
                              className="font-black text-slate-900 hover:text-emerald-700 cursor-pointer block"
                            >
                              {student.name}
                            </span>
                            <span className="text-[10px] text-slate-400">{student.parentName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">{student.studentNumber}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1 bg-slate-100 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'present')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                              currentRecord.status === 'present' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
                            }`}
                          >
                            حاضر
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'absent')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                              currentRecord.status === 'absent' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
                            }`}
                          >
                            غائب
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'late')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                              currentRecord.status === 'late' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
                            }`}
                          >
                            متأخر
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'excused')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                              currentRecord.status === 'excused' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'
                            }`}
                          >
                            بعذر
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {currentRecord.status === 'absent' || currentRecord.status === 'excused' ? (
                          <span className="font-bold text-slate-700">{currentRecord.reason || 'بدون عذر'}</span>
                        ) : currentRecord.status === 'late' ? (
                          <span className="font-bold text-amber-700">تأخر {currentRecord.minutesLate || 10} دقائق</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">منتظم في الحصة</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => openWhatsAppForParent(student)}
                          className="p-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl transition inline-flex items-center justify-center shadow-sm"
                          title="إشعار واتساب"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom Sticky Floating Action Bar for Submission */}
      <div className="sticky bottom-3 sm:bottom-4 z-20 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-black text-slate-800 flex items-center gap-2 flex-wrap">
              <span>ملخص الكشف:</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">{presentTotal} حاضر</span>
              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">{absentTotal} غائب</span>
              {lateTotal > 0 && <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">{lateTotal} متأخر</span>}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              {isSubmittedToday ? `تم اعتماد الكشف مسبقاً الساعة ${submissionTime || ''} — يمكنك تحديثه في أي وقت` : 'جاهز للإرسال والاعتماد النهائي'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleMarkAllPresent()}
            className="flex-1 sm:flex-none min-h-[44px] px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 touch-manipulation"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>الكل حاضر ({students.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isLockStrictAndClosed || isSubmitting}
            className={`flex-1 sm:flex-none min-h-[44px] px-6 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-lg touch-manipulation ${
              isLockStrictAndClosed
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : isSubmitting
                  ? 'bg-emerald-800 text-white cursor-wait opacity-90'
                  : isSubmittedToday
                    ? 'bg-teal-700 hover:bg-teal-800 text-white shadow-teal-700/20 active:scale-95'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-600/30 active:scale-95'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-200 shrink-0" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-emerald-100 shrink-0" />
                <span>{isSubmittedToday ? 'تحديث واعتماد الكشف' : 'حفظ واعتماد كشف الحصة الثانية'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-5 text-white">
              <h3 className="text-base font-black font-brand">تأكيد اعتماد كشف غياب الحصة الثانية</h3>
              <p className="text-xs text-emerald-200">{currentClass.name} — تاريخ اليوم: {new Date().toLocaleDateString('ar-SA')}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-bold text-slate-500">الإجمالي</div>
                  <div className="text-lg font-black text-slate-800">{students.length}</div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <div className="text-xs font-bold text-emerald-600">حاضر</div>
                  <div className="text-lg font-black text-emerald-700">{presentTotal}</div>
                </div>
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
                  <div className="text-xs font-bold text-rose-600">غياب</div>
                  <div className="text-lg font-black text-rose-700">{absentTotal}</div>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
                  <div className="text-xs font-bold text-blue-600">بعذر</div>
                  <div className="text-lg font-black text-blue-700">{excusedTotal}</div>
                </div>
              </div>

              {absentTotal > 0 && (
                <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3">
                  <div className="text-xs font-black text-rose-800 mb-1.5">الطلاب المسجل غيابهم:</div>
                  <ul className="text-xs text-rose-700 space-y-1 pr-3 list-disc">
                    {students.filter(s => attendanceRecords[s.id]?.status === 'absent').map(s => (
                      <li key={s.id}>
                        {s.name} ({attendanceRecords[s.id]?.reason || 'بدون عذر'})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  سيتم إرسال هذا الكشف فوراً إلى لوحة تحكم إدارة مدرسة زيد بن ثابت مع توثيق اسم المعلم ووقت الإرسال.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  إلغاء وتعديل
                </button>
                <button
                  type="button"
                  onClick={handleSubmitAttendance}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-800/80 text-white text-xs font-black shadow-lg shadow-emerald-700/20 transition flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                      <span>جاري معالجة وحفظ البيانات...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تأكيد الإرسال والاعتماد</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

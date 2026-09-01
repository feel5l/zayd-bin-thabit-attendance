import React, { useState, useEffect } from 'react';
import { User, SchoolSettings, ClassAttendanceSubmission, SchoolClass } from '../types';
import { AttendanceService, NOTIFICATION_EVENT } from '../services/attendanceService';
import { getTodayDateString, getPastDateString } from '../services/initialData';
import { TeacherReminderModal } from './TeacherReminderModal';
import { TeacherLiveSimulationWidget } from './TeacherLiveSimulationWidget';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Bell, 
  FileText, 
  Download, 
  Printer, 
  MessageSquare, 
  AlertTriangle, 
  Sparkles, 
  ChevronLeft, 
  Eye, 
  Send,
  UserX,
  UserCheck,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  PlayCircle,
  FileCheck,
  ArrowUpRight,
  Archive,
  Database,
  Zap,
  Radio,
  SlidersHorizontal,
  FileSpreadsheet,
  Search,
  Filter,
  CheckCheck,
  AlertCircle,
  Phone,
  ExternalLink,
  Link2
} from 'lucide-react';


interface AdminDashboardProps {
  currentUser: User;
  settings: SchoolSettings;
  simulatedTime: string | null;
  onOpenPrintReport: () => void;
  onOpenClassSheet: (classId: string) => void;
  onViewStudentProfile: (studentId: string) => void;
  onNavigateToTab: (tab) => void;
  onOpenPdfReport?: (type: 'daily' | 'monthly', date?: string) => void;
  onOpenArchivingModal?: () => void;
  onOpenTeacherAndClassManager?: () => void;
  onSwitchToTeacher?: (teacherUser: User) => void;
  onOpenGoogleSheetsModal?: () => void;
  onOpenStudentImportModal?: () => void;
  onOpenContactsModal?: () => void;
  onOpenPortalLinksModal?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  settings,
  simulatedTime,
  onOpenPrintReport,
  onOpenClassSheet,
  onViewStudentProfile,
  onNavigateToTab,
  onOpenPdfReport,
  onOpenArchivingModal,
  onOpenTeacherAndClassManager,
  onSwitchToTeacher,
  onOpenGoogleSheetsModal,
  onOpenStudentImportModal,
  onOpenContactsModal,
  onOpenPortalLinksModal
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'pending' | 'submitted'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [remindedTeachers, setRemindedTeachers] = useState<Record<string, boolean>>({});
  const [isTeacherReminderModalOpen, setIsTeacherReminderModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showSimulatorPanel, setShowSimulatorPanel] = useState(true);

  // Re-fetch on any teacher submission event
  useEffect(() => {
    const handleSubmissionsChange = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener(NOTIFICATION_EVENT, handleSubmissionsChange);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handleSubmissionsChange);
  }, []);

  const stats = AttendanceService.getTodaySchoolStats(selectedDate);
  const classes = AttendanceService.getClasses();
  const submissions = AttendanceService.getSubmissions(selectedDate);
  const periodInfo = AttendanceService.isPeriod2Active(settings, simulatedTime || undefined);

  // Send single teacher reminder
  const handleSendReminder = (teacherName: string, className: string, teacherId: string) => {
    setRemindedTeachers(prev => ({ ...prev, [teacherId]: true }));
    setToastMessage(`تم إرسال إشعار تذكير عاجل للمعلم (${teacherName}) لرصد غياب الحصة الثانية لفصل (${className})`);
    
    AttendanceService.logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      role: 'admin',
      action: 'إرسال تذكير لمعلم',
      details: `تم إرسال تذكير لرصد الحصة الثانية للأستاذ: ${teacherName} (${className})`,
      type: 'sms_sent',
      targetClass: className
    });

    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  // Nudge all pending teachers
  const handleNudgeAllPending = () => {
    const pendingClasses = stats.classStatuses.filter(c => !c.isSubmitted);
    if (pendingClasses.length === 0) {
      setToastMessage('كافة الفصول قامت برصد غياب الحصة الثانية بنجاح!');
      return;
    }

    const updated: Record<string, boolean> = { ...remindedTeachers };
    pendingClasses.forEach(c => {
      updated[c.teacherId] = true;
    });
    setRemindedTeachers(updated);
    setToastMessage(`تم إرسال تنبيه جماعي إلى ${pendingClasses.length} معلمين لاستكمال رصد الحصة الثانية.`);
    
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Export CSV
  const handleExportCSV = () => {
    const students = AttendanceService.getStudents();
    const subs = AttendanceService.getSubmissions(selectedDate);

    let csvContent = "\uFEFFاسم الطالب,الرقم الأكاديمي,الصف,الشعبة,الحالة,السبب,الملاحظات,المعلم\n";

    subs.forEach(sub => {
      sub.students.forEach(st => {
        const studentObj = students.find(s => s.id === st.studentId);
        const statusAr = st.status === 'present' ? 'حاضر' : st.status === 'absent' ? 'غائب بدون عذر' : st.status === 'excused' ? 'غائب بعذر' : 'متأخر';
        csvContent += `"${st.studentName}","${studentObj?.studentNumber || ''}","${sub.gradeLevel}","${sub.className}","${statusAr}","${st.reason || ''}","${st.notes || ''}","${sub.teacherName}"\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `تقرير_غياب_مدرسة_زيد_بن_ثابت_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Historical Chart Data preparation (past 5 days)
  const trendData = [
    { day: 'الأحد', attendance: 96, absence: 4, date: getPastDateString(4) },
    { day: 'الإثنين', attendance: 94, absence: 6, date: getPastDateString(3) },
    { day: 'الثلاثاء', attendance: 97, absence: 3, date: getPastDateString(2) },
    { day: 'الأربعاء', attendance: 95, absence: 5, date: getPastDateString(1) },
    { day: 'اليوم (الخميس)', attendance: stats.attendanceRate || 95, absence: 100 - (stats.attendanceRate || 95), date: selectedDate }
  ];

  // Grade comparison data
  const gradeComparisonData = [
    { grade: 'الصف الرابع', present: 39, absent: 3, total: 42 },
    { grade: 'الصف الخامس', present: 41, absent: 4, total: 45 },
    { grade: 'الصف السادس', present: 43, absent: 2, total: 45 }
  ];

  // Reasons Breakdown
  const reasonData = [
    { name: 'مرض بعذر طبي', value: stats.excusedCount > 0 ? stats.excusedCount : 3, color: '#3B82F6' },
    { name: 'بدون عذر', value: stats.absentCount > 0 ? stats.absentCount : 2, color: '#EF4444' },
    { name: 'ظرف عائلي طارئ', value: 2, color: '#10B981' },
    { name: 'تأخر وسيلة نقل', value: stats.lateCount > 0 ? stats.lateCount : 1, color: '#F59E0B' }
  ];

  // Pending & Submitted class lists
  const pendingClassesList = stats.classStatuses.filter(c => !c.isSubmitted);
  const submittedClassesList = stats.classStatuses.filter(c => c.isSubmitted);

  // Filtered Class Statuses based on grade, status, and search query
  const filteredClassStatuses = stats.classStatuses.filter(c => {
    if (selectedGradeFilter !== 'all' && c.gradeLevel !== selectedGradeFilter) return false;
    if (selectedStatusFilter === 'pending' && c.isSubmitted) return false;
    if (selectedStatusFilter === 'submitted' && !c.isSubmitted) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchTeacher = c.teacherName?.toLowerCase().includes(q);
      const matchGrade = c.gradeLevel?.toLowerCase().includes(q);
      const matchShort = c.shortName?.toLowerCase().includes(q);
      if (!matchName && !matchTeacher && !matchGrade && !matchShort) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-slate-900 text-white text-xs font-bold flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-top-2 border border-slate-700">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Top Banner & Date Selector */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black font-brand text-slate-900">
              لوحة المتابعة الميدانية ورصد الحصة الثانية
            </h2>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
              مباشر لحظي
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            متابعة دقيقة لحضور وغياب طلاب مدرسة زيد بن ثابت وإشراف الإدارة المدرسية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
            <Clock className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => setShowSimulatorPanel(prev => !prev)}
            className={`px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md ${
              showSimulatorPanel 
                ? 'bg-amber-400 text-slate-950 shadow-amber-400/20' 
                : 'bg-indigo-700 hover:bg-indigo-600 text-white shadow-indigo-900/20'
            }`}
            title="إظهار/إخفاء لوحة محاكاة رصد المعلمين التفاعلية اللحظية"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>{showSimulatorPanel ? 'محاكي المعلمين (نشط) ⚡' : 'فتح محاكي رصد المعلمين ⚡'}</span>
          </button>

          <button
            onClick={() => {
              if (onOpenPdfReport) onOpenPdfReport('daily', selectedDate);
              else onOpenPrintReport();
            }}
            className="px-4 py-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-900/20"
            title="تصدير وتحميل التقرير اليومي المعتمد بصيغة PDF"
          >
            <FileText className="w-4 h-4 text-emerald-300" />
            <span>تصدير PDF اليومي 📄</span>
          </button>

          <button
            onClick={() => {
              if (onOpenPdfReport) onOpenPdfReport('monthly', selectedDate);
              else onOpenPrintReport();
            }}
            className="px-4 py-2 bg-gradient-to-r from-indigo-700 to-slate-800 hover:from-indigo-800 hover:to-slate-900 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-indigo-900/20"
            title="تصدير التقرير الإحصائي الشهري الشامل إلى صيغة PDF"
          >
            <Users className="w-4 h-4 text-indigo-300" />
            <span>التقرير الشهري PDF 📊</span>
          </button>

          {onOpenPortalLinksModal && (
            <button
              onClick={onOpenPortalLinksModal}
              className="px-4 py-2 bg-gradient-to-r from-teal-800 to-emerald-950 hover:from-teal-900 hover:to-slate-900 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-teal-950/20 border border-teal-500/40"
              title="نسخ ومشاركة روابط الدخول المنفصلة للمعلمين (برقم الجوال) والإدارة المدرسية"
            >
              <Link2 className="w-4 h-4 text-teal-300" />
              <span>روابط الدخول والمعلمين 🔗</span>
            </button>
          )}

          {onOpenStudentImportModal && (
            <button
              onClick={onOpenStudentImportModal}
              className="px-4 py-2 bg-gradient-to-r from-emerald-800 to-teal-900 hover:from-emerald-900 hover:to-teal-950 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-950/20 border border-emerald-600/40"
              title="استيراد وتوزيع أسماء الطلاب من ملف Excel أو CSV وتوزيعهم على الفصول آلياً"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span>استيراد وتوزيع الطلاب (Excel) 📥</span>
            </button>
          )}

          {onOpenGoogleSheetsModal && (
            <button
              onClick={onOpenGoogleSheetsModal}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-900/20"
              title="تصدير ومزامنة كشوفات الحصة الثانية والتقارير الشهرية وسجل الطلاب مع Google Sheets وDrive"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>تصدير Google Sheets 📊</span>
            </button>
          )}

          <button
            onClick={() => {
              if (onOpenContactsModal) onOpenContactsModal();
              else onNavigateToTab('contacts');
            }}
            className="px-4 py-2 bg-gradient-to-r from-teal-700 to-emerald-800 hover:from-teal-800 hover:to-emerald-900 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-teal-900/20"
            title="فتح دليل جهات الاتصال وأرقام المعلمين وأولياء الأمور"
          >
            <Phone className="w-4 h-4 text-emerald-300" />
            <span>دليل الاتصال المدرسي 📱</span>
          </button>

          {onOpenArchivingModal && (
            <button
              onClick={onOpenArchivingModal}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-amber-900/20"
              title="أرشفة بيانات الغياب القديمة (أكثر من 3 أشهر) لتحسين سرعة قاعدة البيانات مع إمكانية الاسترجاع"
            >
              <Archive className="w-4 h-4 text-amber-200" />
              <span>أرشفة واسترجاع البيانات 📦</span>
            </button>
          )}

          <button
            onClick={onOpenPrintReport}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>طباعة رسمية</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Excel</span>
          </button>

          <button
            onClick={() => setIsTeacherReminderModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 border border-amber-400/60 text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            title="فتح مركز إرسال التنبيهات وتذكيرات الواتساب والنظام للمعلمين المتأخرين"
          >
            <Bell className="w-4 h-4 text-slate-950 animate-bounce" />
            <span>مركز تنبيه المعلمين ({stats.totalClasses - stats.submittedCount} متبقي) 📢</span>
          </button>
        </div>
      </div>

      {/* Multi-Teacher Live Simulation Engine Widget */}
      {showSimulatorPanel && (
        <TeacherLiveSimulationWidget
          currentUser={currentUser}
          settings={settings}
          onOpenClassSheet={onOpenClassSheet}
          onSwitchToTeacher={onSwitchToTeacher}
          onSimulationStep={() => setRefreshTrigger(p => p + 1)}
        />
      )}

      {/* Quick Administrative Management Hub */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-4 sm:p-5 rounded-3xl text-white shadow-xl flex flex-wrap items-center justify-between gap-4 border border-emerald-800/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm font-brand text-white flex items-center gap-2">
              <span>بوابة الإدارة والتعديل الشامل</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-700/60 text-emerald-200">تحكم كامل</span>
            </h3>
            <p className="text-[11px] text-slate-300 font-medium">
              القدرة الفورية على إضافة وتعديل أي معلومة (الطلاب، نقل الشعب، بيانات المعلمين، الفصول والقاعات)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenTeacherAndClassManager && (
            <button
              onClick={onOpenTeacherAndClassManager}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-900/30"
            >
              <Users className="w-4 h-4" />
              <span>إدارة المعلمين والفصول 🎓</span>
            </button>
          )}

          <button
            onClick={() => onNavigateToTab('students')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-white/15"
          >
            <UserCheck className="w-4 h-4 text-emerald-300" />
            <span>إضافة وتعديل الطلاب 👥</span>
          </button>
        </div>
      </div>

      {/* Main KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Attendance Rate */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 rounded-3xl text-white shadow-lg shadow-emerald-600/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-100">نسبة الحضور اليومية</span>
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-200" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-brand">{stats.attendanceRate || 95}%</span>
            <span className="text-xs text-emerald-200">من إجمالي الطلاب</span>
          </div>
          <div className="mt-3 bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-emerald-300 h-full rounded-full transition-all duration-500" 
              style={{ width: `${stats.attendanceRate || 95}%` }}
            />
          </div>
        </div>

        {/* Period 2 Completion Status */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">رصد الحصة الثانية</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
              stats.submittedCount === stats.totalClasses ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-brand text-slate-800">
              {stats.submittedCount} / {stats.totalClasses}
            </span>
            <span className="text-xs font-bold text-slate-400">فصول تم رصدها</span>
          </div>
          <div className="mt-2 text-xs font-bold text-amber-600 flex items-center gap-1">
            {stats.pendingCount > 0 ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>متبقي {stats.pendingCount} فصول قيد الرصد</span>
              </>
            ) : (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                تم اكتمال رصد كافة الفصول
              </span>
            )}
          </div>
        </div>

        {/* Total Absent Count */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي الغياب اليوم</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-brand text-rose-600">
              {stats.absentCount + stats.excusedCount}
            </span>
            <span className="text-xs font-bold text-slate-400">طالب غائب</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-slate-500">
            <span className="text-rose-600 font-bold">{stats.absentCount} بدون عذر</span>
            <span>•</span>
            <span className="text-blue-600 font-bold">{stats.excusedCount} بعذر</span>
          </div>
        </div>

        {/* Total Students Enrollment */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">طلاب المدرسة</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black font-brand text-slate-800">
              {stats.totalStudents}
            </span>
            <span className="text-xs font-bold text-slate-400">طالب مقيد</span>
          </div>
          <div className="mt-2 text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{stats.presentCount || (stats.totalStudents - stats.absentCount)} طالب حاضر الآن</span>
          </div>
        </div>
      </div>

      {/* Live Alerts & Recent Teacher Submissions Feed */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 text-white shadow-lg border border-slate-700/80 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">تنبيهات وإشعارات الرصد الفوري للمدير</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
                  تحديث لحظي
                </span>
              </div>
              <p className="text-xs text-slate-300">
                يظهر تنبيه Toast منبثق فوري عند حفظ أي معلم لكشف غياب الحصة الثانية مع بيان حالة الغياب (مؤكد / معذر)
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              AttendanceService.simulateTeacherSubmission();
            }}
            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <PlayCircle className="w-4 h-4" />
            <span>إرسال إشعار تجريبي 🔔</span>
          </button>
        </div>

        {/* Recent 3 incoming submissions breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {submissions.slice(0, 3).map((sub, idx) => {
            const unexcused = sub.students.filter(s => s.status === 'absent');
            const excused = sub.students.filter(s => s.status === 'excused');
            const late = sub.students.filter(s => s.status === 'late');

            return (
              <div
                key={sub.id || idx}
                onClick={() => onOpenClassSheet(sub.classId)}
                className="bg-slate-800/80 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-700 cursor-pointer transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-white">{sub.className}</span>
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(sub.submittedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    المعلم: {sub.teacherName}
                  </div>

                  {/* Status Breakdown Badges */}
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                    {unexcused.length > 0 ? (
                      <span className="bg-rose-950/80 border border-rose-700/80 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span>غياب مؤكد: {unexcused.length}</span>
                      </span>
                    ) : (
                      <span className="bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        لا يوجد غياب مؤكد
                      </span>
                    )}

                    {excused.length > 0 && (
                      <span className="bg-blue-950/80 border border-blue-700/80 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span>معذر: {excused.length}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
                  <span>حاضر: {sub.presentCount} طالب</span>
                  <span className="flex items-center gap-0.5 text-slate-400 hover:text-white">
                    <span>عرض الكشف</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section: Real-time Period 2 Classes Monitor Grid & Status Indicators Matrix */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        
        {/* Section Header & Live Progress Stats */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-600"></span>
              </span>
              <h3 className="text-lg font-black font-brand text-slate-900">
                متابعة ورصد فصول الحصة الثانية اللحظي
              </h3>
              <span className="bg-slate-100 text-slate-700 text-xs font-black px-2.5 py-0.5 rounded-full border border-slate-200">
                نافذة الرصد: {settings.period2StartTime} ص - {settings.period2EndTime} ص
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              مؤشرات بصرية دقيقة لمتابعة حالة رصد كشوفات الحضور من مربيي الفصول وتنبيه المتأخرين فورياً
            </p>
          </div>

          {/* Quick Progress Bar Indicator */}
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl flex items-center gap-4 min-w-[280px]">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs font-black mb-1.5">
                <span className="text-slate-700">نسبة اكتمال الرصد اليومي</span>
                <span className={stats.pendingCount > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                  {stats.completionRate}% ({stats.submittedCount} من {stats.totalClasses})
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    stats.completionRate === 100 
                      ? 'bg-emerald-500' 
                      : stats.completionRate >= 50 
                        ? 'bg-amber-500' 
                        : 'bg-rose-500'
                  }`}
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
              stats.pendingCount === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {stats.pendingCount === 0 ? <CheckCheck className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />}
            </div>
          </div>
        </div>

        {/* 🔴 Status Indicators Live Matrix Bar (مصفوفة شارات الحالة اللحظية لجميع الفصول) */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 rounded-2xl text-white shadow-md border border-slate-700 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="font-black text-slate-200">مصفوفة المؤشرات البصرية المباشرة لكافة الفصول:</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span>تم الرصد ({stats.submittedCount})</span>
              </span>
              <span className="flex items-center gap-1.5 text-rose-300">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <span>لم ترصد بعد ({stats.pendingCount})</span>
              </span>
            </div>
          </div>

          {/* Quick Matrix Class Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {stats.classStatuses.map(cls => {
              const isSub = cls.isSubmitted;
              return (
                <button
                  key={cls.id}
                  onClick={() => {
                    if (isSub) {
                      onOpenClassSheet(cls.id);
                    } else {
                      setSelectedStatusFilter('pending');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 border shadow-sm ${
                    isSub
                      ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border-emerald-600/60'
                      : 'bg-rose-950/90 hover:bg-rose-900 text-rose-100 border-rose-500/80 animate-pulse ring-1 ring-rose-400/40'
                  }`}
                  title={isSub ? `فصل ${cls.name}: تم الرصد بنجاح (انقر لعرض الكشف)` : `فصل ${cls.name}: لم يتم الرصد بعد - المعلم: ${cls.teacherName}`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSub ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'}`} />
                  <span>{cls.name}</span>
                  <span>{isSub ? '✓' : '⏳'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ⚠️ Priority Alert Panel for Unsubmitted Classes (لوحة تنبيه الفصول المتأخرة عن الرصد) */}
        {pendingClassesList.length > 0 ? (
          <div className="bg-gradient-to-r from-rose-50 via-amber-50/60 to-rose-50 border-2 border-rose-200 p-5 rounded-3xl space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
                  <AlertCircle className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-black text-rose-900 text-sm flex items-center gap-2">
                    <span>تنبيه عاجل: متبقي ({pendingClassesList.length}) فصول لم تقم برصد الحصة الثانية حتى الآن</span>
                    <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">مطلوب المتابعة</span>
                  </h4>
                  <p className="text-xs text-rose-700 font-semibold mt-0.5">
                    يرجى التواصل الفوري مع مربيي الفصول الموضحين أدناه أو الرصد بالإنابة لضمان اكتمال إحصائيات المدرسة
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleNudgeAllPending}
                  className="px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-rose-600/20"
                  title="إرسال تنبيه جماعي عبر النظام لكافة المعلمين المتأخرين عن الرصد"
                >
                  <Bell className="w-4 h-4 animate-bounce" />
                  <span>تنبيه جماعي لجميع الفصول المتأخرة ({pendingClassesList.length}) 📢</span>
                </button>

                <button
                  onClick={() => setIsTeacherReminderModalOpen(true)}
                  className="px-3.5 py-2 bg-white hover:bg-rose-100/60 text-rose-800 border border-rose-300 text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <MessageSquare className="w-4 h-4 text-rose-600" />
                  <span>رسائل واتساب المعلمين</span>
                </button>
              </div>
            </div>

            {/* Quick Unsubmitted Classes List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {pendingClassesList.map(cls => {
                const isReminded = remindedTeachers[cls.teacherId];
                return (
                  <div
                    key={cls.id}
                    className="bg-white p-3.5 rounded-2xl border border-rose-200/90 shadow-sm flex flex-col justify-between space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                        </span>
                        <span className="font-black text-xs text-slate-900">{cls.name}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md">
                          {cls.gradeLevel}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200">
                        لم يرصد ⏳
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block">مربي الفصل:</span>
                        <span className="font-bold text-slate-800">{cls.teacherName || 'غير مسند'}</span>
                      </div>
                      {cls.roomNumber && (
                        <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          قاعة {cls.roomNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        onClick={() => handleSendReminder(cls.teacherName, cls.name, cls.teacherId)}
                        disabled={isReminded}
                        className={`flex-1 py-1.5 rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1 ${
                          isReminded 
                            ? 'bg-slate-100 text-slate-400 border border-slate-200' 
                            : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm'
                        }`}
                      >
                        <Bell className="w-3 h-3" />
                        <span>{isReminded ? 'تم التذكير ✓' : 'تذكير عاجل'}</span>
                      </button>

                      <button
                        onClick={() => onOpenClassSheet(cls.id)}
                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black rounded-xl transition flex items-center gap-1 shadow-sm"
                        title="رصد الحضور فورياً بالإنابة من قبل الإدارة"
                      >
                        <FileCheck className="w-3 h-3" />
                        <span>رصد نيابة</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>مبارك! اكتمل رصد الحصة الثانية لكافة فصول المدرسة بنجاح (100%) ولا توجد أي فصول متأخرة اليوم.</span>
            </div>
            <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-xl">
              مكتمل 100% ✓
            </span>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>تصفية الحالة:</span>
            </span>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setSelectedStatusFilter('all')}
                className={`px-3 py-1 rounded-xl transition flex items-center gap-1.5 ${
                  selectedStatusFilter === 'all' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>الكل</span>
                <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full">
                  {stats.totalClasses}
                </span>
              </button>

              <button
                onClick={() => setSelectedStatusFilter('pending')}
                className={`px-3 py-1 rounded-xl transition flex items-center gap-1.5 ${
                  selectedStatusFilter === 'pending' 
                    ? 'bg-rose-600 text-white shadow-sm font-black' 
                    : 'text-rose-700 hover:bg-rose-100/60'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span>لم ترصد بعد ⏳</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  selectedStatusFilter === 'pending' ? 'bg-rose-800 text-white' : 'bg-rose-200 text-rose-800'
                }`}>
                  {stats.pendingCount}
                </span>
              </button>

              <button
                onClick={() => setSelectedStatusFilter('submitted')}
                className={`px-3 py-1 rounded-xl transition flex items-center gap-1.5 ${
                  selectedStatusFilter === 'submitted' 
                    ? 'bg-emerald-600 text-white shadow-sm font-black' 
                    : 'text-emerald-700 hover:bg-emerald-100/60'
                }`}
              >
                <span>مكتملة الرصد ✓</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  selectedStatusFilter === 'submitted' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-800'
                }`}>
                  {stats.submittedCount}
                </span>
              </button>
            </div>
          </div>

          {/* Grade filter & Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث بالفصل أو المعلم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 pr-8 pl-3 py-1.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition w-44"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Grade Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setSelectedGradeFilter('all')}
                className={`px-2.5 py-1 rounded-xl transition ${selectedGradeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                كافة الصفوف
              </button>
              <button
                onClick={() => setSelectedGradeFilter('الصف الرابع')}
                className={`px-2.5 py-1 rounded-xl transition ${selectedGradeFilter === 'الصف الرابع' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                الرابع
              </button>
              <button
                onClick={() => setSelectedGradeFilter('الصف الخامس')}
                className={`px-2.5 py-1 rounded-xl transition ${selectedGradeFilter === 'الصف الخامس' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                الخامس
              </button>
              <button
                onClick={() => setSelectedGradeFilter('الصف السادس')}
                className={`px-2.5 py-1 rounded-xl transition ${selectedGradeFilter === 'الصف السادس' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                السادس
              </button>
            </div>
          </div>
        </div>

        {/* Classes Cards Grid with Visual Status Badges */}
        {filteredClassStatuses.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <p className="text-xs font-bold text-slate-500">لا توجد فصول دراسية تطابق معايير التصفية والبحث المحددة.</p>
            <button
              onClick={() => { setSelectedGradeFilter('all'); setSelectedStatusFilter('all'); setSearchQuery(''); }}
              className="text-xs font-black text-emerald-600 hover:underline"
            >
              إعادة ضبط الفلاتر
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClassStatuses.map(cls => {
              const isSubmitted = cls.isSubmitted;
              const sub = cls.submission;
              const isReminded = remindedTeachers[cls.teacherId];

              return (
                <div
                  key={cls.id}
                  className={`p-5 rounded-3xl border-2 transition-all relative overflow-hidden ${
                    isSubmitted 
                      ? 'bg-gradient-to-b from-emerald-50/50 via-white to-white border-emerald-300/80 shadow-sm hover:border-emerald-400' 
                      : 'bg-gradient-to-b from-rose-50/60 via-amber-50/20 to-white border-rose-300 shadow-md hover:border-rose-400 ring-2 ring-rose-100'
                  }`}
                >
                  {/* Status Indicator Stripe on Top */}
                  <div className={`absolute top-0 inset-x-0 h-1.5 ${
                    isSubmitted ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                  }`} />

                  {/* Card Top Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm relative ${
                        isSubmitted ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}>
                        {cls.shortName}
                        {!isSubmitted && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border border-white"></span>
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-black text-slate-900">{cls.name}</h4>
                          {cls.roomNumber && (
                            <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.2 rounded">
                              {cls.roomNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-bold">{cls.teacherName || 'مربي الفصل غير محدد'}</p>
                      </div>
                    </div>

                    {/* Prominent Visual Status Badge */}
                    <span className={`text-[11px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 border shadow-sm ${
                      isSubmitted 
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                        : 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse font-black'
                    }`}>
                      {isSubmitted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>تم الرصد والاعتماد ✓</span>
                        </>
                      ) : (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                          </span>
                          <span>لم يتم الرصد بعد ⏳</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Sub details & Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {isSubmitted && sub ? (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                            <span className="block text-[10px] text-emerald-600 font-bold">حضور</span>
                            <span className="font-black text-emerald-700 text-sm">{sub.presentCount}</span>
                          </div>
                          <div className="bg-rose-50 p-2 rounded-xl border border-rose-200">
                            <span className="block text-[10px] text-rose-600 font-bold">غياب</span>
                            <span className="font-black text-rose-700 text-sm">{sub.absentCount}</span>
                          </div>
                          <div className="bg-blue-50 p-2 rounded-xl border border-blue-200">
                            <span className="block text-[10px] text-blue-600 font-bold">بعذر</span>
                            <span className="font-black text-blue-700 text-sm">{sub.excusedCount}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold pt-1">
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>اعتماد: {new Date(sub.submittedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>
                          <button
                            onClick={() => onOpenClassSheet(cls.id)}
                            className="text-emerald-700 hover:text-emerald-900 font-black flex items-center gap-1 hover:underline bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>عرض وتعديل الكشف</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-2xl text-xs text-rose-800 font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>لم يقم المعلم برفع كشف الحصة الثانية بعد.</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSendReminder(cls.teacherName, cls.name, cls.teacherId)}
                            disabled={isReminded}
                            className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm ${
                              isReminded
                                ? 'bg-slate-100 text-slate-400 border border-slate-200'
                                : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                            }`}
                          >
                            <Bell className="w-3.5 h-3.5" />
                            <span>{isReminded ? 'تم إرسال التذكير ✓' : 'إرسال تذكير عاجل للمعلم'}</span>
                          </button>
                          
                          <button
                            onClick={() => onOpenClassSheet(cls.id)}
                            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1 shadow-sm"
                            title="رصد الحضور فورياً بالإنابة من قبل الإدارة"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>رصد نيابة</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Analytics & Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black font-brand text-slate-900">مسار نسبة الحضور الأسبوعي</h4>
              <p className="text-xs text-slate-400">معدل التزام طلاب المدرسة خلال أيام الأسبوع</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">
              المعدل العام: 95.4%
            </span>
          </div>

          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis domain={[80, 100]} stroke="#94a3b8" fontSize={11} unit="%" />
                <Tooltip 
                  formatter={(value: any) => [`${value}%`, 'نسبة الحضور']}
                  labelStyle={{ textAlign: 'right' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="attendance" 
                  stroke="#059669" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorAttendance)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Absence Reasons Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black font-brand text-slate-900">توزيع أسباب الغياب المرصودة</h4>
              <p className="text-xs text-slate-400">تصنيف الأعذار المقدمة والحالات المرضية</p>
            </div>
            <button 
              onClick={() => onNavigateToTab('ai-advisor')}
              className="text-xs text-purple-700 bg-purple-50 px-3 py-1 rounded-xl font-bold flex items-center gap-1 hover:bg-purple-100 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>تحليل ذكي (AI)</span>
            </button>
          </div>

          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reasonData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {reasonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value} حالات`, 'العدد']} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  formatter={(value) => <span className="text-xs font-bold text-slate-700">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Database Performance & Archiving Card */}
      {onOpenArchivingModal && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-700/80">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Archive className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-white">إدارة وأرشفة سجلات الغياب القديمة (Data Archiving)</h4>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  أداء النظام: ممتاز
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl">
                يتيح النظام أرشفة كشوفات الغياب التي تجاوزت مدة 3 أشهر لعزلها وتخفيف الحمل على قاعدة البيانات النشطة وتسريع لوحات المتابعة، مع إمكانية استرجاعها بضغطة زر.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenArchivingModal}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-2 shadow-lg shadow-amber-500/20 shrink-0"
          >
            <Archive className="w-4 h-4" />
            <span>فتح مركز الأرشفة والاسترجاع 📦</span>
          </button>
        </div>
      )}

      {/* Teacher Reminder & Broadcast Modal */}
      <TeacherReminderModal
        isOpen={isTeacherReminderModalOpen}
        onClose={() => setIsTeacherReminderModalOpen(false)}
        currentUser={currentUser}
        settings={settings}
        simulatedTime={simulatedTime}
        onOpenClassSheet={onOpenClassSheet}
      />
    </div>
  );
};

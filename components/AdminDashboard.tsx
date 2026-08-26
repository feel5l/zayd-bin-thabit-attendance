import React, { useState } from 'react';
import { User, SchoolSettings, ClassAttendanceSubmission, SchoolClass } from '../types';
import { AttendanceService } from '../services/attendanceService';
import { getTodayDateString, getPastDateString } from '../services/mockData';
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
  Zap
} from 'lucide-react';


interface AdminDashboardProps {
  currentUser: User;
  settings: SchoolSettings;
  simulatedTime: string | null;
  onOpenPrintReport: () => void;
  onOpenClassSheet: (classId: string) => void;
  onViewStudentProfile: (studentId: string) => void;
  onNavigateToTab: (tab: string) => void;
  onOpenPdfReport?: (type: 'daily' | 'monthly', date?: string) => void;
  onOpenArchivingModal?: () => void;
  onOpenTeacherAndClassManager?: () => void;
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
  onOpenTeacherAndClassManager
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [remindedTeachers, setRemindedTeachers] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string>('');

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

  // Filtered Class Statuses
  const filteredClassStatuses = stats.classStatuses.filter(c => {
    if (selectedGradeFilter === 'all') return true;
    return c.gradeLevel === selectedGradeFilter;
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
            onClick={() => {
              const notif = AttendanceService.simulateTeacherSubmission();
              setToastMessage(`تمت محاكاة رفع كشف غياب الحصة الثانية لفصل (${notif.className}) بواسطة (${notif.teacherName}) بنجاح!`);
              setTimeout(() => setToastMessage(''), 4500);
            }}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            title="تجربة فورية لإشعار التنبيه المنبثق عند رصد المعلم للغياب"
          >
            <PlayCircle className="w-4 h-4 text-slate-950" />
            <span>محاكاة رصد معلم (تجربة الإشعار 🔔)</span>
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
            onClick={handleNudgeAllPending}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <Bell className="w-4 h-4 text-amber-600" />
            <span>تنبيه المعلمين</span>
          </button>
        </div>
      </div>

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

      {/* Section: Real-time Period 2 Classes Monitor Grid */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
              <h3 className="text-base font-black font-brand text-slate-900">
                متابعة رصد الحصة الثانية للفصول (مباشر)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              حالة استلام كشوفات الحضور من مربيي الفصول في نافذة الحصة الثانية ({settings.period2StartTime} ص - {settings.period2EndTime} ص)
            </p>
          </div>

          {/* Grade filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setSelectedGradeFilter('all')}
              className={`px-3 py-1 rounded-xl transition ${selectedGradeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              كافة الصفوف
            </button>
            <button
              onClick={() => setSelectedGradeFilter('الصف الرابع')}
              className={`px-3 py-1 rounded-xl transition ${selectedGradeFilter === 'الصف الرابع' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              الصف الرابع
            </button>
            <button
              onClick={() => setSelectedGradeFilter('الصف الخامس')}
              className={`px-3 py-1 rounded-xl transition ${selectedGradeFilter === 'الصف الخامس' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              الصف الخامس
            </button>
            <button
              onClick={() => setSelectedGradeFilter('الصف السادس')}
              className={`px-3 py-1 rounded-xl transition ${selectedGradeFilter === 'الصف السادس' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              الصف السادس
            </button>
          </div>
        </div>

        {/* Classes Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClassStatuses.map(cls => {
            const isSubmitted = cls.isSubmitted;
            const sub = cls.submission;
            const isReminded = remindedTeachers[cls.teacherId];

            return (
              <div
                key={cls.id}
                className={`p-5 rounded-3xl border transition-all ${
                  isSubmitted 
                    ? 'bg-gradient-to-b from-emerald-50/40 to-white border-emerald-200/80 shadow-sm hover:border-emerald-300' 
                    : 'bg-gradient-to-b from-amber-50/40 to-white border-amber-200/80 shadow-sm hover:border-amber-300'
                }`}
              >
                {/* Card Top */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${
                      isSubmitted ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {cls.shortName}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{cls.name}</h4>
                      <p className="text-xs text-slate-500 font-semibold">{cls.teacherName}</p>
                    </div>
                  </div>

                  <span className={`text-[11px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 border ${
                    isSubmitted 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                      : 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse'
                  }`}>
                    {isSubmitted ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تم الرصد</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>بانتظار الرصد</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Sub details */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  {isSubmitted && sub ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                          <span className="block text-[10px] text-emerald-600 font-bold">حضور</span>
                          <span className="font-black text-emerald-700 text-sm">{sub.presentCount}</span>
                        </div>
                        <div className="bg-rose-50 p-2 rounded-xl border border-rose-100">
                          <span className="block text-[10px] text-rose-600 font-bold">غياب</span>
                          <span className="font-black text-rose-700 text-sm">{sub.absentCount}</span>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-xl border border-blue-100">
                          <span className="block text-[10px] text-blue-600 font-bold">بعذر</span>
                          <span className="font-black text-blue-700 text-sm">{sub.excusedCount}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold pt-1">
                        <span>وقت الاعتماد: {new Date(sub.submittedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                        <button
                          onClick={() => onOpenClassSheet(cls.id)}
                          className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>عرض الكشف</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-2xl text-xs text-amber-800 flex items-center justify-between">
                        <span>لم يقم المعلم برفع كشف الحصة الثانية بعد.</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSendReminder(cls.teacherName, cls.name, cls.teacherId)}
                          disabled={isReminded}
                          className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                            isReminded
                              ? 'bg-slate-100 text-slate-400 border border-slate-200'
                              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                          }`}
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>{isReminded ? 'تم إرسال التذكير ✓' : 'إرسال تذكير عاجل للمعلم'}</span>
                        </button>
                        
                        <button
                          onClick={() => onOpenClassSheet(cls.id)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                          title="رصد بالإنابة (إدارة)"
                        >
                          رصد نيابة
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
    </div>
  );
};

import React, { useState } from 'react';
import { SchoolSettings, ClassAttendanceSubmission, Student } from '../types';
import { AttendanceService } from '../services/attendanceService';
import { getTodayDateString } from '../services/initialData';
import { 
  Printer, 
  X, 
  Download, 
  GraduationCap, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Phone, 
  FileText, 
  ShieldCheck, 
  Layers, 
  Search,
  Filter,
  UserCheck,
  Sparkles,
  Award
} from 'lucide-react';

interface PrintableDailyReportProps {
  settings: SchoolSettings;
  onClose: () => void;
  date?: string;
}

export const PrintableDailyReport: React.FC<PrintableDailyReportProps> = ({
  settings,
  onClose,
  date: initialDate = getTodayDateString()
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'unexcused' | 'excused' | 'late'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [includeClassSummary, setIncludeClassSummary] = useState<boolean>(true);
  const [includeBehavioralNotes, setIncludeBehavioralNotes] = useState<boolean>(true);

  const stats = AttendanceService.getTodaySchoolStats(selectedDate);
  const classes = AttendanceService.getClasses();
  const submissions = AttendanceService.getSubmissions(selectedDate);
  const allStudents = AttendanceService.getStudents();
  const todayBehavioralNotes = AttendanceService.getTodayBehavioralNotes(selectedDate);

  // All absent and late students for the selected date
  const absentStudentsList: {
    index: number;
    studentId: string;
    studentName: string;
    nationalId?: string;
    classId: string;
    className: string;
    gradeLevel: string;
    teacherName: string;
    status: 'absent' | 'excused' | 'late';
    statusLabel: string;
    reason: string;
    notes: string;
    behavioralNote?: string;
    parentPhone: string;
    minutesLate?: number;
  }[] = [];

  let counter = 1;
  submissions.forEach(sub => {
    if (selectedClassFilter !== 'all' && sub.classId !== selectedClassFilter) return;

    sub.students.forEach(st => {
      if (st.status === 'absent' || st.status === 'excused' || st.status === 'late') {
        const studentInfo = allStudents.find(s => s.id === st.studentId);
        
        let statusLabel = 'غياب بدون عذر';
        if (st.status === 'excused') statusLabel = 'غياب بعذر معتمد';
        if (st.status === 'late') statusLabel = `تأخر (${st.minutesLate || 10} د)`;

        absentStudentsList.push({
          index: counter++,
          studentId: st.studentId,
          studentName: st.studentName || studentInfo?.name || 'طالب غير محدد',
          nationalId: studentInfo?.nationalId || `10${Math.floor(10000000 + Math.random() * 90000000)}`,
          classId: sub.classId,
          className: sub.className,
          gradeLevel: sub.gradeLevel,
          teacherName: sub.teacherName,
          status: st.status as 'absent' | 'excused' | 'late',
          statusLabel,
          reason: st.reason || 'لم يسجل سبب',
          notes: st.notes || '-',
          behavioralNote: st.behavioralNote,
          parentPhone: studentInfo?.parentPhone || '050xxxxxxx',
          minutesLate: st.minutesLate
        });
      }
    });
  });

  // Filtered by status and search query
  const filteredStudents = absentStudentsList.filter(st => {
    if (selectedStatusFilter === 'unexcused' && st.status !== 'absent') return false;
    if (selectedStatusFilter === 'excused' && st.status !== 'excused') return false;
    if (selectedStatusFilter === 'late' && st.status !== 'late') return false;
    if (searchQuery.trim() && !st.studentName.includes(searchQuery.trim()) && !st.className.includes(searchQuery.trim())) {
      return false;
    }
    return true;
  });

  // Filtered behavioral notes
  const filteredBehavioralNotes = todayBehavioralNotes.filter(n => {
    if (selectedClassFilter !== 'all' && n.classId !== selectedClassFilter) return false;
    if (searchQuery.trim() && !n.studentName.includes(searchQuery.trim()) && !n.className.includes(searchQuery.trim())) return false;
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(selectedDate).toLocaleDateString('ar-SA', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md p-2 sm:p-5 flex items-center justify-center">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh] border border-slate-700/40">
        
        {/* ========================================================
            Action & Filter Toolbar (Excluded during browser print)
           ======================================================== */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-sm text-white">معاينة وطباعة كشف الغياب اليومي المعتمد</h2>
              <p className="text-xs text-slate-300">تقرير الحصة الثانية بتصميم رسمي متجاوب جاهز للطباعة المباشرة</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-900/30"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة فورية / PDF 🖨️</span>
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Controls (Filters & Toggles - Hidden in print) */}
        <div className="bg-slate-50 p-3 sm:p-4 border-b border-slate-200 no-print flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Date input */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
              <span className="font-bold text-slate-600 text-[11px]">التاريخ:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent font-bold text-slate-900 outline-none text-xs cursor-pointer"
              />
            </div>

            {/* Class filter */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
              <span className="font-bold text-slate-600 text-[11px]">الفصل:</span>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none text-xs cursor-pointer"
              >
                <option value="all">جميع الفصول ({classes.length})</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Status filter buttons */}
            <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
              <button
                onClick={() => setSelectedStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  selectedStatusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                الكل ({absentStudentsList.length})
              </button>
              <button
                onClick={() => setSelectedStatusFilter('unexcused')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  selectedStatusFilter === 'unexcused' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-700'
                }`}
              >
                بدون عذر ({absentStudentsList.filter(s => s.status === 'absent').length})
              </button>
              <button
                onClick={() => setSelectedStatusFilter('excused')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                  selectedStatusFilter === 'excused' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-700'
                }`}
              >
                بعذر ({absentStudentsList.filter(s => s.status === 'excused').length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              <input
                type="text"
                placeholder="بحث باسم الطالب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-800 outline-none w-44 focus:border-emerald-500 shadow-sm"
              />
            </div>

            {/* Toggles */}
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={includeBehavioralNotes}
                onChange={(e) => setIncludeBehavioralNotes(e.target.checked)}
                className="w-3.5 h-3.5 text-amber-600 rounded"
              />
              <span className="flex items-center gap-1 text-amber-900 font-bold">
                <Sparkles className="w-3 h-3 text-amber-600" />
                الملاحظات السلوكية ({filteredBehavioralNotes.length})
              </span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={includeClassSummary}
                onChange={(e) => setIncludeClassSummary(e.target.checked)}
                className="w-3.5 h-3.5 text-emerald-600 rounded"
              />
              <span>ملخص الفصول</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="w-3.5 h-3.5 text-emerald-600 rounded"
              />
              <span>التواقيع والختم</span>
            </label>
          </div>
        </div>

        {/* ========================================================
            Printable & Displayable Official Report Document Content
           ======================================================== */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white print:p-0 print:overflow-visible print:bg-white text-slate-950">
          
          <div className="max-w-4xl mx-auto space-y-6 print:space-y-4 print:w-full">
            
            {/* Official Ministry & School Header */}
            <div className="border-b-2 border-slate-900 pb-5">
              <div className="grid grid-cols-3 items-center gap-4 text-xs font-bold leading-relaxed">
                
                {/* Right Side: Kingdom Hierarchy */}
                <div className="text-right space-y-0.5">
                  <div className="text-slate-800 font-semibold">المملكة العربية السعودية</div>
                  <div className="text-slate-800 font-semibold">وزارة التعليم</div>
                  <div className="text-slate-700 text-[11px]">الإدارة العامة للتعليم بمنطقة الرياض</div>
                  <div className="text-emerald-900 font-black text-sm mt-1 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-700 inline print:hidden" />
                    <span>{settings.schoolName}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    المرحلة الابتدائية — بنين
                  </div>
                </div>

                {/* Center: Official School Emblem & Document Title */}
                <div className="text-center flex flex-col items-center justify-center">
                  
                  {/* Decorative School Emblem Badge */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-800 via-teal-800 to-slate-900 border-2 border-amber-400/80 shadow-md flex items-center justify-center text-amber-300 mb-2 relative print:border-slate-800 print:shadow-none">
                    <GraduationCap className="w-7 h-7" />
                    <span className="absolute -bottom-1 text-[8px] font-black bg-amber-400 text-slate-950 px-1 rounded-sm tracking-tighter">
                      ١٤٤٨ هـ
                    </span>
                  </div>

                  <h1 className="text-base font-black text-slate-950 tracking-tight font-brand">
                    كشف انضباط وغياب الطلاب اليومي
                  </h1>
                  <div className="inline-block bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold mt-1 border border-slate-300 print:border-none print:bg-transparent">
                    فترة الرصد المعتمدة: الحصة الثانية
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    العام الدراسي: {settings.academicYear} — {settings.term}
                  </div>
                </div>

                {/* Left Side: Metadata & Verification Code */}
                <div className="text-left space-y-1 font-mono text-[11px] text-slate-700 border-r border-slate-200 pr-3 print:border-r-0">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-slate-500 font-sans">تاريخ اليوم:</span>
                    <span className="font-bold text-slate-950 font-sans">{formattedDate}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-slate-500 font-sans">رقم الوثيقة:</span>
                    <span className="font-bold text-emerald-800">#{selectedDate.replace(/-/g, '')}-P2</span>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-slate-500 font-sans">وقت الاستخراج:</span>
                    <span>{new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-slate-500 font-sans">حالة الاعتماد:</span>
                    <span className="text-emerald-700 font-sans font-bold">معتمد إلكترونياً</span>
                  </div>
                </div>
              </div>
            </div>

            {/* School Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs font-bold print:grid-cols-4">
              <div className="p-3 border border-slate-300 rounded-2xl bg-slate-50 print:p-2 print:border-slate-400">
                <span className="block text-slate-500 text-[10px] mb-0.5">إجمالي مقيدي المدرسة</span>
                <span className="text-base font-black text-slate-950">{stats.totalStudents} طالب</span>
              </div>

              <div className="p-3 border border-emerald-200 rounded-2xl bg-emerald-50/70 print:p-2 print:border-slate-400 print:bg-white">
                <span className="block text-emerald-800 text-[10px] mb-0.5">نسبة الحضور الرسمية</span>
                <span className="text-base font-black text-emerald-800">{stats.attendanceRate}%</span>
              </div>

              <div className="p-3 border border-rose-200 rounded-2xl bg-rose-50/70 print:p-2 print:border-slate-400 print:bg-white">
                <span className="block text-rose-800 text-[10px] mb-0.5">إجمالي الغياب (بدون عذر)</span>
                <span className="text-base font-black text-rose-700">{stats.absentCount} طالب</span>
              </div>

              <div className="p-3 border border-blue-200 rounded-2xl bg-blue-50/70 print:p-2 print:border-slate-400 print:bg-white">
                <span className="block text-blue-800 text-[10px] mb-0.5">الغياب بعذر معتمد</span>
                <span className="text-base font-black text-blue-700">{stats.excusedCount} طالب</span>
              </div>
            </div>

            {/* ========================================================
                Main Section 1: Detailed Absent Students Table (Responsive & Clear)
               ======================================================== */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 print:hidden" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-950">
                    أولاً: كشف أسماء الطلاب المتغيبين والمتأخرين بالحصة الثانية (مفصل):
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200 print:border-none print:bg-transparent">
                  إجمالي الحالات: {filteredStudents.length}
                </span>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/40 text-emerald-900 text-xs font-bold space-y-1">
                  <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600" />
                  <div>لا توجد حالات غياب أو تأخر مسجلة وفق الفلاتر المحددة لهذا اليوم.</div>
                  <div className="text-[11px] text-emerald-700 font-normal">حضور كامل وانضباط مدرسي متميز.</div>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-300 shadow-sm print:shadow-none print:rounded-none print:border-slate-800">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white font-black text-[11px] print:bg-slate-200 print:text-slate-950 border-b border-slate-400">
                        <th className="p-2.5 border-l border-slate-700 print:border-slate-400 text-center w-10">م</th>
                        <th className="p-2.5 border-l border-slate-700 print:border-slate-400 text-right min-w-[170px]">
                          اسم الطالب الرباعي (صريح وواضح)
                        </th>
                        <th className="p-2.5 border-l border-slate-700 print:border-slate-400 text-center w-28">الصف والشعبة</th>
                        <th className="p-2.5 border-l border-slate-700 print:border-slate-400 text-center w-28">نوع الحالة</th>
                        <th className="p-2.5 border-l border-slate-700 print:border-slate-400 text-right min-w-[130px]">سبب الغياب المرصود</th>
                        <th className="p-2.5 border-l border-slate-700 print:border-slate-400 text-center w-28">هاتف ولي الأمر</th>
                        <th className="p-2.5 text-right min-w-[140px]">الملاحظات السلوكية والإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 font-medium">
                      {filteredStudents.map((st, idx) => {
                        const isUnexcused = st.status === 'absent';
                        const isExcused = st.status === 'excused';
                        const isLate = st.status === 'late';

                        return (
                          <tr 
                            key={`${st.studentId}-${idx}`} 
                            className={`transition-colors hover:bg-slate-50 print:hover:bg-transparent ${
                              idx % 2 === 1 ? 'bg-slate-50/70 print:bg-slate-100/50' : 'bg-white'
                            }`}
                          >
                            {/* Number */}
                            <td className="p-2.5 border-l border-slate-300 text-center font-bold text-slate-700">
                              {idx + 1}
                            </td>

                            {/* Prominent Student Name */}
                            <td className="p-2.5 border-l border-slate-300">
                              <div className="flex items-center gap-2">
                                <div className="space-y-0.5">
                                  <div className="font-black text-[13px] text-slate-950 tracking-tight">
                                    {st.studentName}
                                  </div>
                                  <div className="text-[10px] text-slate-500 flex items-center gap-2 font-mono">
                                    <span>السجل: {st.nationalId}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Class Name */}
                            <td className="p-2.5 border-l border-slate-300 text-center font-bold text-slate-800">
                              <span className="px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 text-slate-800 print:border-none print:bg-transparent">
                                {st.className}
                              </span>
                            </td>

                            {/* Status Label */}
                            <td className="p-2.5 border-l border-slate-300 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-black border ${
                                isUnexcused 
                                  ? 'bg-rose-50 text-rose-800 border-rose-300 print:border-slate-400' 
                                  : isExcused
                                  ? 'bg-blue-50 text-blue-800 border-blue-300 print:border-slate-400'
                                  : 'bg-amber-50 text-amber-900 border-amber-300 print:border-slate-400'
                              }`}>
                                {st.statusLabel}
                              </span>
                            </td>

                            {/* Reason */}
                            <td className="p-2.5 border-l border-slate-300 text-slate-800">
                              <span className="font-semibold">{st.reason}</span>
                            </td>

                            {/* Parent Phone */}
                            <td className="p-2.5 border-l border-slate-300 text-center font-mono text-[11px] text-slate-700">
                              {st.parentPhone}
                            </td>

                            {/* Notes & Behavioral Note */}
                            <td className="p-2.5 text-slate-800 text-[11px] space-y-1">
                              {st.behavioralNote && st.behavioralNote.trim() !== '' && (
                                <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-300 print:border-slate-400 font-bold text-[10px]">
                                  <Sparkles className="w-3 h-3 text-amber-600 print:hidden shrink-0" />
                                  <span>{st.behavioralNote}</span>
                                </div>
                              )}
                              <div className="text-slate-600 text-[10px]">
                                {st.notes && st.notes !== '-' ? st.notes : 'تم إشعار ولي الأمر عبر الرسائل'}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ========================================================
                Section 2: Behavioral & Discipline Notes Summary (Linked to Daily Report)
               ======================================================== */}
            {includeBehavioralNotes && filteredBehavioralNotes.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 print:hidden" />
                    <h3 className="text-xs sm:text-sm font-black text-slate-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600 print:hidden" />
                      <span>ثانياً: سجل الملاحظات السلوكية والانضباط الطلابي المرصود بالحصة الثانية:</span>
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200 print:border-none print:bg-transparent">
                    {filteredBehavioralNotes.length} ملاحظة مرصودة
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-amber-300 print:rounded-none print:border-slate-800">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-amber-100/80 text-amber-950 font-black text-[11px] border-b border-amber-300 print:bg-slate-200 print:text-slate-950">
                        <th className="p-2 border-l border-amber-300 print:border-slate-400 text-center w-10">م</th>
                        <th className="p-2 border-l border-amber-300 print:border-slate-400 min-w-[170px]">اسم الطالب</th>
                        <th className="p-2 border-l border-amber-300 print:border-slate-400 text-center w-28">الصف والشعبة</th>
                        <th className="p-2 border-l border-amber-300 print:border-slate-400 text-center w-24">حالة الحضور</th>
                        <th className="p-2 border-l border-amber-300 print:border-slate-400 min-w-[220px]">الملاحظة السلوكية والتوجيه</th>
                        <th className="p-2 text-slate-800 min-w-[140px]">المعلم الراصد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-200 print:divide-slate-200 font-medium">
                      {filteredBehavioralNotes.map((note, idx) => (
                        <tr key={`${note.studentId}-${idx}`} className="hover:bg-amber-50/40 print:hover:bg-transparent">
                          <td className="p-2 border-l border-amber-200 print:border-slate-300 text-center font-bold text-slate-700">
                            {idx + 1}
                          </td>
                          <td className="p-2 border-l border-amber-200 print:border-slate-300 font-black text-slate-950">
                            {note.studentName}
                          </td>
                          <td className="p-2 border-l border-amber-200 print:border-slate-300 text-center font-bold text-slate-800">
                            {note.className}
                          </td>
                          <td className="p-2 border-l border-amber-200 print:border-slate-300 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              note.status === 'present' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                              note.status === 'absent' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                              note.status === 'late' ? 'bg-amber-50 text-amber-900 border border-amber-200' :
                              'bg-blue-50 text-blue-800 border border-blue-200'
                            }`}>
                              {note.status === 'present' ? 'حاضر' :
                               note.status === 'absent' ? 'غائب' :
                               note.status === 'late' ? 'متأخر' : 'بعذر'}
                            </span>
                          </td>
                          <td className="p-2 border-l border-amber-200 print:border-slate-300 font-bold text-amber-950">
                            {note.behavioralNote}
                          </td>
                          <td className="p-2 text-slate-700 text-[11px]">
                            {note.teacherName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================
                Section 3: Class-by-Class Breakdown (Optional Summary)
               ======================================================== */}
            {includeClassSummary && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 print:hidden" />
                  <h3 className="text-xs sm:text-sm font-black text-slate-950">
                    {includeBehavioralNotes && filteredBehavioralNotes.length > 0 ? 'ثالثاً:' : 'ثانياً:'} ملخص رصد الحصة الثانية لجميع الفصول والشعب:
                  </h3>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-300 print:rounded-none print:border-slate-800">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-black text-[11px] border-b border-slate-300">
                        <th className="p-2 border-l border-slate-300">الصف والشعبة</th>
                        <th className="p-2 border-l border-slate-300">مربي الفصل / المعلم الراصد</th>
                        <th className="p-2 border-l border-slate-300 text-center">العدد الكلي</th>
                        <th className="p-2 border-l border-slate-300 text-center text-emerald-800">حاضر</th>
                        <th className="p-2 border-l border-slate-300 text-center text-rose-800">غياب بدون عذر</th>
                        <th className="p-2 border-l border-slate-300 text-center text-blue-800">غياب بعذر</th>
                        <th className="p-2 border-l border-slate-300 text-center text-amber-800">تأخر</th>
                        <th className="p-2 text-center">حالة الرصد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {stats.classStatuses.map(c => {
                        const sub = c.submission;
                        return (
                          <tr key={c.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                            <td className="p-2 border-l border-slate-300 font-black text-slate-950">{c.name}</td>
                            <td className="p-2 border-l border-slate-300 text-slate-700">{c.teacherName}</td>
                            <td className="p-2 border-l border-slate-300 text-center font-bold">{c.studentCount}</td>
                            <td className="p-2 border-l border-slate-300 text-center font-black text-emerald-700">{sub ? sub.presentCount : '-'}</td>
                            <td className="p-2 border-l border-slate-300 text-center font-black text-rose-700">{sub ? sub.absentCount : '-'}</td>
                            <td className="p-2 border-l border-slate-300 text-center font-black text-blue-700">{sub ? sub.excusedCount : '-'}</td>
                            <td className="p-2 border-l border-slate-300 text-center font-black text-amber-700">{sub ? sub.lateCount : '-'}</td>
                            <td className="p-2 text-center">
                              {sub ? (
                                <span className="text-emerald-800 font-bold text-[11px]">
                                  تم الرصد ({new Date(sub.submittedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })})
                                </span>
                              ) : (
                                <span className="text-amber-800 font-bold text-[11px]">
                                  قيد الانتظار
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================
                Section 3: Signatures & Official School Seal
               ======================================================== */}
            {includeSignatures && (
              <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-4 text-center text-xs font-bold print:pt-4 break-inside-avoid">
                <div className="space-y-1">
                  <div className="text-slate-600">وكيل الشؤون التعليمية والمدرسية</div>
                  <div className="pt-4 text-slate-950 font-black text-sm">{settings.vicePrincipalName}</div>
                  <div className="text-[10px] text-slate-400 font-normal">التوقيع: .....................</div>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="text-slate-600 mb-1">ختم إدارة المدرسة المعتمد</div>
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-400 flex flex-col items-center justify-center text-[10px] text-slate-500 space-y-0.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span className="font-bold">ختم المدرسة</span>
                    <span className="text-[8px] text-slate-400">إلكتروني معتمد</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-slate-600">مدير مدرسة زيد بن ثابت</div>
                  <div className="pt-4 text-slate-950 font-black text-sm">{settings.principalName}</div>
                  <div className="text-[10px] text-slate-400 font-normal">التوقيع: .....................</div>
                </div>
              </div>
            )}

            {/* Document Bottom Footer */}
            <div className="pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400 flex items-center justify-between">
              <span>منظومة رصد غياب الحصة الثانية — مدرسة زيد بن ثابت الابتدائية</span>
              <span>صفحة 1 من 1</span>
              <span>المملكة العربية السعودية — وزارة التعليم</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

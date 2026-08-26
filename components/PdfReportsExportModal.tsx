import React, { useState, useRef } from 'react';
import { SchoolSettings, MonthlyReportData } from '../types';
import { AttendanceService } from '../services/attendanceService';
import { getTodayDateString } from '../services/mockData';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  FileText, 
  Printer, 
  Download, 
  X, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  GraduationCap, 
  Building2, 
  ShieldCheck, 
  UserCheck, 
  Users, 
  FileSpreadsheet,
  Loader2,
  Sparkles,
  Award,
  Layers,
  ChevronDown
} from 'lucide-react';

interface PdfReportsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SchoolSettings;
  initialReportType?: 'daily' | 'monthly';
  initialDate?: string;
}

export const PdfReportsExportModal: React.FC<PdfReportsExportModalProps> = ({
  isOpen,
  onClose,
  settings,
  initialReportType = 'daily',
  initialDate = getTodayDateString()
}) => {
  const [reportType, setReportType] = useState<'daily' | 'monthly'>(initialReportType);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return initialDate.substring(0, 7) || new Date().toISOString().substring(0, 7);
  });
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [includeSeal, setIncludeSeal] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unexcused' | 'excused'>('all');

  const reportContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const classes = AttendanceService.getClasses();
  const dailyStats = AttendanceService.getTodaySchoolStats(selectedDate);
  const dailySubmissions = AttendanceService.getSubmissions(selectedDate);
  const monthlyData: MonthlyReportData = AttendanceService.getMonthlyReportData(selectedMonth);

  // Daily Absent Students Data
  const dailyAbsentStudentsList: {
    studentId: string;
    studentName: string;
    classId: string;
    className: string;
    gradeLevel: string;
    status: 'absent' | 'excused' | 'late';
    statusArabic: string;
    reason?: string;
    notes?: string;
    minutesLate?: number;
    parentPhone?: string;
  }[] = [];

  dailySubmissions.forEach(sub => {
    if (selectedClassFilter !== 'all' && sub.classId !== selectedClassFilter) return;

    sub.students.forEach(st => {
      if (st.status === 'absent' || st.status === 'excused' || st.status === 'late') {
        const studentInfo = AttendanceService.getStudents().find(s => s.id === st.studentId);
        
        let statusArabic = 'غياب بدون عذر (مؤكد)';
        if (st.status === 'excused') statusArabic = 'غياب بعذر معتمد';
        if (st.status === 'late') statusArabic = `تأخر (${st.minutesLate || 10} د)`;

        dailyAbsentStudentsList.push({
          studentId: st.studentId,
          studentName: st.studentName,
          classId: sub.classId,
          className: sub.className,
          gradeLevel: sub.gradeLevel,
          status: st.status as 'absent' | 'excused' | 'late',
          statusArabic,
          reason: st.reason,
          notes: st.notes,
          minutesLate: st.minutesLate,
          parentPhone: studentInfo?.parentPhone || '050xxxxxxx'
        });
      }
    });
  });

  const filteredDailyAbsentList = dailyAbsentStudentsList.filter(s => {
    if (statusFilter === 'unexcused') return s.status === 'absent';
    if (statusFilter === 'excused') return s.status === 'excused';
    return true;
  });

  // Filtered Monthly data
  const filteredMonthlyClasses = monthlyData.classesSummary.filter(c => {
    if (selectedClassFilter !== 'all' && c.classId !== selectedClassFilter) return false;
    return true;
  });

  const filteredMonthlyStudents = monthlyData.studentsAbsenceList.filter(st => {
    if (selectedClassFilter !== 'all' && !st.className.includes(classes.find(c => c.id === selectedClassFilter)?.name || '')) return false;
    if (statusFilter === 'unexcused') return st.unexcusedDays > 0;
    if (statusFilter === 'excused') return st.excusedDays > 0;
    return true;
  });

  // Handle direct print
  const handlePrint = () => {
    window.print();
  };

  // Handle PDF Download using html2canvas & jsPDF
  const handleExportPDF = async () => {
    if (!reportContainerRef.current) return;
    setIsGeneratingPdf(true);

    try {
      // Small pause to allow render
      await new Promise((resolve) => setTimeout(resolve, 150));

      const element = reportContainerRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution crisp rendering
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1024
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Multi-page handling if content overflows
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const fileName = reportType === 'daily'
        ? `تقرير_الغياب_اليومي_${selectedDate}_مدرسة_زيد_بن_ثابت.pdf`
        : `التقرير_الشهري_للغياب_${selectedMonth}_مدرسة_زيد_بن_ثابت.pdf`;

      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('حدث خطأ أثناء تصدير ملف PDF، يمكنك استخدام خيار الطباعة المباشرة كبديل.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // CSV Export helper
  const handleExportCSV = () => {
    let csvContent = '\uFEFF'; // UTF-8 BOM for Arabic support in Excel

    if (reportType === 'daily') {
      csvContent += 'م,اسم الطالب,الصف والشعبة,حالة الغياب,السبب,الملاحظات,هاتف ولي الأمر\n';
      filteredDailyAbsentList.forEach((st, idx) => {
        csvContent += `${idx + 1},"${st.studentName}","${st.className}","${st.statusArabic}","${st.reason || '-'}","${st.notes || '-'}","${st.parentPhone || '-'}"\n`;
      });
    } else {
      csvContent += 'م,اسم الطالب,الصف والشعبة,غياب بدون عذر,غياب بعذر,أيام التأخر,مجموع الغياب,نسبة الحضور,حالة الغياب المزمن\n';
      filteredMonthlyStudents.forEach((st, idx) => {
        csvContent += `${idx + 1},"${st.studentName}","${st.className}",${st.unexcusedDays},${st.excusedDays},${st.lateDays},${st.totalAbsences},${st.attendanceRate}%,"${st.isChronic ? 'غياب مزمن / متكرر' : 'طبيعي'}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = reportType === 'daily'
      ? `تقرير_الغياب_اليومي_${selectedDate}.csv`
      : `تقرير_الغياب_الشهري_${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center">
      <div className="bg-slate-100 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh]">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 no-print border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">تصدير التقارير الرسمية إلى PDF والطباعة</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
                  اعتماد رسمي
                </span>
              </div>
              <p className="text-xs text-slate-300">
                إصدار كشوف الحضور والغياب اليومية والشهرية بصيغة PDF معتمدة ومطابقة لوزارة التعليم
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Direct PDF Download Button */}
            <button
              onClick={handleExportPDF}
              disabled={isGeneratingPdf}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>جاري إنشاء PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تحميل ملف PDF 📄</span>
                </>
              )}
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-slate-700"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>طباعة فورية</span>
            </button>

            {/* CSV Button */}
            <button
              onClick={handleExportCSV}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border border-slate-700"
              title="تصدير جدول البيانات بصيغة Excel CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Configuration Toolbar (Hidden on print) */}
        <div className="bg-white p-3.5 sm:p-4 border-b border-slate-200 no-print flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Report Type Selector Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              onClick={() => setReportType('daily')}
              className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
                reportType === 'daily'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>التقرير اليومي (الحصة 2)</span>
            </button>

            <button
              onClick={() => setReportType('monthly')}
              className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-2 ${
                reportType === 'monthly'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>التقرير الشهري التراكمي</span>
            </button>
          </div>

          {/* Date / Month Picker */}
          <div className="flex items-center gap-2 flex-wrap">
            {reportType === 'daily' ? (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="font-bold text-slate-500 text-[11px]">تاريخ اليوم:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <span className="font-bold text-slate-500 text-[11px]">الشهر المستهدف:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                />
              </div>
            )}

            {/* Class Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="font-bold text-slate-500 text-[11px]">الفصل:</span>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">جميع فصول المدرسة ({classes.length})</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <span className="font-bold text-slate-500 text-[11px]">الحالة:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'unexcused' | 'excused')}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">جميع الحالات</option>
                <option value="unexcused">غياب بدون عذر فقط</option>
                <option value="excused">غياب معذر فقط</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live Printable / PDF Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 flex justify-center">
          <div 
            ref={reportContainerRef}
            className="w-full max-w-[840px] bg-white rounded-2xl shadow-lg border border-slate-300 p-8 sm:p-12 text-slate-900 space-y-6 print:m-0 print:p-0 print:border-none print:shadow-none"
            style={{ minHeight: '1100px' }}
          >
            {/* Ministry / Official Header */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex items-center justify-between text-xs font-bold leading-relaxed">
                <div className="text-right">
                  <div>المملكة العربية السعودية</div>
                  <div>وزارة التعليم</div>
                  <div>الإدارة العامة للتعليم بمنطقة الرياض</div>
                  <div className="text-emerald-900 font-black text-sm mt-0.5">{settings.schoolName}</div>
                </div>

                {/* Central Emblem Title */}
                <div className="text-center">
                  <div className="inline-block p-1.5 bg-slate-50 border border-slate-300 rounded-full mb-1">
                    <GraduationCap className="w-5 h-5 text-emerald-800 mx-auto" />
                  </div>
                  <h1 className="text-base font-black text-slate-900">
                    {reportType === 'daily'
                      ? 'تقرير انضباط وغياب الطلاب اليومي (الحصة الثانية)'
                      : `التقرير الإحصائي الشهري الشامل لغياب الطلاب (${monthlyData.monthName})`
                    }
                  </h1>
                  <div className="text-xs text-slate-600 mt-0.5">
                    العام الدراسي: {settings.academicYear} — {settings.term}
                  </div>
                  <div className="text-xs font-black text-emerald-900 mt-0.5">
                    {reportType === 'daily'
                      ? `اليوم والتاريخ: ${new Date(selectedDate).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
                      : `عن شهر: ${monthlyData.monthName}`
                    }
                  </div>
                </div>

                <div className="text-left text-[11px] text-slate-600 space-y-0.5 font-mono">
                  <div>كود الوثيقة: #{reportType === 'daily' ? selectedDate.replace(/-/g, '') : selectedMonth.replace(/-/g, '')}-MOE</div>
                  <div>زمن الإصدار: {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                  <div>الصفة: تقرير رسمي معتمد</div>
                </div>
              </div>
            </div>

            {/* Top KPI Metric Cards Grid */}
            <div className="grid grid-cols-4 gap-2.5 text-center text-xs font-bold">
              <div className="p-3 border border-slate-300 rounded-2xl bg-slate-50">
                <span className="block text-slate-500 text-[10px] mb-0.5">إجمالي الطلاب المسجلين</span>
                <span className="text-base font-black text-slate-900">
                  {reportType === 'daily' ? dailyStats.totalStudents : monthlyData.totalSchoolStudents} طالب
                </span>
              </div>

              <div className="p-3 border border-emerald-200 rounded-2xl bg-emerald-50/60">
                <span className="block text-emerald-700 text-[10px] mb-0.5">نسبة الحضور الرسمية</span>
                <span className="text-base font-black text-emerald-800">
                  {reportType === 'daily' ? dailyStats.attendanceRate : monthlyData.schoolAverageAttendanceRate}%
                </span>
              </div>

              <div className="p-3 border border-rose-200 rounded-2xl bg-rose-50/60">
                <span className="block text-rose-700 text-[10px] mb-0.5">غياب بدون عذر (مؤكد)</span>
                <span className="text-base font-black text-rose-700">
                  {reportType === 'daily' ? dailyStats.absentCount : monthlyData.totalUnexcusedAbsentCount}
                </span>
              </div>

              <div className="p-3 border border-blue-200 rounded-2xl bg-blue-50/60">
                <span className="block text-blue-700 text-[10px] mb-0.5">غياب بعذر معتمد</span>
                <span className="text-base font-black text-blue-700">
                  {reportType === 'daily' ? dailyStats.excusedCount : monthlyData.totalExcusedAbsentCount}
                </span>
              </div>
            </div>

            {/* DAILY REPORT CONTENT */}
            {reportType === 'daily' && (
              <>
                {/* 1. Classes Submission Status Table */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-black text-slate-900">
                      أولاً: ملخص رصد الحصة الثانية لجميع الفصول الدراسية:
                    </h3>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      نسبة إنجاز الرصد: {dailyStats.completionRate}%
                    </span>
                  </div>

                  <table className="w-full text-right text-xs border border-slate-300">
                    <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                      <tr>
                        <th className="p-2 border-l border-slate-300">الصف والشعبة</th>
                        <th className="p-2 border-l border-slate-300">مربي الفصل</th>
                        <th className="p-2 border-l border-slate-300 text-center">العدد</th>
                        <th className="p-2 border-l border-slate-300 text-center">حاضر</th>
                        <th className="p-2 border-l border-slate-300 text-center text-rose-700">غياب مؤكد</th>
                        <th className="p-2 border-l border-slate-300 text-center text-blue-700">معذر</th>
                        <th className="p-2 border-l border-slate-300 text-center text-amber-700">تأخر</th>
                        <th className="p-2 text-center">وقت الاعتماد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {dailyStats.classStatuses.map(c => {
                        const sub = c.submission;
                        return (
                          <tr key={c.id}>
                            <td className="p-2 border-l border-slate-300 font-bold">{c.name}</td>
                            <td className="p-2 border-l border-slate-300">{c.teacherName}</td>
                            <td className="p-2 border-l border-slate-300 text-center font-bold">{c.studentCount}</td>
                            <td className="p-2 border-l border-slate-300 text-center text-emerald-700 font-bold">
                              {sub ? sub.presentCount : '-'}
                            </td>
                            <td className="p-2 border-l border-slate-300 text-center text-rose-700 font-bold">
                              {sub ? sub.absentCount : '-'}
                            </td>
                            <td className="p-2 border-l border-slate-300 text-center text-blue-700 font-bold">
                              {sub ? sub.excusedCount : '-'}
                            </td>
                            <td className="p-2 border-l border-slate-300 text-center text-amber-700 font-bold">
                              {sub ? sub.lateCount : '-'}
                            </td>
                            <td className="p-2 text-center font-bold text-[11px]">
                              {sub ? `${new Date(sub.submittedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}` : 'بانتظار الرصد'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 2. Detailed Absent Students List */}
                <div>
                  <h3 className="text-xs font-black mb-2 text-slate-900 flex items-center justify-between">
                    <span>ثانياً: بيان وتفصيل أسماء الطلاب الغائبين في الحصة الثانية:</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      (العدد الإجمالي: {filteredDailyAbsentList.length} طالب)
                    </span>
                  </h3>

                  {filteredDailyAbsentList.length === 0 ? (
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-center text-xs font-bold text-emerald-800">
                      ✨ لم يُسجل أي غياب أو تأخر في هذا اليوم، حضور كامل بنسبة 100%.
                    </div>
                  ) : (
                    <table className="w-full text-right text-xs border border-slate-300">
                      <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                        <tr>
                          <th className="p-2 border-l border-slate-300 w-8 text-center">م</th>
                          <th className="p-2 border-l border-slate-300">اسم الطالب</th>
                          <th className="p-2 border-l border-slate-300">الصف والشعبة</th>
                          <th className="p-2 border-l border-slate-300 text-center">نوع الغياب</th>
                          <th className="p-2 border-l border-slate-300">السبب المرصود</th>
                          <th className="p-2 border-l border-slate-300">الملاحظات</th>
                          <th className="p-2 text-center font-mono">هاتف ولي الأمر</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredDailyAbsentList.map((st, idx) => (
                          <tr key={idx} className={st.status === 'absent' ? 'bg-rose-50/30' : ''}>
                            <td className="p-2 border-l border-slate-300 text-center font-bold">{idx + 1}</td>
                            <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{st.studentName}</td>
                            <td className="p-2 border-l border-slate-300">{st.className}</td>
                            <td className="p-2 border-l border-slate-300 text-center font-bold">
                              <span className={
                                st.status === 'absent' 
                                  ? 'text-rose-700' 
                                  : st.status === 'excused' 
                                    ? 'text-blue-700' 
                                    : 'text-amber-700'
                              }>
                                {st.statusArabic}
                              </span>
                            </td>
                            <td className="p-2 border-l border-slate-300 text-slate-700">{st.reason || 'بدون عذر'}</td>
                            <td className="p-2 border-l border-slate-300 text-slate-500">{st.notes || '-'}</td>
                            <td className="p-2 text-center font-mono text-[11px] text-slate-700">{st.parentPhone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* MONTHLY REPORT CONTENT */}
            {reportType === 'monthly' && (
              <>
                {/* 1. Monthly Classes Summary Table */}
                <div>
                  <h3 className="text-xs font-black mb-2 text-slate-900">
                    أولاً: الإحصائية الشهرية لجميع فصول المدرسة عن شهر ({monthlyData.monthName}):
                  </h3>
                  <table className="w-full text-right text-xs border border-slate-300">
                    <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                      <tr>
                        <th className="p-2 border-l border-slate-300">الصف والشعبة</th>
                        <th className="p-2 border-l border-slate-300">مربي الفصل</th>
                        <th className="p-2 border-l border-slate-300 text-center">عدد الطلاب</th>
                        <th className="p-2 border-l border-slate-300 text-center">جلسات الرصد</th>
                        <th className="p-2 border-l border-slate-300 text-center text-emerald-700">مجموع الحضور</th>
                        <th className="p-2 border-l border-slate-300 text-center text-rose-700">غياب مؤكد</th>
                        <th className="p-2 border-l border-slate-300 text-center text-blue-700">غياب معذر</th>
                        <th className="p-2 border-l border-slate-300 text-center text-amber-700">تأخر</th>
                        <th className="p-2 text-center">نسبة المواظبة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredMonthlyClasses.map(cls => (
                        <tr key={cls.classId}>
                          <td className="p-2 border-l border-slate-300 font-bold">{cls.className}</td>
                          <td className="p-2 border-l border-slate-300">{cls.teacherName}</td>
                          <td className="p-2 border-l border-slate-300 text-center font-bold">{cls.studentCount}</td>
                          <td className="p-2 border-l border-slate-300 text-center">{cls.totalSessions} يوم</td>
                          <td className="p-2 border-l border-slate-300 text-center text-emerald-700 font-bold">{cls.totalPresent}</td>
                          <td className="p-2 border-l border-slate-300 text-center text-rose-700 font-bold">{cls.totalAbsentUnexcused}</td>
                          <td className="p-2 border-l border-slate-300 text-center text-blue-700 font-bold">{cls.totalAbsentExcused}</td>
                          <td className="p-2 border-l border-slate-300 text-center text-amber-700 font-bold">{cls.totalLate}</td>
                          <td className="p-2 text-center font-black text-emerald-800">{cls.attendanceRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 2. Monthly Student Absences & Chronic Absenteeism List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-black text-slate-900">
                      ثانياً: سجل الغياب الشهري للطلاب وحالات المتابعة الإرشادية:
                    </h3>
                    <span className="text-[11px] text-rose-700 font-bold">
                      {filteredMonthlyStudents.filter(s => s.isChronic).length} حالة تستوجب تدخل الإرشاد الطلابي
                    </span>
                  </div>

                  {filteredMonthlyStudents.length === 0 ? (
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-center text-xs font-bold text-emerald-800">
                      ✨ انضباط ممتاز! لم يسجل أي طالب غياباً في هذا الشهر.
                    </div>
                  ) : (
                    <table className="w-full text-right text-xs border border-slate-300">
                      <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800">
                        <tr>
                          <th className="p-2 border-l border-slate-300 w-8 text-center">م</th>
                          <th className="p-2 border-l border-slate-300">اسم الطالب</th>
                          <th className="p-2 border-l border-slate-300">الصف والشعبة</th>
                          <th className="p-2 border-l border-slate-300 text-center text-rose-700">بدون عذر</th>
                          <th className="p-2 border-l border-slate-300 text-center text-blue-700">بعذر</th>
                          <th className="p-2 border-l border-slate-300 text-center text-amber-700">تأخر</th>
                          <th className="p-2 border-l border-slate-300 text-center font-black">إجمالي الغياب</th>
                          <th className="p-2 border-l border-slate-300 text-center">نسبة الحضور</th>
                          <th className="p-2 text-center">الإجراء الموصى به</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredMonthlyStudents.map((st, idx) => (
                          <tr key={idx} className={st.isChronic ? 'bg-rose-50/50' : ''}>
                            <td className="p-2 border-l border-slate-300 text-center font-bold">{idx + 1}</td>
                            <td className="p-2 border-l border-slate-300 font-bold text-slate-900">{st.studentName}</td>
                            <td className="p-2 border-l border-slate-300">{st.className}</td>
                            <td className="p-2 border-l border-slate-300 text-center font-bold text-rose-700">{st.unexcusedDays}</td>
                            <td className="p-2 border-l border-slate-300 text-center font-bold text-blue-700">{st.excusedDays}</td>
                            <td className="p-2 border-l border-slate-300 text-center font-bold text-amber-700">{st.lateDays}</td>
                            <td className="p-2 border-l border-slate-300 text-center font-black text-slate-900">{st.totalAbsences} يوم</td>
                            <td className="p-2 border-l border-slate-300 text-center font-bold">{st.attendanceRate}%</td>
                            <td className="p-2 text-center text-[11px]">
                              {st.isChronic ? (
                                <span className="font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                                  تحويل للتوجيه الطلابي
                                </span>
                              ) : (
                                <span className="text-slate-500">إشعار ولي الأمر</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {/* Official Endorsements, Signatures & School Seal */}
            <div className="pt-8 border-t-2 border-slate-900">
              <div className="grid grid-cols-3 gap-6 text-center text-xs font-bold">
                {/* School Counselor */}
                <div>
                  <div className="text-slate-600">الموجه الطلابي</div>
                  <div className="mt-5 text-slate-900">{monthlyData.counselorName || 'أ. أحمد السعدون'}</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">التوقيع: .....................</div>
                </div>

                {/* Official Seal */}
                <div>
                  <div className="text-slate-600">ختم مدرسة زيد بن ثابت الرسمي</div>
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-emerald-800/60 mx-auto mt-2 flex flex-col items-center justify-center text-[10px] text-emerald-900 font-bold bg-emerald-50/40 p-1">
                    <span>مدرسة زيد بن ثابت</span>
                    <span className="text-[8px] font-mono mt-0.5">معتمد إلكترونياً</span>
                    <span>⭐</span>
                  </div>
                </div>

                {/* School Principal */}
                <div>
                  <div className="text-slate-600">مدير المدرسة</div>
                  <div className="mt-5 text-slate-900 font-black">{settings.principalName}</div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">التوقيع: .....................</div>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 font-mono mt-6 pt-3 border-t border-slate-200">
                منظومة رصد غياب الحصة الثانية الإلكترونية — مدرسة زيد بن ثابت الابتدائية — تم التوليد بنجاح
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 no-print">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>يمكنك تنزيل التقرير بصيغة PDF فوراً بدقة عالية A4 ومطابقة للمستندات الرسمية</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};

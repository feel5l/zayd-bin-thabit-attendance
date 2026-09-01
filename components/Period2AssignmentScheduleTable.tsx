import React, { useState } from 'react';
import { User, SchoolClass, DayPeriodAssignment, WeekDayKey, TeacherTimetableRecord, TimetableEntry } from '../types';
import { AttendanceService, WEEKDAYS_LIST } from '../services/attendanceService';
import { extractPeriod2AssignmentsFromTimetable } from '../services/timetableData';
import { 
  Calendar, 
  Clock, 
  Save, 
  CheckCircle2, 
  Sparkles, 
  Users, 
  HelpCircle,
  RotateCcw,
  Layers,
  ArrowRightLeft,
  BookOpen,
  Printer,
  FileSpreadsheet,
  Search,
  UserCheck,
  GraduationCap,
  CalendarDays,
  Grid,
  ListFilter,
  Eye,
  Download
} from 'lucide-react';

interface Period2AssignmentScheduleTableProps {
  currentUser: User;
  onAssignmentsUpdated?: () => void;
  onShowNotification?: (text: string, type?: 'success' | 'error') => void;
}

export const Period2AssignmentScheduleTable: React.FC<Period2AssignmentScheduleTableProps> = ({
  currentUser,
  onAssignmentsUpdated,
  onShowNotification
}) => {
  const classes = AttendanceService.getClasses();
  const teachers = AttendanceService.getUsers().filter(u => u.role === 'teacher');
  const currentDay = AttendanceService.getCurrentDayKey();
  const timetableRecords = AttendanceService.getOfficialTimetableRecords();

  const [viewMode, setViewMode] = useState<'period2_matrix' | 'master_timetable' | 'teacher_schedule' | 'class_schedule'>('period2_matrix');
  const [assignments, setAssignments] = useState<DayPeriodAssignment[]>(() => 
    AttendanceService.getPeriodAssignments()
  );
  const [selectedDayFilter, setSelectedDayFilter] = useState<WeekDayKey | 'all'>('all');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teachers[0]?.id || '');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Helper to get or create assignment record for class & day
  const getAssignment = (classId: string, dayKey: WeekDayKey): DayPeriodAssignment => {
    const found = assignments.find(a => a.classId === classId && a.day === dayKey && a.periodNumber === 2);
    if (found) return found;

    const cls = classes.find(c => c.id === classId);
    const dayObj = WEEKDAYS_LIST.find(d => d.key === dayKey);
    const defaultTeacher = teachers.find(t => t.id === cls?.teacherId) || teachers[0];

    return {
      id: `assign_${classId}_${dayKey}`,
      classId,
      className: cls?.name || '',
      day: dayKey,
      dayArabic: dayObj?.label || '',
      teacherId: defaultTeacher?.id || '',
      teacherName: defaultTeacher?.name || 'لم يُحدد',
      periodNumber: 2,
      subject: defaultTeacher?.subject || 'الحصة الثانية',
      notes: ''
    };
  };

  const handleTeacherChange = (classId: string, dayKey: WeekDayKey, newTeacherId: string) => {
    const selectedTeacher = teachers.find(t => t.id === newTeacherId);
    if (!selectedTeacher) return;

    const cls = classes.find(c => c.id === classId);
    const dayObj = WEEKDAYS_LIST.find(d => d.key === dayKey);

    const updatedAssignments = [...assignments];
    const existingIndex = updatedAssignments.findIndex(
      a => a.classId === classId && a.day === dayKey && a.periodNumber === 2
    );

    const newRecord: DayPeriodAssignment = {
      id: `assign_${classId}_${dayKey}`,
      classId,
      className: cls?.name || '',
      day: dayKey,
      dayArabic: dayObj?.label || '',
      teacherId: selectedTeacher.id,
      teacherName: selectedTeacher.name,
      periodNumber: 2,
      subject: selectedTeacher.subject || 'الحصة الثانية',
      notes: ''
    };

    if (existingIndex >= 0) {
      updatedAssignments[existingIndex] = newRecord;
    } else {
      updatedAssignments.push(newRecord);
    }

    setAssignments(updatedAssignments);
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSaveAll = () => {
    AttendanceService.saveAllPeriodAssignments(assignments, currentUser);
    setHasChanges(false);
    setSaveSuccess(true);
    if (onShowNotification) {
      onShowNotification('تم حفظ جدول إسناد الحصة الثانية بنجاح وتحديث صلاحيات المعلمين اليومية', 'success');
    }
    if (onAssignmentsUpdated) {
      onAssignmentsUpdated();
    }
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLoadOfficialTimetable = () => {
    if (confirm('هل تريد تثبيت وتطبيق جدول الحصة الثانية المعتمد رسمياً من الجدول المدرسي العام للمدرسة؟')) {
      const extracted = extractPeriod2AssignmentsFromTimetable();
      setAssignments(extracted);
      AttendanceService.saveAllPeriodAssignments(extracted, currentUser);
      setHasChanges(false);
      setSaveSuccess(true);
      if (onShowNotification) {
        onShowNotification('تم تثبيت وتطبيق جدول الحصة الثانية من الجدول الرسمي المعتمد بنجاح', 'success');
      }
      if (onAssignmentsUpdated) {
        onAssignmentsUpdated();
      }
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('هل أنت متأكد من إعادة ضبط جدول توزيع الحصة الثانية إلى التوزيع المعتمد؟')) {
      AttendanceService.initDefaultPeriodAssignments();
      const fresh = AttendanceService.getPeriodAssignments();
      setAssignments(fresh);
      setHasChanges(false);
      setSaveSuccess(true);
      if (onShowNotification) {
        onShowNotification('تمت إعادة ضبط الجدول بنجاح', 'success');
      }
      if (onAssignmentsUpdated) {
        onAssignmentsUpdated();
      }
    }
  };

  // Get teacher's full weekly timetable record
  const currentTeacherRecord = timetableRecords.find(r => r.teacherId === selectedTeacherId) || timetableRecords[0];

  // Get class full weekly timetable entries
  const currentClassEntries = AttendanceService.getTimetableForClass(selectedClassId);
  const currentClassObj = classes.find(c => c.id === selectedClassId) || classes[0];

  // Periods list (1 to 7)
  const PERIOD_NUMBERS = [1, 2, 3, 4, 5, 6, 7];

  const handlePrintTimetable = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Main Navigation Tabs */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setViewMode('period2_matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              viewMode === 'period2_matrix'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>جدول إسناد الحصة الثانية (لرصد الغياب) ⭐</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('teacher_schedule')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              viewMode === 'teacher_schedule'
                ? 'bg-emerald-700 text-white shadow-sm font-black'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>جدول معلم مخصص (الحصص 1 - 7)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('class_schedule')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              viewMode === 'class_schedule'
                ? 'bg-emerald-700 text-white shadow-sm font-black'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>جدول فصل دراسي مخصص</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('master_timetable')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              viewMode === 'master_timetable'
                ? 'bg-emerald-700 text-white shadow-sm font-black'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>الجدول المدرسي العام (نصاب المعلمين)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handlePrintTimetable}
          className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          title="طباعة الجدول"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          <span>طباعة الجدول</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: PERIOD 2 ATTENDANCE ASSIGNMENT MATRIX */}
      {/* ========================================================================= */}
      {viewMode === 'period2_matrix' && (
        <div className="space-y-6">
          {/* Header Info Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/70 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>جدول توزيع وإسناد الحصة الثانية حسب الأيام (Database Table: Class, Day, Teacher)</span>
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    اليوم: {currentDay.label}
                  </span>
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  تحديد المعلم المسؤول عن رصد الحصة الثانية لكل فصل وفق أيام الأسبوع. عند تسجيل دخول المعلم يتم توجيهه حصرياً للفصل المسند إليه في ذلك اليوم.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleLoadOfficialTimetable}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-sm active:scale-95"
                title="تثبيت المعلمين للحصة الثانية تلقائياً من الجدول المدرسي المعتمد"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                <span>تثبيت من الجدول المعتمد ⚡</span>
              </button>

              <button
                type="button"
                onClick={handleResetToDefaults}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                title="إعادة توزيع الحصص آلياً"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>إعادة ضبط</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAll}
                disabled={!hasChanges && !saveSuccess}
                className={`px-5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-md ${
                  hasChanges
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 active:scale-95'
                    : saveSuccess
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>تم الحفظ بنجاح</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ التعديلات</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Day Filter Pills */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-500 px-2">عرض:</span>
              <button
                type="button"
                onClick={() => setSelectedDayFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedDayFilter === 'all'
                    ? 'bg-white shadow-sm text-slate-900 font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                كامل الأسبوع (جدول مصفوفي)
              </button>
              {WEEKDAYS_LIST.map(d => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setSelectedDayFilter(d.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    selectedDayFilter === d.key
                      ? 'bg-emerald-600 text-white shadow-sm font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  } ${d.key === currentDay.key ? 'ring-1 ring-emerald-400' : ''}`}
                >
                  <span>{d.label}</span>
                  {d.key === currentDay.key && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  )}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>إجمالي الفصول المجدولة: {classes.length} فصول • {teachers.length} معلماً</span>
            </div>
          </div>

          {/* Main Schedule Matrix Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-black">
                    <th className="p-3.5 pr-5 w-48">الفصل / الشعبة</th>
                    {WEEKDAYS_LIST.filter(d => selectedDayFilter === 'all' || selectedDayFilter === d.key).map(d => (
                      <th 
                        key={d.key} 
                        className={`p-3.5 text-center min-w-[190px] border-r border-slate-200/80 ${
                          d.key === currentDay.key ? 'bg-emerald-50/80 text-emerald-900 font-black' : ''
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>يوم {d.label}</span>
                          {d.key === currentDay.key && (
                            <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.2 rounded-md font-bold">
                              اليوم الحالي
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classes.map((cls, idx) => (
                    <tr key={cls.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40 hover:bg-slate-50/80'}>
                      {/* Class Name & Room */}
                      <td className="p-3.5 pr-5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-8 rounded-full bg-emerald-600 shrink-0" />
                          <div>
                            <div className="font-black text-slate-900 text-xs sm:text-sm">
                              {cls.name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {cls.gradeLevel} • {cls.roomNumber || 'قاعة دراسية'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Day Columns */}
                      {WEEKDAYS_LIST.filter(d => selectedDayFilter === 'all' || selectedDayFilter === d.key).map(d => {
                        const record = getAssignment(cls.id, d.key);
                        const isTodayCol = d.key === currentDay.key;

                        return (
                          <td 
                            key={d.key} 
                            className={`p-2.5 border-r border-slate-100 align-middle ${
                              isTodayCol ? 'bg-emerald-50/30' : ''
                            }`}
                          >
                            <div className="space-y-1.5">
                              <select
                                value={record.teacherId}
                                onChange={(e) => handleTeacherChange(cls.id, d.key, e.target.value)}
                                className={`w-full p-2 rounded-xl text-xs font-bold outline-none transition border ${
                                  record.teacherId
                                    ? 'bg-white border-slate-200 text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                                    : 'bg-rose-50 border-rose-300 text-rose-800'
                                }`}
                              >
                                <option value="">-- اختر المعلم --</option>
                                {teachers.map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} ({t.subject || 'معلم'})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: INDIVIDUAL TEACHER TIMETABLE (PERIODS 1 - 7) */}
      {/* ========================================================================= */}
      {viewMode === 'teacher_schedule' && (
        <div className="space-y-6">
          {/* Teacher Selector Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-700/20 shrink-0">
                {currentTeacherRecord?.teacherName?.replace(/^(أ\.|د\.|الـ)/g, '').substring(0, 2) || 'مع'}
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  {currentTeacherRecord?.teacherName || 'اختر معلماً'}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mt-0.5">
                  <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                    المادة: {currentTeacherRecord?.mainSubject || 'التعليم العام'}
                  </span>
                  <span>•</span>
                  <span>النصاب الأسبوعي: <strong className="text-slate-900">{currentTeacherRecord?.quota || 0} حصة</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <label className="text-xs font-bold text-slate-600 shrink-0">اختر المعلم:</label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 w-full md:w-72"
              >
                {teachers.map(t => {
                  const rec = timetableRecords.find(r => r.teacherId === t.id);
                  return (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.subject} ({rec?.quota || 0} حصة)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Teacher Weekly Timetable Grid (5 Days x 7 Periods) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-emerald-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <h4 className="font-black text-sm">
                  الجدول الأسبوعي للأستاذ: {currentTeacherRecord?.teacherName}
                </h4>
              </div>
              <span className="text-xs bg-white/10 text-emerald-200 px-3 py-1 rounded-full font-bold">
                الحصة الثانية مميزة باللون الأخضر (مسؤولية الرصد اليومي)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black text-center">
                    <th className="p-3.5 pr-5 text-right w-32 border-l border-slate-200">اليوم</th>
                    {PERIOD_NUMBERS.map(p => (
                      <th 
                        key={p} 
                        className={`p-3.5 text-center min-w-[130px] border-l border-slate-200/80 ${
                          p === 2 ? 'bg-emerald-100 text-emerald-950 font-black' : ''
                        }`}
                      >
                        <div className="font-black text-xs">الحصة {p}</div>
                        {p === 2 && (
                          <div className="text-[10px] text-emerald-700 font-bold">حصة الرصد ⚡</div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {WEEKDAYS_LIST.map(d => {
                    const isToday = d.key === currentDay.key;

                    return (
                      <tr key={d.key} className={isToday ? 'bg-emerald-50/20' : 'hover:bg-slate-50/60'}>
                        {/* Day Column */}
                        <td className="p-3.5 pr-5 font-black text-slate-900 border-l border-slate-200">
                          <div className="flex items-center gap-2">
                            <span>{d.label}</span>
                            {isToday && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            )}
                          </div>
                        </td>

                        {/* Periods 1 to 7 */}
                        {PERIOD_NUMBERS.map(periodNum => {
                          const entry = currentTeacherRecord?.entries.find(
                            e => e.day === d.key && e.periodNumber === periodNum
                          );
                          const isPeriod2 = periodNum === 2;

                          return (
                            <td 
                              key={periodNum} 
                              className={`p-3 text-center border-l border-slate-100 align-middle ${
                                isPeriod2 ? 'bg-emerald-50/40' : ''
                              }`}
                            >
                              {entry ? (
                                <div className={`p-2.5 rounded-2xl border text-center transition ${
                                  isPeriod2
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-bold'
                                    : 'bg-slate-50 text-slate-800 border-slate-200'
                                }`}>
                                  <div className="font-black text-xs">{entry.className}</div>
                                  <div className={`text-[10px] mt-0.5 font-medium ${isPeriod2 ? 'text-emerald-100' : 'text-slate-500'}`}>
                                    {entry.subject}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-slate-300 font-medium text-[11px] py-2">
                                  — فراغ —
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: INDIVIDUAL CLASS TIMETABLE */}
      {/* ========================================================================= */}
      {viewMode === 'class_schedule' && (
        <div className="space-y-6">
          {/* Class Selector Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-teal-700/20 shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  {currentClassObj?.name || 'اختر شعبة'}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mt-0.5">
                  <span className="bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md font-bold">
                    مربي الفصل: {currentClassObj?.teacherName || 'غير محدد'}
                  </span>
                  <span>•</span>
                  <span>المقر: <strong>{currentClassObj?.roomNumber || 'قاعة دراسية'}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <label className="text-xs font-bold text-slate-600 shrink-0">اختر الفصل:</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500 w-full md:w-72"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.gradeLevel} ({c.studentCount} طالب)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Class Weekly Timetable Grid */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-400" />
                <h4 className="font-black text-sm">
                  الجدول الدراسي الأسبوعي لفصل: {currentClassObj?.name}
                </h4>
              </div>
              <span className="text-xs bg-white/10 text-teal-200 px-3 py-1 rounded-full font-bold">
                الحصة الثانية مخصصة لرصد الغياب الرسمي
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black text-center">
                    <th className="p-3.5 pr-5 text-right w-32 border-l border-slate-200">اليوم</th>
                    {PERIOD_NUMBERS.map(p => (
                      <th 
                        key={p} 
                        className={`p-3.5 text-center min-w-[140px] border-l border-slate-200/80 ${
                          p === 2 ? 'bg-teal-100 text-teal-950 font-black' : ''
                        }`}
                      >
                        <div className="font-black text-xs">الحصة {p}</div>
                        {p === 2 && (
                          <div className="text-[10px] text-teal-700 font-bold">رصد الحضور ⚡</div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {WEEKDAYS_LIST.map(d => {
                    const isToday = d.key === currentDay.key;

                    return (
                      <tr key={d.key} className={isToday ? 'bg-teal-50/20' : 'hover:bg-slate-50/60'}>
                        {/* Day Column */}
                        <td className="p-3.5 pr-5 font-black text-slate-900 border-l border-slate-200">
                          <div className="flex items-center gap-2">
                            <span>{d.label}</span>
                            {isToday && (
                              <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                            )}
                          </div>
                        </td>

                        {/* Periods 1 to 7 */}
                        {PERIOD_NUMBERS.map(periodNum => {
                          const entry = currentClassEntries.find(
                            e => e.day === d.key && e.periodNumber === periodNum
                          );
                          const isPeriod2 = periodNum === 2;

                          return (
                            <td 
                              key={periodNum} 
                              className={`p-3 text-center border-l border-slate-100 align-middle ${
                                isPeriod2 ? 'bg-teal-50/40' : ''
                              }`}
                            >
                              {entry ? (
                                <div className={`p-2.5 rounded-2xl border text-center transition ${
                                  isPeriod2
                                    ? 'bg-teal-600 text-white border-teal-700 shadow-sm font-bold'
                                    : 'bg-slate-50 text-slate-800 border-slate-200'
                                }`}>
                                  <div className="font-black text-xs">{entry.subject}</div>
                                  <div className={`text-[10px] mt-0.5 font-medium ${isPeriod2 ? 'text-teal-100' : 'text-slate-500'}`}>
                                    {entry.teacherName}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-slate-300 font-medium text-[11px] py-2">
                                  — نشاط / فراغ —
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 4: MASTER TIMETABLE & TEACHER QUOTAS SUMMARY */}
      {/* ========================================================================= */}
      {viewMode === 'master_timetable' && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">إجمالي المعلمين المجدولين</span>
                <span className="text-lg font-black text-slate-900">{timetableRecords.length} معلماً</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">إجمالي الفصول المجدولة</span>
                <span className="text-lg font-black text-slate-900">{classes.length} فصول</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">إجمالي الحصص الأسبوعية</span>
                <span className="text-lg font-black text-slate-900">
                  {timetableRecords.reduce((acc, r) => acc + r.quota, 0)} حصة أسبوعياً
                </span>
              </div>
            </div>
          </div>

          {/* Search Input for Master List */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={teacherSearchQuery}
                onChange={(e) => setTeacherSearchQuery(e.target.value)}
                placeholder="بحث باسم المعلم أو التخصص في الجدول العام..."
                className="w-full pl-3 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
          </div>

          {/* Master Quotas Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black">
                    <th className="p-3.5 pr-5">اسم المعلم</th>
                    <th className="p-3.5 text-center">المادة / التخصص</th>
                    <th className="p-3.5 text-center">النصاب الأسبوعي</th>
                    <th className="p-3.5 text-center">الفصول المكلف بها</th>
                    <th className="p-3.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timetableRecords
                    .filter(r => 
                      r.teacherName.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
                      r.mainSubject.toLowerCase().includes(teacherSearchQuery.toLowerCase())
                    )
                    .map((record, idx) => {
                      // Get unique class names taught by this teacher
                      const uniqueClasses = Array.from(new Set(record.entries.map(e => e.className)));

                      return (
                        <tr key={record.teacherId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40 hover:bg-slate-50/80'}>
                          <td className="p-3.5 pr-5">
                            <div className="flex items-center gap-2.5">
                              <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="font-black text-slate-900 text-xs sm:text-sm">
                                  {record.teacherName}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium">
                                  {record.mainSubject}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 text-center">
                            <span className="bg-slate-100 text-slate-800 font-bold px-2.5 py-1 rounded-lg text-xs">
                              {record.mainSubject}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <span className="bg-emerald-50 text-emerald-800 font-black px-3 py-1 rounded-xl text-xs border border-emerald-200/60">
                              {record.quota} حصة
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1 flex-wrap max-w-xs mx-auto">
                              {uniqueClasses.map(cName => (
                                <span key={cName} className="bg-slate-100 text-slate-700 font-medium text-[10px] px-2 py-0.5 rounded-md">
                                  {cName}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTeacherId(record.teacherId);
                                setViewMode('teacher_schedule');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition flex items-center gap-1 mx-auto"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>عرض الجدول</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

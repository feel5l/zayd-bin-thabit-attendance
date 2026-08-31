import React, { useState } from 'react';
import { User, SchoolClass, DayPeriodAssignment, WeekDayKey } from '../types';
import { AttendanceService, WEEKDAYS_LIST } from '../services/attendanceService';
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
  ArrowRightLeft
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

  const [assignments, setAssignments] = useState<DayPeriodAssignment[]>(() => 
    AttendanceService.getPeriodAssignments()
  );
  const [selectedDayFilter, setSelectedDayFilter] = useState<WeekDayKey | 'all'>('all');
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

  const handleResetToDefaults = () => {
    if (confirm('هل أنت متأكد من إعادة ضبط جدول توزيع الحصة الثانية إلى التوزيع الافتراضي المتوازن؟')) {
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

  return (
    <div className="space-y-6 animate-fadeIn">
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
              تحديد المعلم المسؤول عن رصد الحصة الثانية لكل فصل وفق أيام الأسبوع (مثال: رابع أ: الأحد أ. محمد، الإثنين أ. خالد). عند تسجيل دخول المعلم يتم توجيهه حصرياً للفصل المسند إليه في ذلك اليوم.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            title="إعادة توزيع الحصص آلياً بشكل متوازن"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>توزيع آلي متوازن</span>
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
                <span>حفظ التعديلات في قاعدة البيانات</span>
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
  );
};

import React, { useState, useEffect } from 'react';
import { User, SchoolClass, SchoolSettings } from '../types';
import { AttendanceService, NOTIFICATION_EVENT } from '../services/attendanceService';
import { getTodayDateString } from '../services/initialData';
import confetti from 'canvas-confetti';
import { 
  Play, 
  PlayCircle, 
  RotateCcw, 
  Zap, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  ChevronRight, 
  ArrowLeft, 
  UserCheck, 
  Shield, 
  Bell, 
  Radio, 
  X,
  CheckCheck,
  TrendingUp,
  GraduationCap
} from 'lucide-react';

interface TeacherLiveSimulationWidgetProps {
  currentUser: User;
  settings: SchoolSettings;
  onOpenClassSheet: (classId: string) => void;
  onSwitchToTeacher?: (teacherUser: User) => void;
  onSimulationStep?: () => void;
}

export const TeacherLiveSimulationWidget: React.FC<TeacherLiveSimulationWidgetProps> = ({
  currentUser,
  settings,
  onOpenClassSheet,
  onSwitchToTeacher,
  onSimulationStep
}) => {
  const [isRunningSequence, setIsRunningSequence] = useState(false);
  const [currentSimStep, setCurrentSimStep] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [selectedClassToSim, setSelectedClassToSim] = useState<string>('');
  const [toastText, setToastText] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const todayStr = getTodayDateString();
  const classes = AttendanceService.getClasses();
  const users = AttendanceService.getUsers().filter(u => u.role === 'teacher');
  const submissions = AttendanceService.getSubmissions(todayStr);
  const stats = AttendanceService.getTodaySchoolStats(todayStr);

  const pendingClasses = classes.filter(c => !submissions.some(s => s.classId === c.id));
  const submittedClasses = classes.filter(c => submissions.some(s => s.classId === c.id));

  // Listen to system changes
  useEffect(() => {
    const handleUpdate = () => {
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener(NOTIFICATION_EVENT, handleUpdate);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handleUpdate);
  }, []);

  // Step-by-step animated sequence simulation
  const handleRunAnimatedBatch = async () => {
    if (isRunningSequence) return;
    setIsRunningSequence(true);
    setCompletedSteps([]);
    setToastText('🚀 بدء محاكاة تسجيل دخول المعلمين ورصد غياب الحصة الثانية تتابعياً...');

    const classesToProcess = [...classes];

    for (let i = 0; i < classesToProcess.length; i++) {
      const cls = classesToProcess[i];
      const teacher = users.find(u => u.assignedClassId === cls.id || u.id === cls.teacherId) || {
        id: `t-${cls.id}`,
        name: cls.teacherName,
        role: 'teacher' as const,
        username: `teacher_${cls.id}`
      };

      setCurrentSimStep(`👨‍🏫 جاري محاكاة المعلم (${teacher.name}) لفصل (${cls.name})...`);

      // Artificial small delay for visual satisfaction
      await new Promise(r => setTimeout(r, 700));

      // Simulate submission
      AttendanceService.simulateTeacherSubmission(cls.id);
      setCompletedSteps(prev => [...prev, cls.name]);

      if (onSimulationStep) onSimulationStep();
    }

    setCurrentSimStep(null);
    setIsRunningSequence(false);
    setToastText('🎉 اكتملت محاكاة كافة المعلمين بنجاح! تم تحديث لوحة المدير المركزية 100%');

    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    setTimeout(() => setToastText(null), 5000);
  };

  // Instant single teacher simulation
  const handleSimulateSingle = (classId: string) => {
    const targetClass = classes.find(c => c.id === classId);
    if (!targetClass) return;

    AttendanceService.simulateTeacherSubmission(classId);
    setToastText(`✅ تم رصد كشف الحصة الثانية لفصل (${targetClass.name}) بواسطة المعلم (${targetClass.teacherName})`);
    
    if (onSimulationStep) onSimulationStep();
    setTimeout(() => setToastText(null), 4000);
  };

  // Reset today submissions
  const handleResetSubmissions = () => {
    if (window.confirm('هل تريد تصفير وإعادة تعيين كشوفات غياب اليوم لإعادة المحاكاة من الصفر؟')) {
      AttendanceService.resetTodaySubmissions(todayStr);
      setCompletedSteps([]);
      setCurrentSimStep(null);
      setToastText('🔄 تم تصفير رصد اليوم بنجاح، يمكنك الآن تشغيل المحاكاة مرة أخرى.');
      if (onSimulationStep) onSimulationStep();
      setTimeout(() => setToastText(null), 4000);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white border border-indigo-500/30 shadow-xl space-y-5 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -left-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shadow-inner">
            <Radio className="w-6 h-6 animate-pulse text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black font-brand text-white">
                محاكي رصد المعلمين المباشر (Multi-Teacher Live Simulator)
              </h3>
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-indigo-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                تفاعل حي مع لوحة المدير
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              محاكاة واقعية لتسجيل دخول المعلمين ورصد غياب الحصة الثانية ومشاهدة التحديث الفوري للعدادات والإحصائيات
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunAnimatedBatch}
            disabled={isRunningSequence}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 shadow-lg ${
              isRunningSequence
                ? 'bg-amber-400 text-slate-950 cursor-not-allowed animate-pulse'
                : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-amber-500/20'
            }`}
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>{isRunningSequence ? 'جاري المحاكاة التتابعية...' : 'محاكاة رصد جماعي لجميع المعلمين ⚡'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetSubmissions}
            disabled={isRunningSequence}
            className="px-3 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-white/15 transition flex items-center gap-1.5"
            title="تصفير كشوفات اليوم لاختبار المحاكاة من البداية"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تصفير اليوم</span>
          </button>
        </div>
      </div>

      {/* Progress & Live Step Status Bar */}
      {isRunningSequence && currentSimStep && (
        <div className="p-3.5 bg-indigo-950/80 border border-amber-400/50 rounded-2xl animate-in fade-in space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-amber-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>{currentSimStep}</span>
            </span>
            <span className="text-indigo-200">
              {completedSteps.length} من {classes.length} فصول
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${(completedSteps.length / classes.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Toast Text Banner */}
      {toastText && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/60 rounded-2xl text-emerald-200 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastText}</span>
          </div>
          <button onClick={() => setToastText(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Live State Tracker Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl text-center">
          <span className="text-[11px] text-indigo-200 font-medium block">الفصول المرصودة</span>
          <div className="text-xl sm:text-2xl font-black font-brand text-white mt-1">
            {submittedClasses.length} / {classes.length}
          </div>
          <span className={`text-[10px] font-bold mt-1 inline-block ${
            pendingClasses.length === 0 ? 'text-emerald-400' : 'text-amber-300'
          }`}>
            {pendingClasses.length === 0 ? 'اكتمل الرصد 100% ✓' : `متبقي ${pendingClasses.length} فصول`}
          </span>
        </div>

        <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl text-center">
          <span className="text-[11px] text-indigo-200 font-medium block">الغياب المؤكد (بدون عذر)</span>
          <div className="text-xl sm:text-2xl font-black font-brand text-rose-400 mt-1">
            {stats.absentCount} طالب
          </div>
          <span className="text-[10px] text-slate-300 font-medium mt-1 inline-block">
            رسائل فورية لأولياء الأمور
          </span>
        </div>

        <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl text-center">
          <span className="text-[11px] text-indigo-200 font-medium block">الغياب بعذر معتمد</span>
          <div className="text-xl sm:text-2xl font-black font-brand text-blue-300 mt-1">
            {stats.excusedCount} طالب
          </div>
          <span className="text-[10px] text-slate-300 font-medium mt-1 inline-block">
            إجازات وتقارير طبية
          </span>
        </div>

        <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl text-center">
          <span className="text-[11px] text-indigo-200 font-medium block">نسبة الحضور المباشرة</span>
          <div className="text-xl sm:text-2xl font-black font-brand text-emerald-400 mt-1">
            {stats.attendanceRate}%
          </div>
          <span className="text-[10px] text-emerald-300 font-bold mt-1 inline-block">
            مؤشر الإنجاز اليومي
          </span>
        </div>
      </div>

      {/* Teachers / Classes Live Status Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>حالة كشوفات الفصول بحسب مربي الفصل:</span>
          </span>
          <span className="text-[11px] text-indigo-300">
            انقر على أي معلم لمحاكاة رصده أو الدخول لحسابه
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {classes.map(cls => {
            const sub = submissions.find(s => s.classId === cls.id);
            const isSub = !!sub;
            const teacher = users.find(u => u.assignedClassId === cls.id || u.id === cls.teacherId);

            return (
              <div
                key={cls.id}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                  isSub
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-white'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                    isSub ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-800 text-amber-300'
                  }`}>
                    {cls.shortName}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-black truncate">{cls.name}</div>
                    <div className="text-[11px] text-slate-300 truncate">
                      {cls.teacherName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isSub ? (
                    <div className="flex items-center gap-1.5">
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <CheckCheck className="w-3 h-3 text-emerald-400" />
                        <span>غ: {sub.absentCount} | ع: {sub.excusedCount}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenClassSheet(cls.id)}
                        className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition text-xs"
                        title="عرض الكشف المعتمد"
                      >
                        👁️
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSimulateSingle(cls.id)}
                        className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black rounded-lg transition flex items-center gap-1 shadow-sm"
                        title="محاكاة رصد المعلم لهذا الفصل"
                      >
                        <Zap className="w-3 h-3" />
                        <span>رصد الآن</span>
                      </button>

                      {teacher && onSwitchToTeacher && (
                        <button
                          type="button"
                          onClick={() => onSwitchToTeacher(teacher)}
                          className="px-2 py-1 bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] font-bold rounded-lg transition"
                          title="تسجيل الدخول الفعلي بحساب هذا المعلم"
                        >
                          دخول كمعلم
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

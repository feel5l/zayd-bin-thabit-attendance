import React, { useState, useEffect } from 'react';
import { StudentReferralForm, Student, SchoolClass, User, ReferralReasonType, ReferralSourceType, ReferredNextToType, ReferralStatus } from '../types';
import { AttendanceService } from '../services/attendanceService';
import { OFFICIAL_REFERRAL_REASONS, getTodayDateString } from '../services/initialData';
import { 
  FileText, 
  Printer, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  Clock, 
  GraduationCap, 
  Search, 
  Plus, 
  Edit3, 
  Eye, 
  ShieldCheck, 
  Send, 
  Sparkles,
  ChevronDown,
  Info,
  Calendar
} from 'lucide-react';

interface StudentReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReferral?: StudentReferralForm | null;
  preselectedStudentId?: string | null;
  currentUser: User | null;
  onSaved?: (savedForm: StudentReferralForm) => void;
}

export const StudentReferralModal: React.FC<StudentReferralModalProps> = ({
  isOpen,
  onClose,
  initialReferral,
  preselectedStudentId,
  currentUser,
  onSaved
}) => {
  const [viewMode, setViewMode] = useState<'form' | 'print'>(initialReferral ? 'print' : 'form');
  const [students, setStudents] = useState<Student[]>(() => AttendanceService.getStudents());
  const [classes, setClasses] = useState<SchoolClass[]>(() => AttendanceService.getClasses());
  const [settings, setSettings] = useState(() => AttendanceService.getSettings());

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [referralNumber, setReferralNumber] = useState<string>('');
  const [referralDate, setReferralDate] = useState<string>(getTodayDateString());
  const [hijriDate, setHijriDate] = useState<string>('1447/03/15 هـ');
  const [attachmentsCount, setAttachmentsCount] = useState<string>('لا يوجد');
  
  // Reasons & Sources
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [otherReasonText, setOtherReasonText] = useState<string>('');
  const [referralSource, setReferralSource] = useState<ReferralSourceType>('teacher');
  const [referrerName, setReferrerName] = useState<string>('');
  const [problemDescription, setProblemDescription] = useState<string>('');
  const [teacherSignature, setTeacherSignature] = useState<string>('');
  
  // Counselor Section
  const [actionTakenByCounselor, setActionTakenByCounselor] = useState<string>('');
  const [referredNextTo, setReferredNextTo] = useState<ReferredNextToType>('none');
  const [referredNextDate, setReferredNextDate] = useState<string>('');
  const [counselorName, setCounselorName] = useState<string>(settings.counselorName || 'المرشد الطلابي');
  const [counselorSignature, setCounselorSignature] = useState<string>('التوجيه الطلابي');
  const [counselorDate, setCounselorDate] = useState<string>('');
  const [status, setStatus] = useState<ReferralStatus>('pending');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Quick Problem Templates
  const problemTemplates = [
    'تكرار إهمال حل الواجبات المدرسية وعدم إحضار الكتب لعدة حصص متتالية.',
    'ملاحظة تراجع دراسي ملحوظ وصعوبة في استيعاب المهارات الأساسية للمنهج.',
    'تأخر متكرر عن دخول الحصة الثانية وبداية اليوم الدراسي دون عذر مقبول.',
    'كثرة المشاغبة وإثارة الفوضى داخل الفصل وتشتيت انتباه الزملاء أثناء الشرح.',
    'تكرار الاستئذان والخروج المتكرر من الحصة دون مبرر واضح.',
    'عدم التفاعل والمشاركة الصامتة والانعزال عن الأنشطة الصفية.'
  ];

  // Quick Counselor Action Templates
  const counselorTemplates = [
    'تمت مقابلة الطالب واستكشاف الأسباب النفسية والدراسية، وإرشاده لخطة تنظيم الوقت والمذاكرة.',
    'تم التواصل هاتفياً مع ولي أمر الطالب وتوضيح المشكلة والاتفاق على خطة متابعة منزلية مشتركة.',
    'تم إدراج الطالب في برنامج الرعاية التعليمية والمساندة الصفية بالتنسيق مع معلم المادة.',
    'تم توجيه الطالب شفهياً وتوقيع تعهد بالانضباط والالتزام بالأنظمة المدرسية وإحضار الأدوات.',
    'تم عقد جلسة إرشادية فردية لتعزيز الدافعية وبناء السلوك الإيجابي داخل الحصة.'
  ];

  // Initialize or reset form
  useEffect(() => {
    if (!isOpen) return;

    const allStudents = AttendanceService.getStudents();
    setStudents(allStudents);
    setClasses(AttendanceService.getClasses());
    const currentSettings = AttendanceService.getSettings();
    setSettings(currentSettings);

    if (initialReferral) {
      // Editing / Viewing existing referral
      setEditingId(initialReferral.id);
      setSelectedStudentId(initialReferral.studentId);
      setReferralNumber(initialReferral.referralNumber);
      setReferralDate(initialReferral.date);
      setHijriDate(initialReferral.hijriDate || '1447/03/15 هـ');
      setAttachmentsCount(initialReferral.attachmentsCount || 'لا يوجد');
      setSelectedReasons(initialReferral.reasons || []);
      setOtherReasonText(initialReferral.otherReasonText || '');
      setReferralSource(initialReferral.referralSource || 'teacher');
      setReferrerName(initialReferral.referrerName || '');
      setProblemDescription(initialReferral.problemDescription || '');
      setTeacherSignature(initialReferral.teacherSignature || initialReferral.referrerName || '');
      setActionTakenByCounselor(initialReferral.actionTakenByCounselor || '');
      setReferredNextTo(initialReferral.referredNextTo || 'none');
      setReferredNextDate(initialReferral.referredNextDate || '');
      setCounselorName(initialReferral.counselorName || currentSettings.counselorName || 'المرشد الطلابي');
      setCounselorSignature(initialReferral.counselorSignature || 'التوجيه الطلابي');
      setCounselorDate(initialReferral.counselorDate || '');
      setStatus(initialReferral.status || 'pending');
      setViewMode('print');
    } else {
      // New Referral Form
      setEditingId(null);
      const nextNum = AttendanceService.generateNextReferralNumber();
      setReferralNumber(nextNum);
      setReferralDate(getTodayDateString());
      setHijriDate('1447/03/15 هـ');
      setAttachmentsCount('لا يوجد');
      setSelectedReasons([]);
      setOtherReasonText('');
      
      const defaultSource: ReferralSourceType = currentUser?.role === 'admin' ? 'principal' : 'teacher';
      setReferralSource(defaultSource);
      setReferrerName(currentUser?.name || 'معلم الصف');
      setTeacherSignature(currentUser?.name || '');
      setProblemDescription('');
      setActionTakenByCounselor('');
      setReferredNextTo('none');
      setReferredNextDate('');
      setCounselorName(currentSettings.counselorName || 'المرشد الطلابي');
      setCounselorSignature('التوجيه الطلابي');
      setCounselorDate('');
      setStatus('pending');

      if (preselectedStudentId) {
        setSelectedStudentId(preselectedStudentId);
      } else if (allStudents.length > 0) {
        setSelectedStudentId(allStudents[0].id);
      }
      setViewMode('form');
    }
  }, [isOpen, initialReferral, preselectedStudentId, currentUser]);

  if (!isOpen) return null;

  const currentStudent = students.find(s => s.id === selectedStudentId);

  // Filter students for dropdown / selection
  const filteredStudents = students.filter(s => {
    if (selectedClassFilter !== 'all' && s.classId !== selectedClassFilter) return false;
    if (studentSearch.trim()) {
      const q = studentSearch.trim().toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q) ||
        s.studentNumber.toLowerCase().includes(q) ||
        s.nationalId.includes(q)
      );
    }
    return true;
  });

  const toggleReason = (reasonLabel: string) => {
    if (selectedReasons.includes(reasonLabel)) {
      setSelectedReasons(selectedReasons.filter(r => r !== reasonLabel));
    } else {
      setSelectedReasons([...selectedReasons, reasonLabel]);
    }
  };

  const handleSave = () => {
    if (!currentStudent) {
      alert('يرجى اختيار الطالب أولاً');
      return;
    }
    if (selectedReasons.length === 0) {
      alert('يرجى تحديد سبب واحد على الأقل للتحويل');
      return;
    }
    if (!problemDescription.trim()) {
      alert('يرجى كتابة إيضاح المشكلة أو الملاحظة المرصودة على الطالب');
      return;
    }

    const formToSave: StudentReferralForm = {
      id: editingId || `ref-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      referralNumber: referralNumber || AttendanceService.generateNextReferralNumber(),
      date: referralDate,
      hijriDate,
      attachmentsCount,
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      gradeLevel: currentStudent.gradeLevel,
      className: currentStudent.className,
      section: currentStudent.className.replace(/[^0-9]/g, '') || '1',
      reasons: selectedReasons,
      otherReasonText,
      referralSource,
      referrerName: referrerName || currentUser?.name || 'معلم الصف',
      problemDescription,
      teacherSignature: teacherSignature || referrerName || currentUser?.name || '',
      actionTakenByCounselor,
      referredNextTo,
      referredNextDate,
      counselorName,
      counselorSignature,
      counselorDate,
      status: actionTakenByCounselor.trim() ? 'resolved' : status,
      createdAt: initialReferral?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    AttendanceService.saveReferralForm(formToSave, currentUser || undefined);
    if (onSaved) onSaved(formToSave);
    setViewMode('print');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Modal Container */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:max-w-none print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Header - Hidden in Print */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white px-6 py-4 flex items-center justify-between gap-4 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <FileText className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg text-white">
                  استمارة تحويل طالب للمرشد الطلابي
                </h2>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  معتمدة وزارياً
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-bold">
                توثيق الحالات والملاحظات السلوكية والدراسية وإحالتها للتوجيه الطلابي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="bg-emerald-950/60 p-1 rounded-xl border border-emerald-700/50 flex items-center gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('form')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  viewMode === 'form'
                    ? 'bg-emerald-500 text-white shadow-sm font-black'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>تعبئة وتعديل الاستمارة</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('print')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  viewMode === 'print'
                    ? 'bg-emerald-500 text-white shadow-sm font-black'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>معاينة الاستمارة الرسمية A4</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition border border-white/10"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6 print:p-0 print:overflow-visible">
          
          {/* ========================================================
              MODE 1: INTERACTIVE FORM EDITING & CREATION
             ======================================================== */}
          {viewMode === 'form' && (
            <div className="space-y-6">
              
              {/* Student Selector Header Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-black text-sm text-slate-800 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                    <span>بيانات الطالب المحال:</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">رقم الاستمارة:</span>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      {referralNumber}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Class Filter */}
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold text-slate-600 mb-1">تصفية حسب الفصل:</label>
                    <select
                      value={selectedClassFilter}
                      onChange={(e) => setSelectedClassFilter(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="all">جميع فصول المدرسة</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.teacherName})</option>
                      ))}
                    </select>
                  </div>

                  {/* Student Search & Select */}
                  <div className="sm:col-span-8">
                    <label className="block text-xs font-bold text-slate-600 mb-1">اختر الطالب:</label>
                    <div className="relative">
                      <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        {filteredStudents.map(st => (
                          <option key={st.id} value={st.id}>
                            {st.name} — ({st.className}) — ولي الأمر: {st.parentPhone}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Selected Student Banner */}
                {currentStudent && (
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-sm">
                        {currentStudent.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-black text-xs text-emerald-950">{currentStudent.name}</h4>
                        <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-800 mt-0.5">
                          <span>{currentStudent.gradeLevel}</span>
                          <span>•</span>
                          <span>فصل: {currentStudent.className}</span>
                          <span>•</span>
                          <span>هاتف ولي الأمر: {currentStudent.parentPhone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] font-bold">التاريخ:</span>
                        <input
                          type="date"
                          value={referralDate}
                          onChange={(e) => setReferralDate(e.target.value)}
                          className="bg-white border border-emerald-300 rounded-lg px-2 py-1 text-xs font-bold text-emerald-900"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-bold">التاريخ الهجري:</span>
                        <input
                          type="text"
                          value={hijriDate}
                          onChange={(e) => setHijriDate(e.target.value)}
                          placeholder="1447/03/15 هـ"
                          className="bg-white border border-emerald-300 rounded-lg px-2 py-1 text-xs font-bold text-emerald-900 w-28"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 1: سبب التحويل (Official Reasons Checklist) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>سبب التحويل (اختر ما ينطبق):</span>
                  </h3>
                  <span className="text-xs font-bold text-slate-500">
                    تم تحديد: <strong className="text-emerald-700">{selectedReasons.length}</strong> سبب
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {OFFICIAL_REFERRAL_REASONS.map(r => {
                    const isChecked = selectedReasons.includes(r.label);
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => toggleReason(r.label)}
                        className={`p-3 rounded-xl border text-right transition flex items-center justify-between gap-2 ${
                          isChecked
                            ? 'bg-amber-50/90 border-amber-400 text-amber-950 font-black shadow-sm ring-1 ring-amber-300'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{r.icon}</span>
                          <span className="text-xs">{r.label}</span>
                        </div>
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          isChecked ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* If "أخرى" selected */}
                {selectedReasons.includes('أخرى (تذكر)') && (
                  <div className="mt-3 pt-2">
                    <label className="block text-xs font-bold text-amber-900 mb-1">
                      حدد السبب الآخر بالتفصيل:
                    </label>
                    <input
                      type="text"
                      value={otherReasonText}
                      onChange={(e) => setOtherReasonText(e.target.value)}
                      placeholder="اكتب السبب غير المدرج في القائمة أعلاه..."
                      className="w-full bg-amber-50/50 border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Section 2: مصدر الإحالة والمحيل */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-teal-600" />
                  <span>مصدر الإحالة والمُرسل:</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setReferralSource('teacher')}
                    className={`p-3 rounded-xl border text-center transition font-bold text-xs flex items-center justify-center gap-2 ${
                      referralSource === 'teacher'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>معلم الصف</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReferralSource('vice_principal')}
                    className={`p-3 rounded-xl border text-center transition font-bold text-xs flex items-center justify-center gap-2 ${
                      referralSource === 'vice_principal'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>الوكيل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReferralSource('principal')}
                    className={`p-3 rounded-xl border text-center transition font-bold text-xs flex items-center justify-center gap-2 ${
                      referralSource === 'principal'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>المدير</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      اسم المُحيل (المعلم / الوكيل / المدير):
                    </label>
                    <input
                      type="text"
                      value={referrerName}
                      onChange={(e) => setReferrerName(e.target.value)}
                      placeholder="اسم المعلم أو المحيل الصريح"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      توقيع المعلم / المحيل:
                    </label>
                    <input
                      type="text"
                      value={teacherSignature}
                      onChange={(e) => setTeacherSignature(e.target.value)}
                      placeholder="التوقيع أو الاسم المعتمد"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: إيضاح المشكلة (Problem Clarification) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>إيضاح المشكلة (تفاصيل الملاحظة المرصودة):</span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">
                    يمكنك اختيار قالب سريع بالأسفل
                  </span>
                </div>

                {/* Problem Quick Suggestions */}
                <div className="flex flex-wrap gap-1.5">
                  {problemTemplates.map((tpl, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => {
                        setProblemDescription(prev => prev ? `${prev} ${tpl}` : tpl);
                      }}
                      className="text-[11px] font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition text-right"
                    >
                      + {tpl}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={4}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="اكتب شرحاً واضحاً ودقيقاً للمشكلة أو السلوك المرصود على الطالب..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Section 4: ما تم حيال الطالب (Counselor Action) */}
              <div className="bg-amber-50/40 border border-amber-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-black text-sm text-amber-950 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>ما تم حيال الطالب (إجراءات وتوجيهات المرشد الطلابي):</span>
                  </h3>
                  <span className="text-[11px] font-bold text-amber-800">
                    (يمكن تعبئتها فوراً أو بعد مقابلة الطالب)
                  </span>
                </div>

                {/* Counselor Quick Suggestions */}
                <div className="flex flex-wrap gap-1.5">
                  {counselorTemplates.map((tpl, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => {
                        setActionTakenByCounselor(prev => prev ? `${prev} ${tpl}` : tpl);
                      }}
                      className="text-[11px] font-bold bg-white hover:bg-amber-100 hover:text-amber-950 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-200 transition text-right shadow-2xs"
                    >
                      + {tpl}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={actionTakenByCounselor}
                  onChange={(e) => setActionTakenByCounselor(e.target.value)}
                  placeholder="اكتب الإجراء المتخذ من قبل المرشد الطلابي (جلسة إرشادية، اتصال بولي الأمر، خطة علاجية...)..."
                  className="w-full bg-white border border-amber-300 rounded-xl p-3 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none leading-relaxed"
                />

                {/* Next Referral Step & Signatures */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      تمت إحالته لاحقاً إلى:
                    </label>
                    <select
                      value={referredNextTo}
                      onChange={(e) => setReferredNextTo(e.target.value as ReferredNextToType)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="none">لم يُحل لجهة أخرى (اكتفاء بالإرشاد)</option>
                      <option value="subject_teacher">معلم المادة</option>
                      <option value="vice_principal">وكيل المدرسة</option>
                      <option value="principal">مدير المدرسة</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      اسم المرشد الطلابي:
                    </label>
                    <input
                      type="text"
                      value={counselorName}
                      onChange={(e) => setCounselorName(e.target.value)}
                      placeholder="اسم المرشد الطلابي"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      حالة الاستمارة:
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ReferralStatus)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-black ${
                        status === 'resolved'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : 'bg-amber-50 border-amber-300 text-amber-900'
                      }`}
                    >
                      <option value="pending">قيد المتابعة والإحالة ⏳</option>
                      <option value="in_progress">جلسات إرشادية جارية 🔄</option>
                      <option value="resolved">تمت المعالجة والإرشاد بنجاح ✅</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs transition shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>حفظ الاستمارة والانتقال للمعاينة والطباعة</span>
                </button>
              </div>
            </div>
          )}


          {/* ========================================================
              MODE 2: OFFICIAL MINISTRY PRINTABLE A4 FORM (IMG_3909 REPLICA)
             ======================================================== */}
          {viewMode === 'print' && (
            <div className="space-y-4">
              
              {/* Print Action Toolbar (Hidden when printing) */}
              <div className="bg-slate-100 p-3 rounded-2xl border border-slate-200 flex items-center justify-between flex-wrap gap-2 print:hidden">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-black text-slate-800">
                    معاينة الاستمارة الرسمية للطباعة الفورية (A4)
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    — متطابقة 100% مع نموذج الإرشاد الطلابي بوزارة التعليم
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('form')}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>تعديل البيانات</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition flex items-center gap-2 shadow-md shadow-emerald-600/20"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة الاستمارة الرسمية 🖨️</span>
                  </button>
                </div>
              </div>

              {/* 
                ========================================================
                THE OFFICIAL A4 DOCUMENT PAPER
                Structured strictly according to IMG_3909.jpeg
                ======================================================== 
              */}
              <div className="bg-white border-2 border-slate-800 p-6 sm:p-10 rounded-xl shadow-lg max-w-[800px] mx-auto text-slate-900 print:shadow-none print:border-2 print:border-black print:p-8 print:m-0 print:max-w-none">
                
                {/* 1. Header */}
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-4">
                  {/* Right: State & School info */}
                  <div className="text-right text-xs sm:text-sm font-bold space-y-1">
                    <p className="font-black text-slate-950">المملكة العربية السعودية</p>
                    <p>وزارة التعليم</p>
                    <p>الإدارة العامة للتعليم بالمنطقة الشرقية</p>
                    <p className="font-black text-slate-950">{settings.schoolName}</p>
                  </div>

                  {/* Center: Bismillah & Ministry Logo */}
                  <div className="text-center space-y-2">
                    <p className="font-arabic font-bold text-base sm:text-lg tracking-wide">
                      بِسْمِ اللَّـهِ الرَّحْمَـٰنِ الرَّحِيمِ
                    </p>
                    <div className="w-16 h-12 mx-auto flex items-center justify-center">
                      {/* Ministry stylized badge icon */}
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-6 border-2 border-emerald-800 rounded-t-full flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-emerald-800" />
                        </div>
                        <span className="text-[9px] font-bold text-slate-700 mt-0.5">وزارة التعليم</span>
                      </div>
                    </div>
                  </div>

                  {/* Left: Registration meta info */}
                  <div className="text-left text-xs font-bold space-y-1 min-w-[140px]">
                    <div className="flex items-center justify-between border-b border-dotted border-slate-400 pb-0.5">
                      <span className="text-slate-600">الرقم :</span>
                      <span className="font-mono font-black">{referralNumber || 'تح-1447-001'}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-dotted border-slate-400 pb-0.5">
                      <span className="text-slate-600">التاريخ :</span>
                      <span>{hijriDate || '1447/03/15 هـ'}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-dotted border-slate-400 pb-0.5">
                      <span className="text-slate-600">المشفوعات :</span>
                      <span>{attachmentsCount || 'لا يوجد'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Main Title */}
                <div className="text-center my-4">
                  <h1 className="text-lg sm:text-xl font-black text-red-600 tracking-wide underline underline-offset-8 decoration-2 decoration-red-600 inline-block px-4 py-1">
                    استمارة تحويل طالب للمرشد الطلابي
                  </h1>
                </div>

                {/* 3. Student Identification Row */}
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold bg-slate-50/70 p-3 rounded-lg border border-slate-400 my-4 print:bg-transparent print:border-slate-800">
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="font-black text-slate-950 whitespace-nowrap">اسم الطالب :</span>
                    <span className="font-black text-sm text-slate-900 border-b border-dotted border-slate-700 flex-1 px-2">
                      {currentStudent?.name || '...................................................'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mr-4">
                    <div className="flex items-center gap-1">
                      <span className="font-black text-slate-950">الصف :</span>
                      <span className="border-b border-dotted border-slate-700 px-2 font-bold">
                        {currentStudent?.gradeLevel || '................'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="font-black text-slate-950">الفصل :</span>
                      <span className="border-b border-dotted border-slate-700 px-2 font-bold">
                        ( {currentStudent?.className || '...'} )
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. سبب التحويل (Referral Reasons Checkboxes Box) */}
                <div className="border border-slate-800 rounded-lg p-3 sm:p-4 my-4 space-y-3">
                  <div className="inline-block bg-blue-50 text-blue-950 font-black text-xs px-2.5 py-1 rounded border border-blue-300 print:bg-transparent print:border-none print:p-0 print:underline">
                    سبب التحويل :
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 text-xs font-bold pt-1">
                    {/* 1. إهمال في أداء الواجب */}
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-[11px] font-black ${
                        selectedReasons.includes('إهمال في أداء الواجب') ? 'bg-slate-900 text-white' : ''
                      }`}>
                        {selectedReasons.includes('إهمال في أداء الواجب') ? '✓' : ''}
                      </span>
                      <span>إهمال في أداء الواجب .</span>
                    </div>

                    {/* 2. عدم إحضار الكتاب */}
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-[11px] font-black ${
                        selectedReasons.includes('عدم إحضار الكتاب') ? 'bg-slate-900 text-white' : ''
                      }`}>
                        {selectedReasons.includes('عدم إحضار الكتاب') ? '✓' : ''}
                      </span>
                      <span>عدم إحضار الكتاب .</span>
                    </div>

                    {/* 3. مشاغبة */}
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-[11px] font-black ${
                        selectedReasons.includes('مشاغبة') ? 'bg-slate-900 text-white' : ''
                      }`}>
                        {selectedReasons.includes('مشاغبة') ? '✓' : ''}
                      </span>
                      <span>مشاغبة .</span>
                    </div>

                    {/* 4. تأخر عن الحصة */}
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-[11px] font-black ${
                        selectedReasons.includes('تأخر عن الحصة') ? 'bg-slate-900 text-white' : ''
                      }`}>
                        {selectedReasons.includes('تأخر عن الحصة') ? '✓' : ''}
                      </span>
                      <span>تأخر عن الحصة .</span>
                    </div>

                    {/* 5. ضعف دراسي */}
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-[11px] font-black ${
                        selectedReasons.includes('ضعف دراسي') ? 'bg-slate-900 text-white' : ''
                      }`}>
                        {selectedReasons.includes('ضعف دراسي') ? '✓' : ''}
                      </span>
                      <span>ضعف دراسي .</span>
                    </div>

                    {/* 6. أخرى */}
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-[11px] font-black ${
                        selectedReasons.includes('أخرى (تذكر)') ? 'bg-slate-900 text-white' : ''
                      }`}>
                        {selectedReasons.includes('أخرى (تذكر)') ? '✓' : ''}
                      </span>
                      <span>أخرى ( تذكر ) :</span>
                      {otherReasonText && (
                        <span className="font-normal border-b border-dotted border-slate-700 px-1">
                          {otherReasonText}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. مصدر الإحالة (Referral Source) */}
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold my-4 border-b border-slate-400 pb-3">
                  <div className="inline-block bg-blue-50 text-blue-950 font-black text-xs px-2.5 py-1 rounded border border-blue-300 print:bg-transparent print:border-none print:p-0">
                    مصدر الإحالة :
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-[11px] font-black ${
                        referralSource === 'principal' ? 'bg-slate-900 text-white' : ''
                      }`}>
                        {referralSource === 'principal' ? '✓' : ''}
                      </span>
                      <span>المدير</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-[11px] font-black ${
                        referralSource === 'vice_principal' ? 'bg-slate-900 text-white' : ''
                      }`}>
                        {referralSource === 'vice_principal' ? '✓' : ''}
                      </span>
                      <span>الوكيل</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-[11px] font-black ${
                        referralSource === 'teacher' ? 'bg-slate-900 text-white' : ''
                      }`}>
                        {referralSource === 'teacher' ? '✓' : ''}
                      </span>
                      <span>معلم الصف :</span>
                      <span className="border-b border-dotted border-slate-700 px-2 font-black">
                        {referrerName || '................................'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. إيضاح المشكلة (Problem Description Box) */}
                <div className="my-4 space-y-2">
                  <div className="inline-block bg-blue-50 text-blue-950 font-black text-xs px-2.5 py-1 rounded border border-blue-300 print:bg-transparent print:border-none print:p-0 print:underline">
                    إيضاح المشكلة :
                  </div>

                  <div className="min-h-[80px] p-2 text-xs sm:text-sm font-medium leading-loose border-b-2 border-slate-800 border-dotted">
                    {problemDescription ? (
                      <p className="whitespace-pre-wrap">{problemDescription}</p>
                    ) : (
                      <div className="space-y-4 py-2">
                        <div className="border-b border-dotted border-slate-400 h-4" />
                        <div className="border-b border-dotted border-slate-400 h-4" />
                        <div className="border-b border-dotted border-slate-400 h-4" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 7. Teacher Signature Row */}
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold my-4 border-b-2 border-slate-900 pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black">اسم المعلم /</span>
                    <span className="font-black border-b border-dotted border-slate-700 px-2">
                      {referrerName || '...........................'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-black">التوقيع /</span>
                    <span className="border-b border-dotted border-slate-700 px-3 font-arabic text-sm">
                      {teacherSignature || '...........................'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-black">التاريخ :</span>
                    <span>{hijriDate || ' /  / 1447 هـ'}</span>
                  </div>
                </div>

                {/* 8. ما تم حيال الطالب (Action Taken by Counselor) */}
                <div className="my-4 space-y-2">
                  <div className="inline-block bg-blue-50 text-blue-950 font-black text-xs px-2.5 py-1 rounded border border-blue-300 print:bg-transparent print:border-none print:p-0 print:underline">
                    ما تم حيال الطالب :
                  </div>

                  <div className="min-h-[80px] p-2 text-xs sm:text-sm font-medium leading-loose border-b-2 border-slate-800 border-dotted">
                    {actionTakenByCounselor ? (
                      <p className="whitespace-pre-wrap">{actionTakenByCounselor}</p>
                    ) : (
                      <div className="space-y-4 py-2">
                        <div className="border-b border-dotted border-slate-400 h-4" />
                        <div className="border-b border-dotted border-slate-400 h-4" />
                        <div className="border-b border-dotted border-slate-400 h-4" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 9. تم إحالته إلى (Final Routing Checklist) */}
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold my-4 border-b border-slate-400 pb-3">
                  <div className="inline-block bg-blue-50 text-blue-950 font-black text-xs px-2.5 py-1 rounded border border-blue-300 print:bg-transparent print:border-none print:p-0">
                    تم إحالته إلى :
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-[11px] font-black ${
                        referredNextTo === 'principal' ? 'bg-slate-900 text-white' : ''
                      }`}>
                        {referredNextTo === 'principal' ? '✓' : ''}
                      </span>
                      <span>المدير</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-[11px] font-black ${
                        referredNextTo === 'vice_principal' ? 'bg-slate-900 text-white' : ''
                      }`}>
                        {referredNextTo === 'vice_principal' ? '✓' : ''}
                      </span>
                      <span>الوكيل</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 border-2 border-slate-900 flex items-center justify-center text-[11px] font-black ${
                        referredNextTo === 'subject_teacher' ? 'bg-slate-900 text-white' : ''
                      }`}>
                        {referredNextTo === 'subject_teacher' ? '✓' : ''}
                      </span>
                      <span>معلم المادة</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span>بتاريخ :</span>
                      <span>{referredNextDate || ' /  / 1447 هـ'}</span>
                    </div>
                  </div>
                </div>

                {/* 10. Counselor Signature Row */}
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold pt-3 mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black">اسم المرشد الطلابي /</span>
                    <span className="font-black border-b border-dotted border-slate-700 px-2">
                      {counselorName || '...........................'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-black">التوقيع /</span>
                    <span className="border-b border-dotted border-slate-700 px-3 font-arabic text-sm">
                      {counselorSignature || '...........................'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="font-black">التاريخ :</span>
                    <span>{counselorDate || hijriDate || ' /  / 1447 هـ'}</span>
                  </div>
                </div>

                {/* Footer Stamp placeholder */}
                <div className="mt-8 pt-4 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
                  <span>ختم المدرسة والإرشاد الطلابي</span>
                  <span>نظام زيد بن ثابت لمتابعة الغياب والانضباط المدرسي v2.5</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

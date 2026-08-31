import React, { useState, useEffect } from 'react';
import { User, TeacherSessionValidation } from '../types';
import { AttendanceService } from '../services/attendanceService';
import { 
  GraduationCap, 
  Lock, 
  User as UserIcon, 
  Shield, 
  CheckCircle2, 
  ArrowRight,
  ArrowLeft, 
  KeyRound, 
  AlertTriangle, 
  AlertCircle, 
  Users, 
  Check, 
  Phone, 
  BookOpen, 
  DoorOpen, 
  Search,
  Sparkles,
  ChevronLeft,
  Crown,
  School,
  X,
  Layers
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  initialRole?: 'teacher' | 'admin' | null;
  sessionExpiredNotice?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ 
  isOpen, 
  onClose, 
  onLoginSuccess,
  initialRole = null,
  sessionExpiredNotice = false
}) => {

  // Navigation step: 'select_role' (Step 1) or 'enter_credentials' (Step 2)
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'admin' | null>(initialRole);
  const [teacherSearch, setTeacherSearch] = useState('');
  
  // Teacher credentials state
  const [teacherIdentifier, setTeacherIdentifier] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  
  // Admin credentials state
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionWarning, setSessionWarning] = useState<{
    user: User;
    validation: TeacherSessionValidation;
  } | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedRole(initialRole);
      setError('');
      setTeacherSearch('');
      setTeacherIdentifier('');
      setTeacherPassword('');
      setAdminPassword('');
      setSessionWarning(null);
    }
  }, [isOpen, initialRole]);

  if (!isOpen) return null;

  const users = AttendanceService.getUsers();
  const classes = AttendanceService.getClasses();
  const teachersList = users.filter(u => u.role === 'teacher');

  const completeLogin = (user: User) => {
    AttendanceService.setCurrentUser(user);
    onLoginSuccess(user);
    setSessionWarning(null);
    onClose();
  };

  // Direct 1-Click Teacher Login via Selection Card
  const handleTeacherCardSelect = (teacher: User) => {
    setError('');
    const validation = AttendanceService.validateTeacherSessionData(teacher);
    if (!validation.isValid) {
      setSessionWarning({ user: teacher, validation });
      return;
    }
    completeLogin(teacher);
  };

  // Form submit for Teacher Login
  const handleTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const trimmed = teacherIdentifier.trim().toLowerCase();
      const user = teachersList.find(u => 
        u.username.toLowerCase() === trimmed || 
        (u.phone && u.phone.trim() === teacherIdentifier.trim()) ||
        (u.nationalId && u.nationalId.trim() === teacherIdentifier.trim()) ||
        (u.email && u.email.toLowerCase() === trimmed) ||
        u.name.toLowerCase().includes(trimmed)
      );

      const enteredPass = teacherPassword.trim();

      if (!user) {
        setError('لم يتم العثور على معلم بهذا السجل المدني أو رقم الجوال أو الاسم. يرجى اختيار المعلم من القائمة أو التواصل مع الإدارة.');
        setLoading(false);
        return;
      }

      // Teacher password verification
      let isValid = true;
      if (enteredPass) {
        isValid = (
          (user.phone && enteredPass === user.phone) ||
          (user.nationalId && enteredPass === user.nationalId) ||
          (user.password && enteredPass === user.password) ||
          enteredPass === '123456' ||
          enteredPass === `${user.username}123`
        );
      }

      if (isValid) {
        const validation = AttendanceService.validateTeacherSessionData(user);
        if (!validation.isValid) {
          setSessionWarning({ user, validation });
          setLoading(false);
          return;
        }
        completeLogin(user);
      } else {
        setError('كلمة المرور غير صحيحة. (كلمة مرور المعلم المعتمدة هي رقم جواله المسجل).');
      }
      setLoading(false);
    }, 250);
  };

  // Form submit for Admin Login
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const trimmedUser = adminUsername.trim().toLowerCase();
      const enteredPass = adminPassword.trim();

      const user = users.find(u => u.role === 'admin' && (u.username.toLowerCase() === trimmedUser || trimmedUser === 'admin'));

      let isValid = false;
      if (user) {
        isValid = (
          enteredPass === 'Aa12345' || 
          (user.password && enteredPass === user.password) ||
          enteredPass === 'admin123'
        );
      }

      if (user && isValid) {
        completeLogin(user);
      } else {
        setError('بيانات دخول الإدارة غير صحيحة. كلمة المرور المعتمدة لإدارة مدرسة زيد بن ثابت هي: Aa12345');
      }
      setLoading(false);
    }, 250);
  };

  // Quick 1-click admin login
  const handleQuickAdminLogin = () => {
    const adminUser = users.find(u => u.username === 'admin') || users.find(u => u.role === 'admin');
    if (adminUser) {
      completeLogin(adminUser);
    }
  };

  // Filtered teachers list for teacher tab
  const filteredTeachers = teachersList.filter(t => {
    if (!teacherSearch) return true;
    const q = teacherSearch.toLowerCase().trim();
    return t.name.toLowerCase().includes(q) || 
           (t.assignedClassName && t.assignedClassName.toLowerCase().includes(q)) ||
           (t.nationalId && t.nationalId.includes(q)) ||
           (t.email && t.email.toLowerCase().includes(q)) ||
           (t.subject && t.subject.toLowerCase().includes(q)) ||
           (t.phone && t.phone.includes(q));
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {sessionWarning ? (
          /* Session Data Empty / Incomplete Warning View */
          <div className="p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 mx-auto flex items-center justify-center shadow-inner">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                تنبيه: التحقق من بيانات الفصل المدرسي
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                تم رصد نقص في البيانات المطلوبة لكشف رصد الحصة الثانية
              </p>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-amber-200/60">
                <span className="font-bold text-slate-700">المعلم: {sessionWarning.user.name}</span>
                <span className="bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-full text-[11px]">
                  {sessionWarning.validation.className}
                </span>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>الملاحظات المكتشفة:</span>
                </div>
                <ul className="text-xs text-amber-800 space-y-1.5 pr-5 list-disc font-medium">
                  {sessionWarning.validation.issues.map((issue, idx) => (
                    <li key={idx} className="leading-relaxed">{issue}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-amber-200/60 text-[11px] text-slate-600 flex items-center justify-between">
                <span>عدد الطلاب المسجلين حالياً:</span>
                <span className="font-black text-amber-900 bg-white px-2 py-0.5 rounded-lg border border-amber-200">
                  {sessionWarning.validation.studentCount} طالب
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => completeLogin(sessionWarning.user)}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>المتابعة والدخول إلى كشف الرصد</span>
              </button>

              <button
                type="button"
                onClick={() => setSessionWarning(null)}
                className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-medium transition text-center block"
              >
                الرجوع واختيار حساب آخر
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div className={`p-6 text-white text-center relative border-b transition-all duration-300 ${
              selectedRole === 'admin'
                ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 border-amber-600/40'
                : selectedRole === 'teacher'
                ? 'bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 border-emerald-700/50'
                : 'bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 border-emerald-900/60'
            }`}>
              <button
                onClick={onClose}
                className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm transition"
              >
                <X className="w-4 h-4" />
              </button>
              
              {/* Back to Step 1 Button if inside a role portal */}
              {selectedRole !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole(null);
                    setError('');
                  }}
                  className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition border border-white/15"
                  title="الرجوع إلى صفحة اختيار نوع الحساب"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>تغيير المسار</span>
                </button>
              )}

              <div className="w-13 h-13 rounded-2xl bg-white/10 border border-white/20 mx-auto flex items-center justify-center mb-2 shadow-inner">
                {selectedRole === 'admin' ? (
                  <Shield className="w-7 h-7 text-amber-300" />
                ) : selectedRole === 'teacher' ? (
                  <GraduationCap className="w-7 h-7 text-emerald-300" />
                ) : (
                  <School className="w-7 h-7 text-emerald-300" />
                )}
              </div>
              
              <h2 className="text-lg font-black font-brand text-white">
                {selectedRole === 'admin' 
                  ? 'بوابة الإدارة المدرسية المركزية' 
                  : selectedRole === 'teacher' 
                  ? 'بوابة المعلم ومربي الفصل' 
                  : 'منظومة متابعة الحضور والغياب'}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                مدرسة زيد بن ثابت الابتدائية — رصد الحصة الثانية
              </p>
            </div>

            {/* Session Expired Notice Banner */}
            {sessionExpiredNotice && (
              <div className="bg-amber-500/90 border-b border-amber-600 text-slate-950 p-3 text-xs font-black text-center flex items-center justify-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
                <span>انتهت صلاحية الجلسة تلقائياً بعد 30 دقيقة من الخمول لحماية خصوصية بيانات الطلاب. يرجى تسجيل الدخول مجدداً.</span>
              </div>
            )}


            {/* STEP 1: INITIAL ROLE SELECTION SCREEN (WHEN NO ROLE CHOSEN YET) */}
            {selectedRole === null && (
              <div className="p-6 sm:p-7 overflow-y-auto flex-1 space-y-5 animate-in fade-in duration-200">
                <div className="text-center space-y-1">
                  <span className="bg-emerald-100 text-emerald-900 text-[11px] font-black px-3 py-1 rounded-full border border-emerald-200 inline-block">
                    الخطوة 1: حدد مسار الدخول
                  </span>
                  <h3 className="text-base font-black text-slate-900 pt-1">
                    اختر نوع الحساب للمتابعة
                  </h3>
                  <p className="text-xs text-slate-500">
                    سيتم تخصيص شاشة الدخول والحقول تلقائياً بحسب صلاحياتك المدرسية
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Option A: Admin Portal Card */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('admin');
                      setError('');
                    }}
                    className="p-5 rounded-3xl border-2 border-slate-200 bg-gradient-to-br from-white via-amber-50/30 to-amber-100/40 hover:border-amber-400 hover:shadow-xl transition-all text-right group flex flex-col justify-between gap-4 relative overflow-hidden"
                  >
                    <div className="absolute top-3 left-3">
                      <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                        صلاحيات عليا
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20 group-hover:scale-110 transition-transform">
                        <Shield className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 group-hover:text-amber-950 transition">
                          إدارة المدرسة
                        </h4>
                        <p className="text-[11px] text-slate-600 font-medium mt-1 leading-relaxed">
                          المدير، الوكلاء، والمشرفون — لوحة المتابعة الشاملة، تنبيه المعلمين، وتصدير الكشوفات.
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-amber-200/60 flex items-center justify-between text-xs font-black text-amber-900">
                      <span>دخول مسار الإدارة</span>
                      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    </div>
                  </button>

                  {/* Option B: Teacher Portal Card */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('teacher');
                      setError('');
                    }}
                    className="p-5 rounded-3xl border-2 border-slate-200 bg-gradient-to-br from-white via-emerald-50/30 to-emerald-100/40 hover:border-emerald-500 hover:shadow-xl transition-all text-right group flex flex-col justify-between gap-4 relative overflow-hidden"
                  >
                    <div className="absolute top-3 left-3">
                      <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                        رصد الحصة 2
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20 group-hover:scale-110 transition-transform">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-950 transition">
                          معلم / مربي فصل
                        </h4>
                        <p className="text-[11px] text-slate-600 font-medium mt-1 leading-relaxed">
                          معلمو الفصول والشعب — رصد كشف غياب الحصة الثانية، تأكيد الحضور، والتسجيل السريع.
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs font-black text-emerald-900">
                      <span>دخول مسار المعلمين</span>
                      <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: DEDICATED INPUT FIELDS BASED ON SELECTED ROLE */}
            {selectedRole !== null && (
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 animate-in fade-in duration-200">
                {/* Role Switcher Sub-Header Bar */}
                <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">المسار النشط:</span>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-xl shadow-xs ${
                      selectedRole === 'admin'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {selectedRole === 'admin' ? '🛡️ إدارة المدرسة (المدير)' : '👨‍🏫 المعلم (رصد الحصة 2)'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole(selectedRole === 'admin' ? 'teacher' : 'admin');
                      setError('');
                    }}
                    className="text-xs font-bold text-slate-600 hover:text-slate-950 px-2.5 py-1 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition"
                  >
                    التبديل إلى {selectedRole === 'admin' ? 'مسار المعلم' : 'مسار الإدارة'}
                  </button>
                </div>

                {error && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* --- ROLE A: TEACHER LOGIN PATH & INPUTS --- */}
                {selectedRole === 'teacher' && (
                  <div className="space-y-4 animate-in fade-in">
                    <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-emerald-900 font-bold">
                        <BookOpen className="w-4 h-4 text-emerald-700" />
                        <span>اختر اسمك وشعبتك للدخول الفوري لكشف الرصد:</span>
                      </div>
                      <span className="text-[10px] text-emerald-700 bg-emerald-200/60 px-2 py-0.5 rounded-full font-bold">
                        {filteredTeachers.length} معلمين
                      </span>
                    </div>

                    {/* Search box for teachers */}
                    <div className="relative">
                      <input
                        type="text"
                        value={teacherSearch}
                        onChange={(e) => setTeacherSearch(e.target.value)}
                        placeholder="بحث سريع باسم المعلم أو الصف..."
                        className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    </div>

                    {/* Teacher Direct Selection Cards */}
                    {filteredTeachers.length === 0 ? (
                      <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-2">
                        <Users className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">لم يتم تسجيل معلمين في النظام بعد</p>
                        <p className="text-[11px] text-slate-500">يمكن لإدارة المدرسة إضافة المعلمين وتوزيعهم على الفصول من لوحة الإدارة أو استيرادهم</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                        {filteredTeachers.map(teacher => {
                          const currentDayInfo = AttendanceService.getCurrentDayKey();
                          const todayAssignedClass = AttendanceService.getTeacherAssignedClassForDay(teacher.id, currentDayInfo.key);
                          const displayClass = todayAssignedClass 
                            ? `${todayAssignedClass.name} (اليوم)` 
                            : (teacher.assignedClassName || teacher.subject || 'معلم');

                          return (
                            <button
                              key={teacher.id}
                              type="button"
                              onClick={() => handleTeacherCardSelect(teacher)}
                              className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-emerald-50/70 hover:border-emerald-400 transition-all text-right group shadow-sm flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition">
                                  <UserIcon className="w-4 h-4" />
                                </div>
                                <div className="overflow-hidden">
                                  <div className="text-xs font-black text-slate-900 truncate">{teacher.name}</div>
                                  <div className="text-[11px] text-emerald-800 font-bold truncate flex items-center gap-1">
                                    <span>{displayClass}</span>
                                    {teacher.phone && (
                                      <span className="text-[10px] text-slate-400 font-mono">({teacher.phone})</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="text-emerald-700 text-xs font-bold shrink-0 opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">
                                <span>دخول</span>
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}


                    <div className="relative my-3 text-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                      </div>
                      <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400">
                        أو إدخال رقم الجوال المسجل
                      </span>
                    </div>

                    {/* Teacher Manual Phone Input Form */}
                    <form onSubmit={handleTeacherSubmit} className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          رقم جوال المعلم أو اسم المستخدم
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={teacherIdentifier}
                            onChange={(e) => setTeacherIdentifier(e.target.value)}
                            placeholder="مثال: 0550000001 أو teacher1"
                            required
                            className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                          />
                          <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <span>جاري التحقق...</span>
                        ) : (
                          <>
                            <KeyRound className="w-4 h-4" />
                            <span>دخول لكشف رصد الحصة الثانية</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}

                {/* --- ROLE B: ADMIN LOGIN PATH & INPUTS --- */}
                {selectedRole === 'admin' && (
                  <div className="space-y-4 animate-in fade-in">
                    {/* Quick 1-Click Fast Admin Login */}
                    <button
                      type="button"
                      onClick={handleQuickAdminLogin}
                      className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 hover:bg-amber-100 transition text-right group shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-sm shadow-sm">
                          <Shield className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900">دخول فوري مباشر للإدارة (المشرف / المدير)</div>
                          <div className="text-[11px] text-amber-900 font-bold">لوحة التحكم المركزية والمتابعة الميدانية الكاملة</div>
                        </div>
                      </div>
                      <span className="text-xs bg-amber-500 text-slate-950 px-3 py-1.5 rounded-xl font-black group-hover:scale-105 transition flex items-center gap-1 shadow-sm">
                        دخول سريع <ArrowLeft className="w-3.5 h-3.5" />
                      </span>
                    </button>

                    <div className="relative my-3 text-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                      </div>
                      <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400">
                        أو إدخال بيانات الدخول المعتمدة
                      </span>
                    </div>

                    {/* Manual Admin Form */}
                    <form onSubmit={handleAdminSubmit} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم مستخدم الإدارة</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={adminUsername}
                            onChange={(e) => setAdminUsername(e.target.value)}
                            placeholder="admin"
                            required
                            className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none transition"
                          />
                          <UserIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          كلمة المرور المعتمدة للإدارة (Aa12345)
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="أدخل كلمة المرور (Aa12345)"
                            required
                            className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none transition"
                          />
                          <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white text-xs font-black rounded-xl shadow-lg shadow-slate-900/20 transition flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <span>جاري التحقق...</span>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 text-amber-400" />
                            <span>دخول لوحة التحكم المركزية</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

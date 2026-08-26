import React, { useState } from 'react';
import { User, TeacherSessionValidation } from '../types';
import { AttendanceService } from '../services/attendanceService';
import { 
  GraduationCap, Lock, User as UserIcon, Shield, CheckCircle2, 
  ArrowLeft, KeyRound, AlertTriangle, AlertCircle, RefreshCw, Users, Check
} from 'lucide-react';
import { INITIAL_STUDENTS } from '../services/mockData';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionWarning, setSessionWarning] = useState<{
    user: User;
    validation: TeacherSessionValidation;
  } | null>(null);

  if (!isOpen) return null;

  const users = AttendanceService.getUsers();

  const completeLogin = (user: User) => {
    AttendanceService.setCurrentUser(user);
    onLoginSuccess(user);
    setSessionWarning(null);
    onClose();
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      // Find matching user
      const trimmedUser = username.trim().toLowerCase();
      const user = users.find(u => 
        u.username.toLowerCase() === trimmedUser || 
        (u.phone && u.phone === username.trim())
      );
      
      const enteredPass = password.trim();

      // Password verification:
      // 1. Admin/Supervisor: Aa12345 (or user.password if set)
      // 2. Teacher: Their registered phone number (or user.password if set)
      // 3. Fallback compatibility: admin123/teacher123/123456
      let isValid = false;

      if (user) {
        if (user.role === 'admin') {
          isValid = (
            enteredPass === 'Aa12345' || 
            (user.password && enteredPass === user.password) ||
            enteredPass === 'admin123'
          );
        } else {
          // Teacher password is their phone number
          isValid = (
            (user.phone && enteredPass === user.phone) ||
            (user.password && enteredPass === user.password) ||
            enteredPass === 'teacher123' ||
            enteredPass === `${user.username}123` ||
            enteredPass === '123456'
          );
        }
      }

      if (user && isValid) {
        if (user.role === 'teacher') {
          const validation = AttendanceService.validateTeacherSessionData(user);
          if (!validation.isValid) {
            setSessionWarning({ user, validation });
            setLoading(false);
            return;
          }
        }

        completeLogin(user);
      } else {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة. (كلمة مرور المشرف: Aa12345 | كلمة مرور المعلم: رقم جواله)');
      }
      setLoading(false);
    }, 300);
  };

  const handleQuickLogin = (targetUsername: string, pass: string) => {
    setUsername(targetUsername);
    setPassword(pass);
    const user = users.find(u => u.username === targetUsername);
    if (user) {
      if (user.role === 'teacher') {
        const validation = AttendanceService.validateTeacherSessionData(user);
        if (!validation.isValid) {
          setSessionWarning({ user, validation });
          return;
        }
      }
      completeLogin(user);
    }
  };

  const handleRestoreStudentsAndProceed = () => {
    if (!sessionWarning) return;
    // Restore default students from INITIAL_STUDENTS
    localStorage.setItem('zbt_students_v2', JSON.stringify(INITIAL_STUDENTS));
    AttendanceService.recalculateAllClassCounts();
    completeLogin(sessionWarning.user);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {sessionWarning ? (
          /* Session Data Empty / Incomplete Warning View */
          <div className="p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 mx-auto flex items-center justify-center shadow-inner">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                تنبيه: التحقق من بيانات الحصة الدراسية
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
                  <span>الملاحظات المكتشفة أثناء الفحص:</span>
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
                onClick={handleRestoreStudentsAndProceed}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>مزامنة واستعادة قوائم الطلاب الأصلية ومتابعة الدخول</span>
              </button>

              <button
                type="button"
                onClick={() => completeLogin(sessionWarning.user)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 text-slate-500" />
                <span>المتابعة إلى الكشف على أي حال</span>
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
          /* Standard Login Header & Form */
          <>
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-800 via-teal-800 to-emerald-950 p-6 text-white text-center relative">
              <button
                onClick={onClose}
                className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm transition"
              >
                ✕
              </button>
              
              <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 mx-auto flex items-center justify-center mb-3 shadow-inner">
                <GraduationCap className="w-9 h-9 text-emerald-300" />
              </div>
              <h2 className="text-xl font-black font-brand text-white">تسجيل الدخول للنظام</h2>
              <p className="text-xs text-emerald-200 mt-1">مدرسة زيد بن ثابت الابتدائية</p>
            </div>

            {/* Quick Demo Accounts Selection */}
            <div className="p-6">
              <div className="mb-5">
                <label className="text-xs font-bold text-slate-500 mb-2 block">
                  حسابات تجريبية سريعة بنقرة واحدة:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {/* Admin Card */}
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin', 'Aa12345')}
                    className="flex items-center justify-between p-3 rounded-2xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 hover:border-amber-400 transition text-right group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900">إدارة المدرسة (المشرف / المدير)</div>
                        <div className="text-[11px] text-amber-800 font-bold">لوحة التحكم المركزية (admin / Aa12345)</div>
                      </div>
                    </div>
                    <span className="text-xs text-amber-700 font-bold group-hover:translate-x-[-4px] transition flex items-center gap-1">
                      دخول <ArrowLeft className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  {/* Teacher 1 Card */}
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('teacher1', '0550000001')}
                    className="flex items-center justify-between p-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 hover:border-emerald-400 transition text-right group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900">معلم الصف الثالث (1)</div>
                        <div className="text-[11px] text-emerald-800 font-bold">كشف رصد الحصة الثانية (teacher1 / 0550000001)</div>
                      </div>
                    </div>
                    <span className="text-xs text-emerald-700 font-bold group-hover:translate-x-[-4px] transition flex items-center gap-1">
                      دخول <ArrowLeft className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  {/* Teacher 2 Card */}
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('teacher2', '0550000002')}
                    className="flex items-center justify-between p-3 rounded-2xl border border-teal-200 bg-teal-50/70 hover:bg-teal-100 hover:border-teal-400 transition text-right group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900">معلم الصف الثالث (2)</div>
                        <div className="text-[11px] text-teal-800 font-bold">كشف رصد الحصة الثانية (teacher2 / 0550000002)</div>
                      </div>
                    </div>
                    <span className="text-xs text-teal-700 font-bold group-hover:translate-x-[-4px] transition flex items-center gap-1">
                      دخول <ArrowLeft className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </div>
              </div>

              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400">
                  أو أدخل بيانات الحساب يدويًا
                </span>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-3.5">
                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2">
                    <span>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم المستخدم أو رقم الجوال</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="مثال: admin أو teacher1 أو 0550000001"
                      required
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                    />
                    <UserIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="كلمة المرور (المشرف: Aa12345 | المعلم: رقم جواله)"
                      required
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-700/20 transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span>جاري التحقق من الحساب والبيانات...</span>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>دخول إلى النظام والتحقق من الجاهزية</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

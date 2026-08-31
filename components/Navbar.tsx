import React, { useState, useEffect } from 'react';
import { User, SchoolSettings, AttendanceNotification } from '../types';
import { AttendanceService, NOTIFICATION_EVENT } from '../services/attendanceService';
import { NotificationCenterModal } from './NotificationCenterModal';
import { 
  GraduationCap, 
  UserCheck, 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
  Sparkles, 
  FileText, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Clock, 
  Calendar,
  Bell,
  CheckCircle2,
  AlertCircle,
  Archive,
  FileSpreadsheet,
  Phone
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  onQuickSwitchUser: (username: string) => void;
  settings: SchoolSettings;
  simulatedTime: string | null;
  onOpenSettings: () => void;
  pendingClassesCount: number;
  onOpenClassSheet?: (classId: string) => void;
  onOpenArchivingModal?: () => void;
  onOpenTeacherAndClassManager?: () => void;
  onOpenTeacherReminderModal?: () => void;
  onOpenGoogleSheetsModal?: () => void;
  onOpenStudentImportModal?: () => void;
  onOpenContactsModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  onOpenLoginModal,
  onLogout,
  onQuickSwitchUser,
  settings,
  simulatedTime,
  onOpenSettings,
  pendingClassesCount,
  onOpenClassSheet,
  onOpenArchivingModal,
  onOpenTeacherAndClassManager,
  onOpenTeacherReminderModal,
  onOpenGoogleSheetsModal,
  onOpenStudentImportModal,
  onOpenContactsModal
}) => {
  const [currentDateStr, setCurrentDateStr] = useState('');
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(() => {
    return AttendanceService.getNotifications().filter(n => !n.read).length;
  });

  const updateNotifCount = () => {
    const list = AttendanceService.getNotifications();
    setUnreadNotifCount(list.filter(n => !n.read).length);
  };

  useEffect(() => {
    const handleNotif = () => {
      updateNotifCount();
    };
    window.addEventListener(NOTIFICATION_EVENT, handleNotif);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handleNotif);
  }, []);

  useEffect(() => {
    // Format Arabic Gregorian date once
    const now = new Date();
    const optionsDate: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    setCurrentDateStr(now.toLocaleDateString('ar-SA', optionsDate));

    const updateTime = () => {
      const current = new Date();
      const timeStr = simulatedTime || current.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setCurrentTimeStr(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [simulatedTime]);

  const periodInfo = AttendanceService.isPeriod2Active(settings, simulatedTime || undefined);


  return (
    <header className="bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b border-emerald-100 shadow-sm">
      {/* Top utility bar */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white text-xs px-6 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-emerald-100">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-300" />
            <span className="font-medium">{currentDateStr}</span>
          </div>
          <span className="text-emerald-400/60 hidden md:inline">|</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-300" />
            <span className="font-mono font-bold text-emerald-200">{currentTimeStr}</span>
          </div>
          <span className="text-emerald-400/60 hidden lg:inline">|</span>
          <span className="bg-emerald-700/50 px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-100 hidden lg:inline">
            {settings.academicYear} — {settings.term}
          </span>
        </div>

        {/* Active User Indicator & Switch Modal Trigger */}
        <div className="flex items-center gap-2.5">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-xl border border-white/10 text-[11px]">
                <span className="text-emerald-300 font-bold">الحساب الحالي:</span>
                <span className="font-black text-white">
                  {currentUser.role === 'admin' ? '👑 الإدارة المدرسية (المدير)' : `👨‍🏫 ${currentUser.name} (${currentUser.assignedClassName || 'معلم'})`}
                </span>
              </div>

              {currentUser.role === 'admin' && onOpenGoogleSheetsModal && (
                <button
                  type="button"
                  onClick={onOpenGoogleSheetsModal}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] rounded-lg transition flex items-center gap-1 shadow-sm border border-emerald-400/40"
                  title="تصدير ومزامنة كشف الحصة الثانية وسجل الطلاب مع Google Sheets"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Google Sheets</span>
                </button>
              )}

              {currentUser.role === 'admin' && onOpenTeacherReminderModal && (
                <button
                  type="button"
                  onClick={onOpenTeacherReminderModal}
                  className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] rounded-lg transition flex items-center gap-1 shadow-sm"
                  title="فتح مركز إرسال التنبيهات وتذكير المعلمين"
                >
                  <Bell className="w-3 h-3 text-slate-950 animate-pulse" />
                  <span>تنبيه المعلمين ({pendingClassesCount})</span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenLoginModal}
                className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white font-bold text-[11px] rounded-lg transition border border-white/20 flex items-center gap-1"
                title="تبديل الحساب (الدخول كمعلم أو إدارة)"
              >
                <span>تبديل الحساب</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-lg transition flex items-center gap-1 shadow-sm"
            >
              <span>تسجيل الدخول</span>
            </button>
          )}
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
        {/* School Logo & Title */}
        <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => setActiveTab(currentUser?.role === 'teacher' ? 'attendance' : 'dashboard')}>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 ring-4 ring-emerald-50">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-brand font-black text-xl text-slate-800 tracking-tight">
                مدرسة زيد بن ثابت
              </h1>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                الابتدائية
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400">
              نظام متابعة غياب الطلاب ورصد الحصة الثانية
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80">
          {currentUser?.role === 'admin' ? (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'dashboard'
                    ? 'bg-white shadow-md text-emerald-800 ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                <span>لوحة المتابعة المدرسية</span>
                {pendingClassesCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {pendingClassesCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('students')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'students'
                    ? 'bg-white shadow-md text-emerald-800 ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-600" />
                <span>سجل الطلاب والمواظبة</span>
              </button>

              {onOpenTeacherAndClassManager && (
                <button
                  onClick={onOpenTeacherAndClassManager}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 text-slate-600 hover:bg-white/60 hover:text-slate-900"
                >
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                  <span>المعلمين والفصول</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('excuses')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'excuses'
                    ? 'bg-white shadow-md text-emerald-800 ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>الأعذار والتقارير</span>
              </button>

              <button
                onClick={() => setActiveTab('contacts')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'contacts'
                    ? 'bg-white shadow-md text-emerald-800 ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>دليل جهات الاتصال 📱</span>
              </button>

              <button
                onClick={() => setActiveTab('ai-advisor')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'ai-advisor'
                    ? 'bg-white shadow-md text-purple-800 ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:bg-white/60 hover:text-purple-700'
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>المساعد الذكي (AI)</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'attendance'
                    ? 'bg-white shadow-md text-emerald-800 ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                <ClipboardList className="w-4 h-4 text-emerald-600" />
                <span>رصد غياب الحصة الثانية</span>
              </button>

              <button
                onClick={() => setActiveTab('class-history')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'class-history'
                    ? 'bg-white shadow-md text-emerald-800 ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>سجل الكشوفات السابقة</span>
              </button>

              <button
                onClick={() => setActiveTab('excuses')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'excuses'
                    ? 'bg-white shadow-md text-emerald-800 ring-1 ring-slate-900/5'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>أعذار الطلاب</span>
              </button>
            </>
          )}
        </nav>

        {/* User Profile & Actions */}
        <div className="flex items-center gap-3">
          {/* Real-time Notification Bell Button */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => {
                  setIsNotifModalOpen(true);
                  if (unreadNotifCount > 0) {
                    AttendanceService.markAllNotificationsAsRead();
                    setUnreadNotifCount(0);
                  }
                }}
                className={`relative p-2.5 rounded-2xl border transition flex items-center justify-center ${
                  unreadNotifCount > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 shadow-sm animate-pulse'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50/50'
                }`}
                title="مركز إشعارات وتنبيهات غياب الحصة الثانية"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-rose-600 text-white font-black text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-md">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-3 p-1.5 pr-3 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition bg-white shadow-sm"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-800">{currentUser.name}</div>
                  <div className="text-[11px] font-semibold text-emerald-600">
                    {currentUser.role === 'admin' ? 'مدير المدرسة' : currentUser.assignedClassName || 'معلم'}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {currentUser.role === 'admin' ? 'مدير' : 'معلم'}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {isUserDropdownOpen && (
                <div 
                  className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={() => setIsUserDropdownOpen(false)}
                >
                  <div className="p-3 border-b border-slate-100 bg-slate-50 rounded-xl mb-1">
                    <div className="font-bold text-slate-900 text-sm">{currentUser.name}</div>
                    <div className="text-xs text-slate-500">{currentUser.subject || 'إدارة المدرسة'}</div>
                    <div className="text-[11px] text-emerald-700 mt-1 font-semibold">
                      اسم المستخدم: @{currentUser.username}
                    </div>
                  </div>

                  {currentUser.role === 'admin' && (
                    <>
                      {onOpenTeacherAndClassManager && (
                        <button
                          onClick={() => {
                            onOpenTeacherAndClassManager();
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full text-right px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 rounded-xl transition flex items-center gap-2"
                        >
                          <GraduationCap className="w-4 h-4 text-emerald-600" />
                          <span>إدارة المعلمين والفصول والشعب</span>
                        </button>
                      )}

                      {onOpenStudentImportModal && (
                        <button
                          onClick={() => {
                            onOpenStudentImportModal();
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full text-right px-3 py-2 text-xs font-bold text-emerald-900 bg-emerald-50/60 hover:bg-emerald-100 rounded-xl transition flex items-center gap-2"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                          <span>استيراد وتوزيع الطلاب (Excel/CSV) 📥</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onOpenSettings();
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        <span>إعدادات النظام والحصص</span>
                      </button>

                      {onOpenArchivingModal && (
                        <button
                          onClick={() => {
                            onOpenArchivingModal();
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full text-right px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50 rounded-xl transition flex items-center gap-2"
                        >
                          <Archive className="w-4 h-4 text-amber-600" />
                          <span>أرشفة واسترجاع البيانات 📦</span>
                        </button>
                      )}

                      {onOpenGoogleSheetsModal && (
                        <button
                          onClick={() => {
                            onOpenGoogleSheetsModal();
                            setIsUserDropdownOpen(false);
                          }}
                          className="w-full text-right px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 rounded-xl transition flex items-center gap-2"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          <span>تكامل Google Sheets وDrive 📊</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (onOpenContactsModal) onOpenContactsModal();
                          else setActiveTab('contacts');
                          setIsUserDropdownOpen(false);
                        }}
                        className="w-full text-right px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 rounded-xl transition flex items-center gap-2"
                      >
                        <Phone className="w-4 h-4 text-emerald-600" />
                        <span>دليل جهات الاتصال والتواصل 📱</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => {
                      setIsNotifModalOpen(true);
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition flex items-center gap-2"
                  >
                    <Bell className="w-4 h-4 text-slate-400" />
                    <span>مركز إشعارات الرصد الفوري</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenLoginModal();
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full text-right px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition flex items-center gap-2"
                  >
                    <UserCheck className="w-4 h-4 text-slate-400" />
                    <span>تبديل المستخدم</span>
                  </button>

                  <div className="my-1 border-t border-slate-100"></div>

                  <button
                    onClick={() => {
                      onLogout();
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full text-right px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenLoginModal}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-700/20 transition flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>تسجيل الدخول</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Center Modal */}
      {isNotifModalOpen && (
        <NotificationCenterModal
          isOpen={isNotifModalOpen}
          onClose={() => {
            setIsNotifModalOpen(false);
            updateNotifCount();
          }}
          onOpenClassSheet={(classId) => {
            if (onOpenClassSheet) onOpenClassSheet(classId);
          }}
        />
      )}

      {/* Mobile Tab Bar */}
      <div className="md:hidden flex overflow-x-auto no-scrollbar px-4 py-2 bg-slate-50 border-t border-slate-200 gap-1">
        {currentUser?.role === 'admin' ? (
          <>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                activeTab === 'dashboard' ? 'bg-emerald-700 text-white' : 'text-slate-600'
              }`}
            >
              لوحة المتابعة
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                activeTab === 'students' ? 'bg-emerald-700 text-white' : 'text-slate-600'
              }`}
            >
              سجل الطلاب
            </button>
            <button
              onClick={() => setActiveTab('excuses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                activeTab === 'excuses' ? 'bg-emerald-700 text-white' : 'text-slate-600'
              }`}
            >
              الأعذار والتقارير
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                activeTab === 'contacts' ? 'bg-emerald-700 text-white' : 'text-slate-600'
              }`}
            >
              جهات الاتصال 📱
            </button>
            <button
              onClick={() => setActiveTab('ai-advisor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                activeTab === 'ai-advisor' ? 'bg-purple-700 text-white' : 'text-slate-600'
              }`}
            >
              المساعد الذكي
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                activeTab === 'attendance' ? 'bg-emerald-700 text-white' : 'text-slate-600'
              }`}
            >
              رصد الحصة الثانية
            </button>
            <button
              onClick={() => setActiveTab('class-history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                activeTab === 'class-history' ? 'bg-emerald-700 text-white' : 'text-slate-600'
              }`}
            >
              سجل الكشوفات
            </button>
            <button
              onClick={() => setActiveTab('excuses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                activeTab === 'excuses' ? 'bg-emerald-700 text-white' : 'text-slate-600'
              }`}
            >
              الأعذار
            </button>
          </>
        )}
      </div>
    </header>
  );
};

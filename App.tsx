import React, { useState, useEffect } from 'react';
import { User, SchoolSettings } from './types';
import { AttendanceService, SCHEDULE_CHANGE_EVENT } from './services/attendanceService';
import { Navbar } from './components/Navbar';
import { TimeSimulatorBar } from './components/TimeSimulatorBar';
import { AdminDashboard } from './components/AdminDashboard';
import { TeacherAttendanceSheet } from './components/TeacherAttendanceSheet';
import { StudentDirectory } from './components/StudentDirectory';
import { ExcuseManager } from './components/ExcuseManager';
import { AIAdvisoryHub } from './components/AIAdvisoryHub';
import { ClassHistoryViewer } from './components/ClassHistoryViewer';
import { LoginModal } from './components/LoginModal';
import { SchoolSettingsModal } from './components/SchoolSettingsModal';
import { PrintableDailyReport } from './components/PrintableDailyReport';
import { ToastNotificationContainer } from './components/ToastNotificationContainer';
import { PdfReportsExportModal } from './components/PdfReportsExportModal';
import { DataArchivingModal } from './components/DataArchivingModal';
import { TeacherAndClassManagerModal } from './components/TeacherAndClassManagerModal';
import { TeacherReminderModal } from './components/TeacherReminderModal';
import { GoogleSheetsExportModal } from './components/GoogleSheetsExportModal';
import { StudentImportModal } from './components/StudentImportModal';
import { ContactsManager } from './components/ContactsManager';
import { ContactsManagerModal } from './components/ContactsManagerModal';
import { PortalLinksModal } from './components/PortalLinksModal';
import { StudentReferralsManager } from './components/StudentReferralsManager';
import { StudentReferralModal } from './components/StudentReferralModal';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { GraduationCap, ShieldAlert, Sparkles, BookOpen, Clock, Heart, ShieldCheck } from 'lucide-react';
import { getTodayDateString } from './services/initialData';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    AttendanceService.initStorage();
    return AttendanceService.getCurrentUser();
  });

  const [settings, setSettings] = useState<SchoolSettings>(() => AttendanceService.getSettings());
  const [simulatedTime, setSimulatedTime] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const portal = params?.get('portal') || params?.get('role');
    const hash = typeof window !== 'undefined' ? window.location.hash.toLowerCase() : '';
    if (portal === 'teacher' || hash.includes('teacher')) {
      return 'attendance';
    }
    return 'dashboard';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(() => {
    AttendanceService.initStorage();
    return !AttendanceService.getCurrentUser();
  });
  const [loginInitialRole, setLoginInitialRole] = useState<'teacher' | 'admin' | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);
  const [isArchivingModalOpen, setIsArchivingModalOpen] = useState(false);
  const [isTeacherAndClassModalOpen, setIsTeacherAndClassModalOpen] = useState(false);
  const [isTeacherReminderModalOpen, setIsTeacherReminderModalOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  const [isStudentImportModalOpen, setIsStudentImportModalOpen] = useState(false);
  const [isContactsModalOpen, setIsContactsModalOpen] = useState(false);
  const [isPortalLinksModalOpen, setIsPortalLinksModalOpen] = useState(false);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false);

  // Parse direct portal URL query params (?portal=teacher / ?portal=admin)
  // The portal link only preselects which login form to show. It NEVER signs anyone in.
  useEffect(() => {
    AttendanceService.registerScheduleStorageSyncListener();

    const params = new URLSearchParams(window.location.search);
    const portal = params.get('portal') || params.get('role');
    const hash = window.location.hash.toLowerCase();

    const wantsTeacher = portal === 'teacher' || hash.includes('teacher');
    const wantsAdmin = portal === 'admin' || hash.includes('admin');
    if (!wantsTeacher && !wantsAdmin) return;

    setLoginInitialRole(wantsTeacher ? 'teacher' : 'admin');
    setActiveTab(wantsTeacher ? 'attendance' : 'dashboard');

    if (!AttendanceService.getCurrentUser()) {
      setIsLoginModalOpen(true);
    }
  }, []);

  useEffect(() => {
    const handleScheduleChange = () => {
      setSettings(AttendanceService.getSettings());
      setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener(SCHEDULE_CHANGE_EVENT, handleScheduleChange);
    return () => window.removeEventListener(SCHEDULE_CHANGE_EVENT, handleScheduleChange);
  }, []);
  const [pdfReportModal, setPdfReportModal] = useState<{
    isOpen: boolean;
    type: 'daily' | 'monthly';
    date?: string;
  }>({
    isOpen: false,
    type: 'daily',
    date: getTodayDateString()
  });
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [referralStudentId, setReferralStudentId] = useState<string | null>(null);

  const handleOpenReferralModal = (studentId?: string) => {
    setReferralStudentId(studentId || null);
    setIsReferralModalOpen(true);
  };

  // 30-Minute Inactivity Session Timeout to protect student data
  useSessionTimeout({
    timeoutMinutes: 30,
    isEnabled: !!currentUser,
    onTimeout: () => {
      handleLogout(true);
    }
  });

  // Sync tab when user role changes
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        if (activeTab === 'attendance' || activeTab === 'class-history') {
          setActiveTab('dashboard');
        }
      } else {
        if (activeTab === 'dashboard' || activeTab === 'students' || activeTab === 'ai-advisor') {
          setActiveTab('attendance');
        }
      }
    }
  }, [currentUser]);

  // Quick switch user
  const handleQuickSwitchUser = (username: string) => {
    const users = AttendanceService.getUsers();
    const user = users.find(u => u.username === username);
    if (user) {
      AttendanceService.setCurrentUser(user);
      setCurrentUser(user);
      AttendanceService.updateLastActivity();
      if (user.role === 'admin') {
        setActiveTab('dashboard');
      } else {
        setActiveTab('attendance');
      }
    }
  };

  const handleLogout = (isExpired = false) => {
    const wasTeacher = currentUser?.role === 'teacher';
    AttendanceService.setCurrentUser(null);
    setCurrentUser(null);
    if (isExpired) {
      setSessionExpiredNotice(true);
    }
    setLoginInitialRole(wasTeacher ? 'teacher' : 'admin');
    setIsLoginModalOpen(true);
  };


  const handleUpdateSettings = (newSettings: SchoolSettings) => {
    setSettings(newSettings);
    if (currentUser) {
      AttendanceService.saveSettings(newSettings, currentUser);
    }
  };

  const handleViewStudentProfile = (studentId: string) => {
    setSelectedStudentForModal(studentId);
    setActiveTab('students');
  };

  const handleOpenClassSheetFromAdmin = (classId: string) => {
    // Switch view or open attendance
    setActiveTab('attendance');
  };

  const handleSwitchToTeacher = (teacher: User) => {
    AttendanceService.setCurrentUser(teacher);
    setCurrentUser(teacher);
    setActiveTab('attendance');
  };

  const stats = AttendanceService.getTodaySchoolStats();

  useEffect(() => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
    }
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-900">
      {/* Real-time Toast Notifications for Admin */}
      <ToastNotificationContainer
        isAdmin={currentUser?.role === 'admin'}
        onOpenClassSheet={(classId) => {
          handleOpenClassSheetFromAdmin(classId);
        }}
        onViewStudentProfile={handleViewStudentProfile}
      />

      {/* Time simulator — admin only (hidden from teachers) */}
      {currentUser?.role === 'admin' && (
        <TimeSimulatorBar
          settings={settings}
          simulatedTime={simulatedTime}
          onSetSimulatedTime={setSimulatedTime}
          onUpdateSettings={handleUpdateSettings}
        />
      )}

      {/* Main Navbar */}
      <Navbar
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onQuickSwitchUser={handleQuickSwitchUser}
        settings={settings}
        simulatedTime={simulatedTime}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        pendingClassesCount={stats.pendingCount}
        onOpenClassSheet={handleOpenClassSheetFromAdmin}
        onOpenArchivingModal={() => setIsArchivingModalOpen(true)}
        onOpenTeacherAndClassManager={() => setIsTeacherAndClassModalOpen(true)}
        onOpenTeacherReminderModal={() => setIsTeacherReminderModalOpen(true)}
        onOpenGoogleSheetsModal={() => setIsGoogleSheetsModalOpen(true)}
        onOpenStudentImportModal={() => setIsStudentImportModalOpen(true)}
        onOpenContactsModal={() => setIsContactsModalOpen(true)}
        onOpenPortalLinksModal={() => setIsPortalLinksModalOpen(true)}
      />


      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {currentUser ? (
          <>
            {/* Admin Dashboard */}
            {activeTab === 'dashboard' && currentUser.role === 'admin' && (
              <AdminDashboard
                currentUser={currentUser}
                settings={settings}
                simulatedTime={simulatedTime}
                onOpenPrintReport={() => setPdfReportModal({ isOpen: true, type: 'daily', date: getTodayDateString() })}
                onOpenPdfReport={(type, date) => setPdfReportModal({ isOpen: true, type, date })}
                onOpenClassSheet={handleOpenClassSheetFromAdmin}
                onViewStudentProfile={handleViewStudentProfile}
                onNavigateToTab={(tab) => setActiveTab(tab)}
                onOpenArchivingModal={() => setIsArchivingModalOpen(true)}
                onOpenTeacherAndClassManager={() => setIsTeacherAndClassModalOpen(true)}
                onSwitchToTeacher={handleSwitchToTeacher}
                onOpenGoogleSheetsModal={() => setIsGoogleSheetsModalOpen(true)}
                onOpenStudentImportModal={() => setIsStudentImportModalOpen(true)}
                onOpenContactsModal={() => setIsContactsModalOpen(true)}
                onOpenPortalLinksModal={() => setIsPortalLinksModalOpen(true)}
              />
            )}

            {/* Teacher Attendance Sheet (Also accessible by Admin) */}
            {activeTab === 'attendance' && (
              <TeacherAttendanceSheet
                currentUser={currentUser}
                settings={settings}
                simulatedTime={simulatedTime}
                onAttendanceSubmitted={() => setRefreshTrigger(prev => prev + 1)}
                onViewStudentProfile={handleViewStudentProfile}
                onOpenReferralModal={handleOpenReferralModal}
              />
            )}

            {/* Student Directory */}
            {activeTab === 'students' && (
              <StudentDirectory
                currentUser={currentUser}
                settings={settings}
                onOpenStudentModal={selectedStudentForModal}
                onCloseStudentModal={() => setSelectedStudentForModal(null)}
                onOpenReferralModal={handleOpenReferralModal}
              />
            )}

            {/* Excuses Management */}
            {activeTab === 'excuses' && (
              <ExcuseManager
                currentUser={currentUser}
                settings={settings}
              />
            )}

            {/* Student Referral Forms to Counselor (استمارات التحويل للمرشد الطلابي) */}
            {activeTab === 'referrals' && (
              <StudentReferralsManager
                currentUser={currentUser}
                settings={settings}
              />
            )}

            {/* Contacts Directory and Communication Hub */}
            {activeTab === 'contacts' && (
              <ContactsManager
                currentUser={currentUser}
                settings={settings}
                onOpenStudentProfile={handleViewStudentProfile}
              />
            )}

            {/* AI Advisor Hub */}
            {activeTab === 'ai-advisor' && (
              <AIAdvisoryHub
                currentUser={currentUser}
                settings={settings}
              />
            )}

            {/* Class History Viewer */}
            {activeTab === 'class-history' && (
              <ClassHistoryViewer
                currentUser={currentUser}
              />
            )}
          </>
        ) : (
          /* Guest Screen */
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm p-8 max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <GraduationCap className="w-9 h-9" />
            </div>
            <h2 className="text-xl font-black font-brand text-slate-900">
              مرحباً بكم في نظام متابعة غياب الطلاب
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              يرجى تسجيل الدخول بحساب المعلم أو مدير مدرسة زيد بن ثابت لرصد كشف غياب الحصة الثانية ومتابعة الإحصائيات.
            </p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-700/20 transition"
            >
              تسجيل الدخول الآن
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-8 px-6 text-center text-xs text-slate-500 space-y-2 no-print">
        <div className="flex flex-wrap items-center justify-center gap-4 font-bold text-slate-700">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span>نظام متابعة غياب الطلاب — مدرسة زيد بن ثابت الابتدائية</span>
          </div>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <button
            type="button"
            onClick={() => setIsPortalLinksModalOpen(true)}
            className="text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>🔗 روابط الدخول المباشرة (المعلم / الإدارة)</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          منظومة الإدارة المدرسية الرقمية © {new Date().getFullYear()} — رصد الحصة الثانية ولائحة المواظبة المعتمدة
        </p>
      </footer>

      {/* Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        initialRole={loginInitialRole}
        sessionExpiredNotice={sessionExpiredNotice}
        onClose={() => {
          setIsLoginModalOpen(false);
          setSessionExpiredNotice(false);
        }}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsLoginModalOpen(false);
          setSessionExpiredNotice(false);
          if (user.role === 'admin') setActiveTab('dashboard');
          else setActiveTab('attendance');
        }}
      />


      <SchoolSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser || AttendanceService.getUsers()[0]}
        settings={settings}
        onSaveSettings={handleUpdateSettings}
      />

      {/* Official PDF & Printable Reports Export Modal */}
      {pdfReportModal.isOpen && (
        <PdfReportsExportModal
          isOpen={pdfReportModal.isOpen}
          onClose={() => setPdfReportModal(prev => ({ ...prev, isOpen: false }))}
          settings={settings}
          initialReportType={pdfReportModal.type}
          initialDate={pdfReportModal.date || getTodayDateString()}
        />
      )}

      {/* Teachers & Classes Management Modal */}
      {isTeacherAndClassModalOpen && currentUser && (
        <TeacherAndClassManagerModal
          isOpen={isTeacherAndClassModalOpen}
          onClose={() => setIsTeacherAndClassModalOpen(false)}
          currentUser={currentUser}
          settings={settings}
          onDataChanged={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}

      {/* Database Data Archiving & Restore Modal */}
      {isArchivingModalOpen && currentUser && (
        <DataArchivingModal
          isOpen={isArchivingModalOpen}
          onClose={() => setIsArchivingModalOpen(false)}
          currentUser={currentUser}
          onDataChanged={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}

      {/* Teacher Reminder & Broadcast Modal */}
      {isTeacherReminderModalOpen && currentUser && (
        <TeacherReminderModal
          isOpen={isTeacherReminderModalOpen}
          onClose={() => setIsTeacherReminderModalOpen(false)}
          currentUser={currentUser}
          settings={settings}
          simulatedTime={simulatedTime}
          onOpenClassSheet={handleOpenClassSheetFromAdmin}
        />
      )}

      {/* Google Sheets Live Export and Sync Modal */}
      {isGoogleSheetsModalOpen && (
        <GoogleSheetsExportModal
          isOpen={isGoogleSheetsModalOpen}
          onClose={() => setIsGoogleSheetsModalOpen(false)}
          settings={settings}
        />
      )}

      {/* Student Import and Automatic Distribution Modal */}
      {isStudentImportModalOpen && currentUser && (
        <StudentImportModal
          isOpen={isStudentImportModalOpen}
          onClose={() => setIsStudentImportModalOpen(false)}
          currentUser={currentUser}
          onSuccess={() => {
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}

      {/* Contacts Manager Modal */}
      {isContactsModalOpen && currentUser && (
        <ContactsManagerModal
          isOpen={isContactsModalOpen}
          onClose={() => setIsContactsModalOpen(false)}
          currentUser={currentUser}
          settings={settings}
          onOpenStudentProfile={handleViewStudentProfile}
        />
      )}

      {/* Portal Access Links Modal */}
      {isPortalLinksModalOpen && (
        <PortalLinksModal
          isOpen={isPortalLinksModalOpen}
          settings={settings}
          onClose={() => setIsPortalLinksModalOpen(false)}
        />
      )}

      {/* Direct Student Referral Modal Triggered From Tables / Sheets */}
      {isReferralModalOpen && (
        <StudentReferralModal
          isOpen={isReferralModalOpen}
          onClose={() => {
            setIsReferralModalOpen(false);
            setReferralStudentId(null);
          }}
          preselectedStudentId={referralStudentId}
          currentUser={currentUser}
          onSaved={() => {
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}

      {isPrintReportOpen && (
        <PrintableDailyReport
          settings={settings}
          onClose={() => setIsPrintReportOpen(false)}
        />
      )}
    </div>
  );
};

export default App;

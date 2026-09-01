import React, { useState, useEffect } from 'react';
import { User, SchoolSettings } from './types';
import { AttendanceService } from './services/attendanceService';
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
import { ContactsManagerModal } from './components/ContactsManagerModal';
import { PortalLinksModal } from './components/PortalLinksModal';
import { StudentReferralModal } from './components/StudentReferralModal';
import { TeacherShell } from './components/layouts/TeacherShell';
import { AdminShell } from './components/layouts/AdminShell';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { GraduationCap } from 'lucide-react';
import { getTodayDateString } from './services/initialData';

const TEACHER_TABS = new Set(['attendance', 'referrals']);
const ADMIN_TABS = new Set(['dashboard', 'attendance', 'students', 'excuses', 'referrals', 'contacts', 'ai-advisor']);

const getPortalRole = (): 'teacher' | 'admin' | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const portal = params.get('portal') || params.get('role');
  const hash = window.location.hash.toLowerCase();
  if (portal === 'teacher' || hash.includes('teacher')) return 'teacher';
  if (portal === 'admin' || hash.includes('admin')) return 'admin';
  return null;
};

export const App: React.FC = () => {
  AttendanceService.initStorage();

  const [currentUser, setCurrentUser] = useState<User | null>(() => AttendanceService.getCurrentUser());
  const [settings, setSettings] = useState<SchoolSettings>(() => AttendanceService.getSettings());
  const [simulatedTime, setSimulatedTime] = useState<string | null>('08:15');
  const [loginInitialRole, setLoginInitialRole] = useState<'teacher' | 'admin' | null>(() => getPortalRole());
  const [activeTab, setActiveTab] = useState<string>(() => {
    const portal = getPortalRole();
    return portal === 'teacher' ? 'attendance' : 'dashboard';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(() => !AttendanceService.getCurrentUser());
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
  const [adminViewClassId, setAdminViewClassId] = useState<string | null>(null);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [referralStudentId, setReferralStudentId] = useState<string | null>(null);
  const [pdfReportModal, setPdfReportModal] = useState<{
    isOpen: boolean;
    type: 'daily' | 'monthly';
    date?: string;
  }>({
    isOpen: false,
    type: 'daily',
    date: getTodayDateString()
  });

  useEffect(() => {
    const portal = getPortalRole();
    if (portal) {
      setLoginInitialRole(portal);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const allowed = currentUser.role === 'admin' ? ADMIN_TABS : TEACHER_TABS;
    if (!allowed.has(activeTab)) {
      setActiveTab(currentUser.role === 'admin' ? 'dashboard' : 'attendance');
    }
  }, [currentUser, activeTab]);

  useSessionTimeout({
    timeoutMinutes: 30,
    isEnabled: !!currentUser,
    onTimeout: () => {
      handleLogout(true);
    }
  });

  const handleOpenReferralModal = (studentId?: string) => {
    setReferralStudentId(studentId || null);
    setIsReferralModalOpen(true);
  };

  const handleQuickSwitchUser = (username: string) => {
    const user = AttendanceService.getUsers().find(u => u.username === username);
    if (user) {
      AttendanceService.setCurrentUser(user);
      setCurrentUser(user);
      AttendanceService.updateLastActivity();
      setActiveTab(user.role === 'admin' ? 'dashboard' : 'attendance');
    }
  };

  const handleLogout = (isExpired = false) => {
    const wasTeacher = currentUser?.role === 'teacher';
    AttendanceService.setCurrentUser(null);
    setCurrentUser(null);
    setAdminViewClassId(null);
    if (isExpired) {
      setSessionExpiredNotice(true);
    }
    setLoginInitialRole(wasTeacher ? 'teacher' : 'admin');
    setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setSessionExpiredNotice(false);
    setIsLoginModalOpen(false);
    setActiveTab(user.role === 'admin' ? 'dashboard' : 'attendance');
  };

  const handleOpenClassSheetFromAdmin = (classId: string) => {
    setAdminViewClassId(classId);
    setActiveTab('attendance');
  };

  const handleSwitchToTeacher = (teacher: User) => {
    AttendanceService.setCurrentUser(teacher);
    setCurrentUser(teacher);
    setActiveTab('attendance');
  };

  const handleViewStudentProfile = (studentId: string) => {
    setSelectedStudentForModal(studentId);
    if (currentUser?.role === 'admin') {
      setActiveTab('students');
    }
  };

  const stats = AttendanceService.getTodaySchoolStats();

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-900">
      <ToastNotificationContainer
        isAdmin={currentUser?.role === 'admin'}
        onOpenClassSheet={handleOpenClassSheetFromAdmin}
        onViewStudentProfile={handleViewStudentProfile}
      />

      {currentUser?.role === 'teacher' ? (
        <TeacherShell
          currentUser={currentUser}
          settings={settings}
          simulatedTime={null}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={() => handleLogout(false)}
          onAttendanceSubmitted={() => setRefreshTrigger(prev => prev + 1)}
          onOpenReferralModal={handleOpenReferralModal}
        />
      ) : currentUser?.role === 'admin' ? (
        <AdminShell
          currentUser={currentUser}
          settings={settings}
          simulatedTime={simulatedTime}
          onSetSimulatedTime={setSimulatedTime}
          onUpdateSettings={(newSettings) => {
            setSettings(newSettings);
            AttendanceService.saveSettings(newSettings, currentUser);
          }}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={() => handleLogout(false)}
          onQuickSwitchUser={handleQuickSwitchUser}
          pendingClassesCount={stats.pendingCount}
          onAttendanceSubmitted={() => setRefreshTrigger(prev => prev + 1)}
          onViewStudentProfile={handleViewStudentProfile}
          onOpenReferralModal={handleOpenReferralModal}
          selectedStudentForModal={selectedStudentForModal}
          onCloseStudentModal={() => setSelectedStudentForModal(null)}
          adminViewClassId={adminViewClassId}
          onOpenClassSheet={handleOpenClassSheetFromAdmin}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          onOpenArchivingModal={() => setIsArchivingModalOpen(true)}
          onOpenTeacherAndClassManager={() => setIsTeacherAndClassModalOpen(true)}
          onOpenTeacherReminderModal={() => setIsTeacherReminderModalOpen(true)}
          onOpenGoogleSheetsModal={() => setIsGoogleSheetsModalOpen(true)}
          onOpenStudentImportModal={() => setIsStudentImportModalOpen(true)}
          onOpenContactsModal={() => setIsContactsModalOpen(true)}
          onOpenPortalLinksModal={() => setIsPortalLinksModalOpen(true)}
          onOpenPrintReport={() => setPdfReportModal({ isOpen: true, type: 'daily', date: getTodayDateString() })}
          onOpenPdfReport={(type, date) => setPdfReportModal({ isOpen: true, type, date })}
          onSwitchToTeacher={handleSwitchToTeacher}
        />
      ) : (
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm p-8 max-w-lg w-full space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <GraduationCap className="w-9 h-9" />
            </div>
            <h2 className="text-xl font-black font-brand text-slate-900">
              نظام متابعة غياب الطلاب
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              مدرسة زيد بن ثابت الابتدائية — يرجى تسجيل الدخول للمتابعة
            </p>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="min-h-[44px] px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-700/20 transition touch-manipulation"
            >
              تسجيل الدخول
            </button>
          </div>
        </main>
      )}

      <LoginModal
        isOpen={isLoginModalOpen || !currentUser}
        initialRole={loginInitialRole}
        sessionExpiredNotice={sessionExpiredNotice}
        requireAuth={!currentUser}
        onClose={() => {
          if (currentUser) {
            setIsLoginModalOpen(false);
            setSessionExpiredNotice(false);
          }
        }}
        onLoginSuccess={handleLoginSuccess}
      />

      <SchoolSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser || AttendanceService.getUsers()[0]}
        settings={settings}
        onSaveSettings={(s) => setSettings(s)}
      />

      {pdfReportModal.isOpen && (
        <PdfReportsExportModal
          isOpen={pdfReportModal.isOpen}
          onClose={() => setPdfReportModal(prev => ({ ...prev, isOpen: false }))}
          settings={settings}
          initialReportType={pdfReportModal.type}
          initialDate={pdfReportModal.date || getTodayDateString()}
        />
      )}

      {isTeacherAndClassModalOpen && currentUser && (
        <TeacherAndClassManagerModal
          isOpen={isTeacherAndClassModalOpen}
          onClose={() => setIsTeacherAndClassModalOpen(false)}
          currentUser={currentUser}
          settings={settings}
          onDataChanged={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}

      {isArchivingModalOpen && currentUser && (
        <DataArchivingModal
          isOpen={isArchivingModalOpen}
          onClose={() => setIsArchivingModalOpen(false)}
          currentUser={currentUser}
          onDataChanged={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}

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

      {isGoogleSheetsModalOpen && (
        <GoogleSheetsExportModal
          isOpen={isGoogleSheetsModalOpen}
          onClose={() => setIsGoogleSheetsModalOpen(false)}
          settings={settings}
        />
      )}

      {isStudentImportModalOpen && currentUser && (
        <StudentImportModal
          isOpen={isStudentImportModalOpen}
          onClose={() => setIsStudentImportModalOpen(false)}
          currentUser={currentUser}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}

      {isContactsModalOpen && currentUser && (
        <ContactsManagerModal
          isOpen={isContactsModalOpen}
          onClose={() => setIsContactsModalOpen(false)}
          currentUser={currentUser}
          settings={settings}
          onOpenStudentProfile={handleViewStudentProfile}
        />
      )}

      {isPortalLinksModalOpen && (
        <PortalLinksModal
          isOpen={isPortalLinksModalOpen}
          settings={settings}
          onClose={() => setIsPortalLinksModalOpen(false)}
        />
      )}

      {isReferralModalOpen && (
        <StudentReferralModal
          isOpen={isReferralModalOpen}
          onClose={() => {
            setIsReferralModalOpen(false);
            setReferralStudentId(null);
          }}
          preselectedStudentId={referralStudentId}
          currentUser={currentUser}
          onSaved={() => setRefreshTrigger(prev => prev + 1)}
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

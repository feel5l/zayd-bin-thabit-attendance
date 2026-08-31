import React, { useState, useEffect } from 'react';
import { User, SchoolSettings } from './types';
import { AttendanceService } from './services/attendanceService';
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
import { GraduationCap, ShieldAlert, Sparkles, BookOpen, Clock, Heart } from 'lucide-react';
import { getTodayDateString } from './services/mockData';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    AttendanceService.initStorage();
    const existing = AttendanceService.getCurrentUser();
    if (existing) return existing;
    // Default initial user for instant interaction: Admin or Teacher1
    const users = AttendanceService.getUsers();
    return users.find(u => u.username === 'admin') || users[0];
  });

  const [settings, setSettings] = useState<SchoolSettings>(() => AttendanceService.getSettings());
  const [simulatedTime, setSimulatedTime] = useState<string | null>('08:15'); // Start inside period 2 by default for great UX
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);
  const [isArchivingModalOpen, setIsArchivingModalOpen] = useState(false);
  const [isTeacherAndClassModalOpen, setIsTeacherAndClassModalOpen] = useState(false);
  const [isTeacherReminderModalOpen, setIsTeacherReminderModalOpen] = useState(false);
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
      if (user.role === 'admin') {
        setActiveTab('dashboard');
      } else {
        setActiveTab('attendance');
      }
    }
  };

  const handleLogout = () => {
    AttendanceService.setCurrentUser(null);
    setCurrentUser(null);
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

      {/* Top Time Simulator Toolbar */}
      <TimeSimulatorBar
        settings={settings}
        simulatedTime={simulatedTime}
        onSetSimulatedTime={setSimulatedTime}
        onUpdateSettings={handleUpdateSettings}
      />

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
              />
            )}

            {/* Student Directory */}
            {activeTab === 'students' && (
              <StudentDirectory
                currentUser={currentUser}
                settings={settings}
                onOpenStudentModal={selectedStudentForModal}
                onCloseStudentModal={() => setSelectedStudentForModal(null)}
              />
            )}

            {/* Excuses Management */}
            {activeTab === 'excuses' && (
              <ExcuseManager
                currentUser={currentUser}
                settings={settings}
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
        <div className="flex items-center justify-center gap-2 font-bold text-slate-700">
          <GraduationCap className="w-4 h-4 text-emerald-600" />
          <span>نظام متابعة غياب الطلاب — مدرسة زيد بن ثابت الابتدائية</span>
        </div>
        <p className="text-[11px] text-slate-400">
          منظومة الإدارة المدرسية الرقمية © {new Date().getFullYear()} — رصد الحصة الثانية ولائحة المواظبة المعتمدة
        </p>
      </footer>

      {/* Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (user.role === 'admin') setActiveTab('dashboard');
          else setActiveTab('attendance');
        }}
      />

      <SchoolSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser || AttendanceService.getUsers()[0]}
        settings={settings}
        onSaveSettings={(s) => setSettings(s)}
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

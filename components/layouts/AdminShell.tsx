import React from 'react';
import { User, SchoolSettings } from '../../types';
import { Navbar } from '../Navbar';
import { TimeSimulatorBar } from '../TimeSimulatorBar';
import { AdminDashboard } from '../AdminDashboard';
import { TeacherAttendanceSheet } from '../TeacherAttendanceSheet';
import { StudentDirectory } from '../StudentDirectory';
import { ExcuseManager } from '../ExcuseManager';
import { AIAdvisoryHub } from '../AIAdvisoryHub';
import { StudentReferralsManager } from '../StudentReferralsManager';
import { ContactsManager } from '../ContactsManager';

const ADMIN_TABS = ['dashboard', 'attendance', 'students', 'excuses', 'referrals', 'contacts', 'ai-advisor'] as const;

interface AdminShellProps {
  currentUser: User;
  settings: SchoolSettings;
  simulatedTime: string | null;
  onSetSimulatedTime: (time: string | null) => void;
  onUpdateSettings: (settings: SchoolSettings) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onQuickSwitchUser: (username: string) => void;
  pendingClassesCount: number;
  onAttendanceSubmitted: () => void;
  onViewStudentProfile: (studentId: string) => void;
  onOpenReferralModal: (studentId?: string) => void;
  selectedStudentForModal: string | null;
  onCloseStudentModal: () => void;
  adminViewClassId: string | null;
  onOpenClassSheet: (classId: string) => void;
  onOpenSettings: () => void;
  onOpenArchivingModal: () => void;
  onOpenTeacherAndClassManager: () => void;
  onOpenTeacherReminderModal: () => void;
  onOpenGoogleSheetsModal: () => void;
  onOpenStudentImportModal: () => void;
  onOpenContactsModal: () => void;
  onOpenPortalLinksModal: () => void;
  onOpenPrintReport: () => void;
  onOpenPdfReport: (type: 'daily' | 'monthly', date?: string) => void;
  onSwitchToTeacher: (teacher: User) => void;
}

export const AdminShell: React.FC<AdminShellProps> = ({
  currentUser,
  settings,
  simulatedTime,
  onSetSimulatedTime,
  onUpdateSettings,
  activeTab,
  setActiveTab,
  onLogout,
  onQuickSwitchUser,
  pendingClassesCount,
  onAttendanceSubmitted,
  onViewStudentProfile,
  onOpenReferralModal,
  selectedStudentForModal,
  onCloseStudentModal,
  adminViewClassId,
  onOpenClassSheet,
  onOpenSettings,
  onOpenArchivingModal,
  onOpenTeacherAndClassManager,
  onOpenTeacherReminderModal,
  onOpenGoogleSheetsModal,
  onOpenStudentImportModal,
  onOpenContactsModal,
  onOpenPortalLinksModal,
  onOpenPrintReport,
  onOpenPdfReport,
  onSwitchToTeacher
}) => {
  const safeTab = ADMIN_TABS.includes(activeTab as typeof ADMIN_TABS[number]) ? activeTab : 'dashboard';

  return (
    <>
      <TimeSimulatorBar
        settings={settings}
        simulatedTime={simulatedTime}
        onSetSimulatedTime={onSetSimulatedTime}
        onUpdateSettings={onUpdateSettings}
      />

      <Navbar
        currentUser={currentUser}
        activeTab={safeTab}
        setActiveTab={setActiveTab}
        onOpenLoginModal={() => {}}
        onLogout={onLogout}
        onQuickSwitchUser={onQuickSwitchUser}
        settings={settings}
        simulatedTime={simulatedTime}
        onOpenSettings={onOpenSettings}
        pendingClassesCount={pendingClassesCount}
        onOpenClassSheet={onOpenClassSheet}
        onOpenArchivingModal={onOpenArchivingModal}
        onOpenTeacherAndClassManager={onOpenTeacherAndClassManager}
        onOpenTeacherReminderModal={onOpenTeacherReminderModal}
        onOpenGoogleSheetsModal={onOpenGoogleSheetsModal}
        onOpenStudentImportModal={onOpenStudentImportModal}
        onOpenContactsModal={onOpenContactsModal}
        onOpenPortalLinksModal={onOpenPortalLinksModal}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {safeTab === 'dashboard' && (
          <AdminDashboard
            currentUser={currentUser}
            settings={settings}
            simulatedTime={simulatedTime}
            onOpenPrintReport={onOpenPrintReport}
            onOpenPdfReport={onOpenPdfReport}
            onOpenClassSheet={onOpenClassSheet}
            onViewStudentProfile={onViewStudentProfile}
            onNavigateToTab={setActiveTab}
            onOpenArchivingModal={onOpenArchivingModal}
            onOpenTeacherAndClassManager={onOpenTeacherAndClassManager}
            onSwitchToTeacher={onSwitchToTeacher}
            onOpenGoogleSheetsModal={onOpenGoogleSheetsModal}
            onOpenStudentImportModal={onOpenStudentImportModal}
            onOpenContactsModal={onOpenContactsModal}
            onOpenPortalLinksModal={onOpenPortalLinksModal}
          />
        )}

        {safeTab === 'attendance' && (
          <TeacherAttendanceSheet
            currentUser={currentUser}
            settings={settings}
            simulatedTime={simulatedTime}
            onAttendanceSubmitted={onAttendanceSubmitted}
            onViewStudentProfile={onViewStudentProfile}
            onOpenReferralModal={onOpenReferralModal}
            initialClassId={adminViewClassId || undefined}
          />
        )}

        {safeTab === 'students' && (
          <StudentDirectory
            currentUser={currentUser}
            settings={settings}
            onOpenStudentModal={selectedStudentForModal}
            onCloseStudentModal={onCloseStudentModal}
            onOpenReferralModal={onOpenReferralModal}
          />
        )}

        {safeTab === 'excuses' && (
          <ExcuseManager currentUser={currentUser} settings={settings} />
        )}

        {safeTab === 'referrals' && (
          <StudentReferralsManager currentUser={currentUser} settings={settings} />
        )}

        {safeTab === 'contacts' && (
          <ContactsManager
            currentUser={currentUser}
            settings={settings}
            onOpenStudentProfile={onViewStudentProfile}
          />
        )}

        {safeTab === 'ai-advisor' && (
          <AIAdvisoryHub currentUser={currentUser} settings={settings} />
        )}
      </main>
    </>
  );
};

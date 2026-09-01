import React from 'react';
import { User, SchoolSettings } from '../../types';
import { AttendanceService } from '../../services/attendanceService';
import { TeacherAttendanceSheet } from '../TeacherAttendanceSheet';
import { StudentReferralsManager } from '../StudentReferralsManager';
import { GraduationCap, ClipboardList, FileText, LogOut, Clock } from 'lucide-react';

interface TeacherShellProps {
  currentUser: User;
  settings: SchoolSettings;
  simulatedTime: string | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onAttendanceSubmitted: () => void;
  onOpenReferralModal: (studentId?: string) => void;
}

const TEACHER_TABS = ['attendance', 'referrals'] as const;

export const TeacherShell: React.FC<TeacherShellProps> = ({
  currentUser,
  settings,
  simulatedTime,
  activeTab,
  setActiveTab,
  onLogout,
  onAttendanceSubmitted,
  onOpenReferralModal
}) => {
  const dayInfo = AttendanceService.getCurrentDayKey();
  const assignedClass = AttendanceService.getTeacherAssignedClassForDay(currentUser.id, dayInfo.key);
  const safeTab = TEACHER_TABS.includes(activeTab as typeof TEACHER_TABS[number]) ? activeTab : 'attendance';

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col">
      <header className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black truncate">رصد الحصة الثانية</h1>
              <p className="text-[11px] text-emerald-200/90 font-medium truncate">
                {currentUser.name}
                {assignedClass ? ` — ${assignedClass.name}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-bold bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl">
            <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>{settings.period2StartTime} – {settings.period2EndTime}</span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold flex items-center gap-1.5 transition touch-manipulation"
            aria-label="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>

        <nav className="max-w-4xl mx-auto px-4 pb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`min-h-[44px] flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition touch-manipulation ${
              safeTab === 'attendance'
                ? 'bg-white text-emerald-900 shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/15'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            الرصد
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('referrals')}
            className={`min-h-[44px] flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition touch-manipulation ${
              safeTab === 'referrals'
                ? 'bg-white text-emerald-900 shadow-md'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/15'
            }`}
          >
            <FileText className="w-4 h-4" />
            السلوك والإحالات
          </button>
        </nav>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-5 sm:py-6">
        {safeTab === 'attendance' && (
          <TeacherAttendanceSheet
            currentUser={currentUser}
            settings={settings}
            simulatedTime={simulatedTime}
            onAttendanceSubmitted={onAttendanceSubmitted}
            onOpenReferralModal={onOpenReferralModal}
          />
        )}
        {safeTab === 'referrals' && (
          <StudentReferralsManager
            currentUser={currentUser}
            settings={settings}
            classIdFilter={assignedClass?.id}
          />
        )}
      </main>
    </div>
  );
};

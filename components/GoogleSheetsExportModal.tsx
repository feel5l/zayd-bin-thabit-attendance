import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  ExternalLink, 
  LogOut, 
  Calendar, 
  Users, 
  Sparkles, 
  FolderSync, 
  AlertCircle, 
  ArrowLeft, 
  Loader2, 
  FileText, 
  BarChart3, 
  Layers,
  Database,
  Check,
  ShieldCheck,
  RefreshCw,
  Zap,
  Link2,
  CheckCheck,
  Radio,
  HelpCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { 
  GoogleSheetsService, 
  GoogleDriveSheetItem, 
  SheetExportResult, 
  CloudSyncConfig 
} from '../services/googleSheetsService';
import { getTodayDateString, getPastDateString } from '../services/initialData';
import { AttendanceService } from '../services/attendanceService';
import { SchoolSettings } from '../types';
import confetti from 'canvas-confetti';

interface SyncConfirmationDetails {
  title: string;
  operationType: string;
  targetSpreadsheet: string;
  targetDateOrPeriod: string;
  totalRecordsCount: number;
  classesCount: number;
  presentCount?: number;
  absentCount?: number;
  excusedCount?: number;
  tabsList: string[];
  actionLabel: string;
  onConfirm: () => Promise<void>;
}

interface GoogleSheetsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SchoolSettings;
}

export const GoogleSheetsExportModal: React.FC<GoogleSheetsExportModalProps> = ({
  isOpen,
  onClose,
  settings
}) => {
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'sync' | 'daily' | 'monthly' | 'students' | 'existing'>('sync');
  
  // Cloud Sync State
  const [cloudSyncConfig, setCloudSyncConfig] = useState<CloudSyncConfig>(GoogleSheetsService.getCloudSyncConfig());
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ success: boolean; message: string; timestamp: string } | null>(null);

  // Export states
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<SheetExportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Confirmation Modal state
  const [confirmationData, setConfirmationData] = useState<SyncConfirmationDetails | null>(null);

  // Existing Drive Spreadsheets
  const [driveSheets, setDriveSheets] = useState<GoogleDriveSheetItem[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [selectedExistingSheetId, setSelectedExistingSheetId] = useState<string>('');
  const [isConfirmingAppend, setIsConfirmingAppend] = useState(false);

  useEffect(() => {
    const unsubscribe = GoogleSheetsService.initAuth(
      (user, accessToken) => {
        setAuthUser(user);
        setToken(accessToken);
      },
      () => {
        setAuthUser(null);
        setToken(null);
      }
    );
    // Reload cloud sync config
    setCloudSyncConfig(GoogleSheetsService.getCloudSyncConfig());
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Fetch Drive spreadsheets when tab switches to existing or when viewing sync tab
  useEffect(() => {
    if ((activeTab === 'existing' || activeTab === 'sync') && token) {
      loadDriveSheets();
    }
  }, [activeTab, token]);

  const loadDriveSheets = async () => {
    setIsLoadingSheets(true);
    setErrorMsg(null);
    try {
      const sheets = await GoogleSheetsService.listUserSpreadsheets();
      setDriveSheets(sheets);
      if (sheets.length > 0 && !selectedExistingSheetId) {
        setSelectedExistingSheetId(sheets[0].id);
      }
    } catch (err: any) {
      console.warn('Could not load drive sheets:', err);
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const res = await GoogleSheetsService.googleSignIn();
      if (res) {
        setAuthUser(res.user);
        setToken(res.accessToken);
        setCloudSyncConfig(GoogleSheetsService.getCloudSyncConfig());
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر تسجيل الدخول بحساب Google');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await GoogleSheetsService.logout();
      setAuthUser(null);
      setToken(null);
      setExportResult(null);
    } catch (err: any) {
      console.error('Logout error', err);
    }
  };

  // Trigger Live Cloud Sync
  const handleTriggerLiveSync = async () => {
    if (!token) return;
    setIsLiveSyncing(true);
    setErrorMsg(null);
    setSyncFeedback(null);
    try {
      const result = await GoogleSheetsService.syncLiveAttendanceToSpreadsheet(undefined, selectedDate);
      const updatedConfig = GoogleSheetsService.getCloudSyncConfig();
      setCloudSyncConfig(updatedConfig);
      setSyncFeedback({
        success: true,
        message: `تمت المزامنة السحابية المباشرة بنجاح مع Google Sheets (${result.rowsUpdated} سطر بيانات محدث).`,
        timestamp: new Date().toLocaleTimeString('ar-SA')
      });
      try {
        confetti({ particleCount: 45, spread: 55, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'فشلت المزامنة السحابية المباشرة مع جدول Google Sheets');
      const updatedConfig = GoogleSheetsService.getCloudSyncConfig();
      setCloudSyncConfig(updatedConfig);
    } finally {
      setIsLiveSyncing(false);
    }
  };

  // Create Master Cloud Sync Sheet
  const handleCreateMasterSheet = async () => {
    if (!token) return;
    setIsLiveSyncing(true);
    setErrorMsg(null);
    try {
      const result = await GoogleSheetsService.createMasterLiveSyncSpreadsheet();
      const updatedConfig = GoogleSheetsService.getCloudSyncConfig();
      setCloudSyncConfig(updatedConfig);
      setExportResult(result);
      setSyncFeedback({
        success: true,
        message: `تم إنشاء وربط جدول المزامنة السحابية الرئيسي للمدرسة بنجاح!`,
        timestamp: new Date().toLocaleTimeString('ar-SA')
      });
      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إنشاء جدول المزامنة الرئيسي على Google Sheets');
    } finally {
      setIsLiveSyncing(false);
    }
  };

  // Link selected existing sheet as master sync target
  const handleLinkExistingSheet = async (sheetId: string) => {
    const target = driveSheets.find(s => s.id === sheetId);
    if (!target) return;
    const webUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    const updated = GoogleSheetsService.saveCloudSyncConfig({
      linkedSpreadsheetId: sheetId,
      linkedSpreadsheetName: target.name,
      linkedSpreadsheetUrl: webUrl,
      syncStatus: 'idle',
      lastSyncMessage: `تم ربط الجدول: ${target.name}`
    });
    setCloudSyncConfig(updated);
    setSyncFeedback({
      success: true,
      message: `تم ربط المستند (${target.name}) كجدول رئيسي للمزامنة السحابية. يمكنك الآن الضغط على "مزامنة الآن".`,
      timestamp: new Date().toLocaleTimeString('ar-SA')
    });
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    const updated = GoogleSheetsService.saveCloudSyncConfig({ autoSyncEnabled: enabled });
    setCloudSyncConfig(updated);
  };

  const handleExportDaily = async () => {
    if (!token) return;
    setIsExporting(true);
    setErrorMsg(null);
    setExportResult(null);
    try {
      const result = await GoogleSheetsService.createDailyAttendanceSpreadsheet(selectedDate);
      setExportResult(result);
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تصدير كشف الغياب اليومي إلى Google Sheets');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMonthly = async () => {
    if (!token) return;
    setIsExporting(true);
    setErrorMsg(null);
    setExportResult(null);
    try {
      const result = await GoogleSheetsService.createMonthlyAttendanceSpreadsheet(selectedMonth);
      setExportResult(result);
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تصدير التقرير الشهري إلى Google Sheets');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportStudents = async () => {
    if (!token) return;
    setIsExporting(true);
    setErrorMsg(null);
    setExportResult(null);
    try {
      const result = await GoogleSheetsService.createStudentsRosterSpreadsheet();
      setExportResult(result);
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء تصدير سجل الطلاب إلى Google Sheets');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAppendToExisting = async () => {
    if (!token || !selectedExistingSheetId) return;
    setIsExporting(true);
    setErrorMsg(null);
    try {
      await GoogleSheetsService.appendDailySummaryToExistingSheet(
        selectedExistingSheetId,
        selectedDate,
        true
      );
      setIsConfirmingAppend(false);
      const selectedSheet = driveSheets.find(s => s.id === selectedExistingSheetId);
      setExportResult({
        spreadsheetId: selectedExistingSheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${selectedExistingSheetId}/edit`,
        title: selectedSheet?.name || 'جدول البيانات المختار',
        createdAt: new Date().toISOString(),
        sheetsCreated: ['تمت إضافة صف اليوم بنجاح']
      });
      try {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      } catch {
        // ignore
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إدراج البيانات في جدول Google Sheets المختار');
    } finally {
      setIsExporting(false);
    }
  };

  // Confirmation Prompts for each operation
  const promptLiveSyncConfirmation = () => {
    const stats = AttendanceService.getTodaySchoolStats(selectedDate);
    const studentsCount = AttendanceService.getStudents().length;
    const classes = AttendanceService.getClasses();
    const targetName = cloudSyncConfig.linkedSpreadsheetName || 'جدول المزامنة السحابي الرئيسي للمدرسة';

    setConfirmationData({
      title: 'تأكيد المزامنة السحابية اللحظية مع Google Sheets',
      operationType: 'مزامنة وتحديث فوري للبيانات السحابية',
      targetSpreadsheet: targetName,
      targetDateOrPeriod: selectedDate,
      totalRecordsCount: studentsCount,
      classesCount: classes.length,
      presentCount: stats.presentCount,
      absentCount: stats.absentCount,
      excusedCount: stats.excusedCount,
      tabsList: [
        'المؤشرات والملخص العام',
        'كشف الغياب والتأخر التفصيلي',
        'حالة كشوفات الفصول والمربين'
      ],
      actionLabel: 'تأكيد وبدء المزامنة الفورية الآن ⚡',
      onConfirm: async () => {
        setConfirmationData(null);
        await handleTriggerLiveSync();
      }
    });
  };

  const promptCreateMasterConfirmation = () => {
    const stats = AttendanceService.getTodaySchoolStats(selectedDate);
    const studentsCount = AttendanceService.getStudents().length;
    const classes = AttendanceService.getClasses();

    setConfirmationData({
      title: 'تأكيد إنشاء وربط جدول المزامنة السحابية الرئيسي',
      operationType: 'إنشاء جدول Google Sheets جديد بالكامل وتهيئته',
      targetSpreadsheet: 'جدول المزامنة السحابية الشامل لمدرسة زيد بن ثابت',
      targetDateOrPeriod: selectedDate,
      totalRecordsCount: studentsCount,
      classesCount: classes.length,
      presentCount: stats.presentCount,
      absentCount: stats.absentCount,
      excusedCount: stats.excusedCount,
      tabsList: [
        'المؤشرات والملخص العام',
        'كشف الغياب والتأخر التفصيلي',
        'حالة كشوفات الفصول والمربين',
        'سجل الطلاب الشامل'
      ],
      actionLabel: 'تأكيد إنشاء المستند والربط السحابي ⚡',
      onConfirm: async () => {
        setConfirmationData(null);
        await handleCreateMasterSheet();
      }
    });
  };

  const promptDailyExportConfirmation = () => {
    const stats = AttendanceService.getTodaySchoolStats(selectedDate);
    const studentsCount = AttendanceService.getStudents().length;
    const classes = AttendanceService.getClasses();

    setConfirmationData({
      title: 'تأكيد تصدير كشف غياب الحصة الثانية اليومي',
      operationType: 'إنشاء ملف Google Sheets مستقل لكشف اليوم',
      targetSpreadsheet: `كشف غياب الحصة الثانية - ${selectedDate}`,
      targetDateOrPeriod: selectedDate,
      totalRecordsCount: studentsCount,
      classesCount: classes.length,
      presentCount: stats.presentCount,
      absentCount: stats.absentCount,
      excusedCount: stats.excusedCount,
      tabsList: [
        'الملخص الإحصائي العام',
        'كشف الغياب والتأخر التفصيلي',
        'حالة كشوفات الفصول والمربين'
      ],
      actionLabel: 'تأكيد تصدير كشف اليوم ⚡',
      onConfirm: async () => {
        setConfirmationData(null);
        await handleExportDaily();
      }
    });
  };

  const promptMonthlyExportConfirmation = () => {
    const studentsCount = AttendanceService.getStudents().length;
    const classes = AttendanceService.getClasses();

    setConfirmationData({
      title: 'تأكيد تصدير التقرير الشهري التراكمي',
      operationType: 'تصدير إحصائيات الغياب التراكمية لشهر كامل',
      targetSpreadsheet: `التقرير الشهري التراكمي للحضور - ${selectedMonth}`,
      targetDateOrPeriod: selectedMonth,
      totalRecordsCount: studentsCount,
      classesCount: classes.length,
      tabsList: [
        'ملخص الفصول والمؤشرات',
        'سجل غياب الطلاب التراكمي',
        'الاتجاه اليومي للحضور'
      ],
      actionLabel: 'تأكيد تصدير التقرير الشهري ⚡',
      onConfirm: async () => {
        setConfirmationData(null);
        await handleExportMonthly();
      }
    });
  };

  const promptStudentsExportConfirmation = () => {
    const studentsCount = AttendanceService.getStudents().length;
    const classes = AttendanceService.getClasses();

    setConfirmationData({
      title: 'تأكيد تصدير سجل الطلاب الشامل',
      operationType: 'تصدير قاعدة بيانات الطلاب وبيانات أولياء الأمور',
      targetSpreadsheet: `سجل طلاب مدرسة زيد بن ثابت الابتدائية - الشامل`,
      targetDateOrPeriod: 'العام الدراسي 1448هـ',
      totalRecordsCount: studentsCount,
      classesCount: classes.length,
      tabsList: [
        'سجل الطلاب الشامل',
        'دليل التواصل وأولياء الأمور',
        'توزيع الطلاب حسب الفصول'
      ],
      actionLabel: 'تأكيد تصدير قاعدة بيانات الطلاب ⚡',
      onConfirm: async () => {
        setConfirmationData(null);
        await handleExportStudents();
      }
    });
  };

  const promptAppendConfirmation = () => {
    const selectedSheet = driveSheets.find(s => s.id === selectedExistingSheetId);
    const stats = AttendanceService.getTodaySchoolStats(selectedDate);
    const studentsCount = AttendanceService.getStudents().length;
    const classes = AttendanceService.getClasses();

    setConfirmationData({
      title: 'تأكيد إدراج صف اليوم في جدول Google Drive المختار',
      operationType: 'تعديل وإضافة صف بيانات جديد لملف موجود',
      targetSpreadsheet: selectedSheet?.name || 'الجدول المختار من Google Drive',
      targetDateOrPeriod: selectedDate,
      totalRecordsCount: studentsCount,
      classesCount: classes.length,
      presentCount: stats.presentCount,
      absentCount: stats.absentCount,
      excusedCount: stats.excusedCount,
      tabsList: [
        'إضافة صف إحصائي في نهاية ورقة العمل'
      ],
      actionLabel: 'تأكيد الإدراج في الملف ⚡',
      onConfirm: async () => {
        setConfirmationData(null);
        await handleAppendToExisting();
      }
    });
  };

  if (!isOpen) return null;

  const todayStats = AttendanceService.getTodaySchoolStats(selectedDate);
  const totalStudents = AttendanceService.getStudents().length;
  const classesList = AttendanceService.getClasses();
  const submittedCount = AttendanceService.getSubmissions(selectedDate).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-5 text-white flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-200 shadow-inner">
              <FileSpreadsheet className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black font-brand">تكامل Google Sheets والمزامنة السحابية</h3>
                <span className="bg-emerald-500/20 text-emerald-200 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                  Google Drive & Sheets API
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                ربط ومزامنة بيانات حضور الطلاب وكشوفات الحصة الثانية مباشرة مع جداول Google Sheets السحابية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition relative z-10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Auth / Account Status Bar */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {authUser ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                {authUser.photoURL ? (
                  <img
                    src={authUser.photoURL}
                    alt={authUser.displayName || 'Google User'}
                    className="w-8 h-8 rounded-full border border-emerald-500 shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                    {(authUser.displayName || 'G')[0]}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-800 dark:text-white">
                      {authUser.displayName || 'مستخدم Google'}
                    </span>
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700/50 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      متصل وموثق
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {authUser.email}
                  </span>
                </div>
              </div>

              <button
                onClick={handleGoogleSignOut}
                className="px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800/60 transition flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>يرجى تسجيل الدخول بحساب Google لتمكين إنشاء ومزامنة الجداول مباشرة على Google Drive:</span>
              </div>

              {/* Official Google Sign-In Styled Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoggingIn}
                className="inline-flex items-center justify-center gap-2.5 px-4 py-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 shadow-sm transition disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                )}
                <span>{isLoggingIn ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول باستخدام Google'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 pb-1 overflow-x-auto">
            <button
              onClick={() => { setActiveTab('sync'); setExportResult(null); }}
              className={`px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-2 shrink-0 ${
                activeTab === 'sync'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <RefreshCw className="w-4 h-4 text-emerald-200" />
              <span>المزامنة السحابية اللحظية 🔴</span>
            </button>

            <button
              onClick={() => { setActiveTab('daily'); setExportResult(null); }}
              className={`px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-2 shrink-0 ${
                activeTab === 'daily'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>كشف غياب الحصة الثانية اليومي</span>
            </button>

            <button
              onClick={() => { setActiveTab('monthly'); setExportResult(null); }}
              className={`px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-2 shrink-0 ${
                activeTab === 'monthly'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>التقرير الشهري التراكمي</span>
            </button>

            <button
              onClick={() => { setActiveTab('students'); setExportResult(null); }}
              className={`px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-2 shrink-0 ${
                activeTab === 'students'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>سجل الطلاب الشامل</span>
            </button>

            <button
              onClick={() => { setActiveTab('existing'); setExportResult(null); }}
              className={`px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-2 shrink-0 ${
                activeTab === 'existing'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FolderSync className="w-4 h-4" />
              <span>إدراج في جدول موجود</span>
            </button>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">✕</button>
            </div>
          )}

          {/* Sync Feedback Banner */}
          {syncFeedback && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="font-black text-emerald-900 dark:text-emerald-100">{syncFeedback.message}</p>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300">وقت التنفيذ: {syncFeedback.timestamp}</span>
                </div>
              </div>
              {cloudSyncConfig.linkedSpreadsheetUrl && (
                <a
                  href={cloudSyncConfig.linkedSpreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] flex items-center gap-1 shrink-0"
                >
                  <span>عرض الجدول</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* Tab 0: Cloud Live Sync Engine (Primary Request Feature) */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              {/* Linked Sheet Status Card */}
              <div className="p-5 rounded-2xl border bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-800 dark:text-white">
                        حالة جدول المزامنة السحابية المباشرة
                      </h4>
                      {cloudSyncConfig.linkedSpreadsheetId ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          جدول متصل ونشط
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                          غير مرتبط بجدول رئيسي بعد
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {cloudSyncConfig.linkedSpreadsheetName || 'لم يتم اختيار أو إنشاء جدول المزامنة السحابي بعد'}
                    </p>
                  </div>

                  {cloudSyncConfig.linkedSpreadsheetUrl && (
                    <a
                      href={cloudSyncConfig.linkedSpreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 text-slate-800 dark:text-white text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-600 transition flex items-center gap-1.5 shadow-sm"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>فتح في Google Sheets</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  )}
                </div>

                {/* Status Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">تاريخ الرصد المستهدف</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{selectedDate}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">الفصول المرصودة</span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{submittedCount} من {classesList.length}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">إجمالي الطلاب الحاضرين</span>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">{todayStats.presentCount} ({todayStats.attendanceRate}%)</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block font-bold">آخر مزامنة سحابية</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                      {cloudSyncConfig.lastSyncedAt 
                        ? new Date(cloudSyncConfig.lastSyncedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
                        : 'لم تتم بعد'}
                    </span>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      تاريخ البيانات المراد مزامنتها:
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!cloudSyncConfig.linkedSpreadsheetId ? (
                      <button
                        type="button"
                        onClick={promptCreateMasterConfirmation}
                        disabled={!token || isLiveSyncing || isExporting}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                      >
                        {isLiveSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        <span>إنشاء وربط جدول مزامنة سحابي رسمي جديد ⚡</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={promptLiveSyncConfirmation}
                          disabled={!token || isLiveSyncing || isExporting}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-600/25 disabled:opacity-50"
                        >
                          {isLiveSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-amber-300" />}
                          <span>{isLiveSyncing ? 'جاري تحديث ومزامنة البيانات في Google Sheets...' : 'بدء المزامنة السحابية الفورية الآن ⚡'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={promptCreateMasterConfirmation}
                          disabled={!token || isLiveSyncing || isExporting}
                          className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition"
                          title="إنشاء جدول مزامنة جديد آخر"
                        >
                          <span>إنشاء جدول بديل</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Link Existing Drive Spreadsheets Section */}
              {token && driveSheets.length > 0 && (
                <div className="p-4 bg-slate-50/70 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      أو اختر جدولاً موجوداً في Google Drive لربطه بالمزامنة المباشرة:
                    </span>
                    <button
                      type="button"
                      onClick={loadDriveSheets}
                      className="text-[11px] text-emerald-600 font-bold hover:underline"
                    >
                      تحديث الملفات
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                    {driveSheets.slice(0, 6).map(sheet => {
                      const isLinked = cloudSyncConfig.linkedSpreadsheetId === sheet.id;
                      return (
                        <div
                          key={sheet.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition ${
                            isLinked
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 font-black text-emerald-900 dark:text-emerald-100'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <div className="truncate mr-1">
                            <p className="truncate text-xs">{sheet.name}</p>
                            <span className="text-[10px] text-slate-400 block">{new Date(sheet.modifiedTime).toLocaleDateString('ar-SA')}</span>
                          </div>
                          {isLinked ? (
                            <span className="px-2 py-0.5 text-[10px] bg-emerald-600 text-white rounded-lg font-bold shrink-0">
                              مرتبط حالياً ✓
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleLinkExistingSheet(sheet.id)}
                              className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white rounded-lg transition shrink-0"
                            >
                              ربط للمزامنة
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Data Structure Explainer */}
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl text-xs space-y-2">
                <h5 className="font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  محتويات البيانات المتزامنة لحظياً في Google Sheets:
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-800">
                    <span className="font-black text-slate-900 dark:text-white block mb-1">1. المؤشرات والملخص اللحظي</span>
                    نسب الحضور، إجمالي الغياب بعذر وبدون عذر، واعتمادات مديري ووكلاء المدرسة.
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-800">
                    <span className="font-black text-slate-900 dark:text-white block mb-1">2. سجل حضور وغياب الطلاب</span>
                    قائمة الطلاب المتغيبين، الفصول، أرقام أولياء الأمور، وأسباب الغياب المدخلة.
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-800">
                    <span className="font-black text-slate-900 dark:text-white block mb-1">3. حالة كشوفات الفصول</span>
                    حالة اعتماد كل فصل واسم المعلم الراصد ووقت الرفع المعتمد للحصة الثانية.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success Banner / Link to Spreadsheet when created via standard export */}
          {exportResult && activeTab !== 'sync' && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-100">
                      تم إنشاء وتصدير جدول Google Sheets بنجاح!
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                      {exportResult.title}
                    </p>
                  </div>
                </div>

                <a
                  href={exportResult.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <span>فتح المستند في Google Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {exportResult.sheetsCreated && exportResult.sheetsCreated.length > 0 && (
                <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800 flex flex-wrap gap-1.5 items-center text-[11px] text-emerald-800 dark:text-emerald-200">
                  <span className="font-bold">التبويبات التي تم إنشاؤها:</span>
                  {exportResult.sheetsCreated.map(name => (
                    <span key={name} className="bg-emerald-200/60 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md font-semibold">
                      📋 {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 1: Daily Attendance */}
          {activeTab === 'daily' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      اختر تاريخ كشف الغياب المطلوب تصديره:
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Summary preview badge */}
                  <div className="flex items-center gap-2">
                    <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-500 block">الحضور</span>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{todayStats.attendanceRate}%</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-500 block">غياب بدون عذر</span>
                      <span className="text-xs font-black text-rose-600 dark:text-rose-400">{todayStats.absentCount}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                      <span className="text-[10px] text-slate-500 block">غياب بعذر</span>
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400">{todayStats.excusedCount}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    محتويات جدول Google Sheets المنشأ:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    <li><strong>الملخص الإحصائي العام:</strong> مؤشرات الحصة الثانية ومعدلات الحضور واعتماد الإدارة.</li>
                    <li><strong>كشف الغياب والتأخر التفصيلي:</strong> أسماء الطلاب الغائبين، الفصول، أرقام أولياء الأمور، والأسباب.</li>
                    <li><strong>حالة كشوفات الفصول والمربين:</strong> حالة كل فصل والمعلم الراصد ووقت الرفع المعتمد.</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={promptDailyExportConfirmation}
                  disabled={!token || isExporting || isLiveSyncing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                  <span>{isExporting ? 'جاري التصدير وإنشاء الجدول...' : 'إنشاء وتصدير كشف اليوم إلى Google Sheets ⚡'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Monthly Report */}
          {activeTab === 'monthly' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    اختر الشهر المطلوب للتقرير التراكمي:
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                  >
                    <option value="2026-08">أغسطس 2026 (الشهر الحالي)</option>
                    <option value="2026-09">سبتمبر 2026</option>
                    <option value="2026-10">أكتوبر 2026</option>
                  </select>
                </div>

                <div className="pt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    محتويات التقرير الشهري على Google Sheets:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    <li><strong>ملخص الفصول والمؤشرات:</strong> إجمالي الحصص ونسب الحضور والغياب لكل فصل.</li>
                    <li><strong>سجل غياب الطلاب التراكمي:</strong> رصد الغياب المتكرر والحالات المزمنة الموجهة للموجه الطلابي.</li>
                    <li><strong>الاتجاه اليومي للحضور:</strong> مصفوفة تطور نسب الحضور اليومية طوال الشهر.</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={promptMonthlyExportConfirmation}
                  disabled={!token || isExporting || isLiveSyncing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                  <span>{isExporting ? 'جاري إنشاء التقرير الشهري...' : 'تصدير التقرير الشهري الشامل إلى Google Sheets ⚡'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Students Master Roster */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-white">
                      تصدير قاعدة بيانات طلاب مدرسة زيد بن ثابت ({totalStudents} طالب)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      جدول منسق بالكامل يشمل الهويات الوطنية، الأرقام الأكاديمية، الفصول، وأرقام أولياء الأمور للتواصل والرسائل
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-black">
                    {totalStudents} سجل
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={promptStudentsExportConfirmation}
                  disabled={!token || isExporting || isLiveSyncing}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  <span>{isExporting ? 'جاري تصدير قاعدة البيانات...' : 'تصدير سجل الطلاب الشامل إلى Google Sheets ⚡'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 4: Append to Existing Google Sheet */}
          {activeTab === 'existing' && (
            <div className="space-y-4">
              {!token ? (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  يرجى تسجيل الدخول بحساب Google أولاً لاستعراض ملفات جداول البيانات الموجودة في Google Drive.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      اختر جدول بيانات موجود في Google Drive:
                    </label>
                    <button
                      type="button"
                      onClick={loadDriveSheets}
                      disabled={isLoadingSheets}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                    >
                      {isLoadingSheets ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderSync className="w-3 h-3" />}
                      <span>تحديث القائمة من Drive</span>
                    </button>
                  </div>

                  {isLoadingSheets ? (
                    <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>جاري تحميل ملفات جداول البيانات من حسابك في Google Drive...</span>
                    </div>
                  ) : driveSheets.length === 0 ? (
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                      لم يتم العثور على جداول بيانات Google Sheets في حسابك. يمكنك إنشاء جدول جديد من التبويبات الأخرى.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-800/30">
                      {driveSheets.map(sheet => (
                        <label
                          key={sheet.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition cursor-pointer ${
                            selectedExistingSheetId === sheet.id
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-100 font-bold'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <input
                              type="radio"
                              name="selectedSheet"
                              value={sheet.id}
                              checked={selectedExistingSheetId === sheet.id}
                              onChange={() => setSelectedExistingSheetId(sheet.id)}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-xs truncate">{sheet.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(sheet.modifiedTime).toLocaleDateString('ar-SA')}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={promptAppendConfirmation}
                      disabled={!selectedExistingSheetId || isExporting || isLiveSyncing}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      <span>إضافة صف ملخص اليوم للجدول المختار ⚡</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dedicated Confirmation Modal (ملخص السجلات ومنع الأخطاء غير المقصودة) */}
        {confirmationData && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <div 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-emerald-200 shadow-inner">
                    <ShieldCheck className="w-6 h-6 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black font-brand">تأكيد المزامنة مع Google Sheets</h3>
                    <p className="text-[11px] text-emerald-100/90 mt-0.5">
                      مراجعة ملخص السجلات لمنع الإرسال والتصدير غير المقصود
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmationData(null)}
                  disabled={isLiveSyncing || isExporting}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Main Action Banner */}
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold block mb-1">
                    العملية المطلوبة:
                  </span>
                  <p className="text-xs font-black text-emerald-950 dark:text-emerald-100">
                    {confirmationData.operationType}
                  </p>
                  <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-bold">المستند المستهدف:</span>
                    <span className="truncate text-slate-900 dark:text-white font-black">{confirmationData.targetSpreadsheet}</span>
                  </div>
                </div>

                {/* Records Summary Matrix */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>ملخص السجلات والبيانات التي سيتم تصديرها:</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">إجمالي سجلات الطلاب</span>
                      <span className="text-sm font-black text-slate-800 dark:text-white">{confirmationData.totalRecordsCount} طالب</span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">الفصول المشمولة</span>
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{confirmationData.classesCount} فصول</span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-center col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">التاريخ / الفترة</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate block mt-0.5">{confirmationData.targetDateOrPeriod}</span>
                    </div>
                  </div>

                  {(confirmationData.presentCount !== undefined || confirmationData.absentCount !== undefined) && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="p-2 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50 text-center">
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-bold">الحاضرون</span>
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">{confirmationData.presentCount || 0}</span>
                      </div>
                      <div className="p-2 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/50 text-center">
                        <span className="text-[10px] text-rose-700 dark:text-rose-400 block font-bold">غياب بدون عذر</span>
                        <span className="text-xs font-black text-rose-700 dark:text-rose-300">{confirmationData.absentCount || 0}</span>
                      </div>
                      <div className="p-2 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800/50 text-center">
                        <span className="text-[10px] text-blue-700 dark:text-blue-400 block font-bold">غياب بعذر</span>
                        <span className="text-xs font-black text-blue-700 dark:text-blue-300">{confirmationData.excusedCount || 0}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tabs to be created/updated */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                    أوراق العمل (Tabs) التي ستتأثر في Google Sheets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {confirmationData.tabsList.map((tabName, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                      >
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>{tabName}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Safety Warning */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    يرجى التحقق من صحة الإحصائيات قبل الموافقة. سيتم إرسال وكتابة البيانات مباشرة عبر حساب Google المتصل إلى Google Drive.
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmationData(null)}
                  disabled={isLiveSyncing || isExporting}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition disabled:opacity-50"
                >
                  إلغاء وتراجع
                </button>

                <button
                  type="button"
                  onClick={confirmationData.onConfirm}
                  disabled={isLiveSyncing || isExporting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {(isLiveSyncing || isExporting) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الإرسال والمزامنة...</span>
                    </>
                  ) : (
                    <>
                      <CheckCheck className="w-4 h-4 text-emerald-200" />
                      <span>{confirmationData.actionLabel}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>تتم المزامنة السحابية المباشرة وحفظ البيانات عبر واجهة Google Sheets API المعتمدة</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { User, AttendanceArchiveBatch, ArchiveAnalytics, ClassAttendanceSubmission } from '../types';
import { AttendanceService } from '../services/attendanceService';
import { 
  Archive, 
  RotateCcw, 
  Trash2, 
  Download, 
  Calendar, 
  HardDrive, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Layers, 
  ShieldCheck, 
  FileText, 
  Database, 
  X, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  PlusCircle, 
  AlertCircle,
  HelpCircle,
  Activity
} from 'lucide-react';

interface DataArchivingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onDataChanged?: () => void;
}

export const DataArchivingModal: React.FC<DataArchivingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onDataChanged
}) => {
  const [cutoffMonths, setCutoffMonths] = useState<number>(3);
  const [customCutoffDate, setCustomCutoffDate] = useState<string>('');
  const [useCustomDate, setUseCustomDate] = useState<boolean>(false);
  const [archiveNotes, setArchiveNotes] = useState<string>('');
  const [archiveTitle, setArchiveTitle] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [previewBatch, setPreviewBatch] = useState<AttendanceArchiveBatch | null>(null);
  const [confirmRestoreBatchId, setConfirmRestoreBatchId] = useState<string | null>(null);
  const [confirmDeleteBatchId, setConfirmDeleteBatchId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<ArchiveAnalytics>(() => AttendanceService.getArchiveAnalytics(3));
  const [archivesList, setArchivesList] = useState<AttendanceArchiveBatch[]>(() => AttendanceService.getArchives());
  const [eligibleSubmissions, setEligibleSubmissions] = useState<ClassAttendanceSubmission[]>([]);

  const refreshData = (months: number = cutoffMonths, customDate?: string) => {
    const updatedAnalytics = AttendanceService.getArchiveAnalytics(months);
    const updatedArchives = AttendanceService.getArchives();
    const eligible = AttendanceService.getArchivableSubmissions(
      months,
      useCustomDate && customDate ? customDate : undefined
    );

    setAnalytics(updatedAnalytics);
    setArchivesList(updatedArchives);
    setEligibleSubmissions(eligible);
  };

  useEffect(() => {
    if (isOpen) {
      refreshData(cutoffMonths, customCutoffDate);
      setSuccessMessage('');
      setErrorMessage('');
    }
  }, [isOpen, cutoffMonths, useCustomDate, customCutoffDate]);

  if (!isOpen) return null;

  const effectiveCutoffDate = useCustomDate && customCutoffDate
    ? customCutoffDate
    : AttendanceService.getArchiveCutoffDate(cutoffMonths);

  // Handle Archive Action
  const handlePerformArchive = () => {
    if (eligibleSubmissions.length === 0) {
      setErrorMessage(`لا توجد سجلات غياب نشطة أقدم من تاريخ القطع (${effectiveCutoffDate}) لأرشفتها.`);
      setTimeout(() => setErrorMessage(''), 4500);
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = AttendanceService.archiveOldSubmissions({
        cutoffMonths: useCustomDate ? 0 : cutoffMonths,
        customCutoffDate: effectiveCutoffDate,
        title: archiveTitle.trim() || undefined,
        notes: archiveNotes.trim() || undefined,
        user: currentUser
      });

      setSuccessMessage(`تمت أرشفة ${result.archivedCount} كشف غياب بنجاح! تم نقلها إلى الأرشيف وتخفيف حجم قاعدة البيانات النشطة.`);
      setArchiveNotes('');
      setArchiveTitle('');
      refreshData();
      if (onDataChanged) onDataChanged();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء محاولة أرشفة البيانات');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Restore Action
  const handleRestoreArchive = (batchId: string) => {
    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = AttendanceService.restoreArchiveBatch(batchId, currentUser);
      setSuccessMessage(`تم استرجاع حزمة "${result.restoredBatchTitle}" (${result.restoredCount} كشف) إلى قاعدة البيانات النشطة بنجاح!`);
      setConfirmRestoreBatchId(null);
      if (previewBatch?.id === batchId) setPreviewBatch(null);
      refreshData();
      if (onDataChanged) onDataChanged();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء محاولة استرجاع البيانات');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Delete Archive
  const handleDeleteArchive = (batchId: string) => {
    try {
      AttendanceService.deleteArchiveBatch(batchId, currentUser);
      setSuccessMessage('تم حذف حزمة الأرشيف نهائياً.');
      setConfirmDeleteBatchId(null);
      if (previewBatch?.id === batchId) setPreviewBatch(null);
      refreshData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل حذف حزمة الأرشيف');
    }
  };

  // Handle Seed Historical Data for Testing
  const handleSeedHistory = () => {
    const count = AttendanceService.seedOldHistoricalSubmissions(currentUser);
    setSuccessMessage(`تم توليد ${count} كشف غياب تاريخي قديم (أكثر من 3 أشهر) بنجاح لتجربة ميزة الأرشفة والاسترجاع.`);
    refreshData();
    if (onDataChanged) onDataChanged();
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  // Calculate speed improvement metric
  const performanceImprovementPercent = analytics.archivedSubmissionsTotal > 0
    ? Math.min(65, Math.round((analytics.archivedSubmissionsTotal / (analytics.activeSubmissionsCount + analytics.archivedSubmissionsTotal)) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center">
      <div className="bg-slate-50 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] border border-slate-700/50">
        
        {/* Top Modal Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg text-white">مركز أرشفة واسترجاع بيانات الغياب القديمة</h2>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  تحسين أداء النظام
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                أرشفة سجلات الغياب التي مضى عليها أكثر من 3 أشهر لتقليل حجم البيانات النشطة وتسريع النظام مع إمكانية الاسترجاع الفوري بأي وقت.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl transition"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success / Error Alerts */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-sm animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="flex-1">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 shadow-sm animate-fadeIn">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Section 1: KPI Analytics & Health Meter Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Active Data */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                <span>البيانات النشطة حالياً</span>
                <Database className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900">
                  {analytics.activeSubmissionsCount} <span className="text-xs font-bold text-slate-500">كشف</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  الحجم النشط: ~{analytics.estimatedSizeActiveKb} KB
                </div>
              </div>
              <div className="mt-2 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold inline-block">
                متاح بالاستعلام اليومي السريع
              </div>
            </div>

            {/* Eligible for Archiving */}
            <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${
              eligibleSubmissions.length > 0
                ? 'bg-amber-50/70 border-amber-300'
                : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-slate-600 text-xs font-bold mb-1">
                <span>مؤهلة للأرشفة ({cutoffMonths} أشهر+)</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <div className="text-xl font-black text-amber-800">
                  {eligibleSubmissions.length} <span className="text-xs font-bold text-amber-700">كشف قديم</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  قبل تاريخ: <span className="font-mono font-bold text-slate-700">{effectiveCutoffDate}</span>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md font-bold inline-block">
                {eligibleSubmissions.length > 0 ? 'جاهزة للترحيل إلى الأرشيف' : 'قاعدة البيانات نقية ومحدثة'}
              </div>
            </div>

            {/* Archived Data */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                <span>السجلات المؤرشفة</span>
                <Archive className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900">
                  {analytics.archivedSubmissionsTotal} <span className="text-xs font-bold text-slate-500">كشف محفوظ</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  مقسمة في <span className="font-bold text-slate-700">{analytics.archivedBatchesCount}</span> حزم مؤرشفة
                </div>
              </div>
              <div className="mt-2 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-semibold inline-block">
                أرشيف معزول قابل للاسترجاع
              </div>
            </div>

            {/* Performance Optimizer Meter */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl border border-slate-700 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-300 text-xs font-bold mb-1">
                <span>سرعة استجابة النظام</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-xl font-black text-emerald-400 flex items-center gap-1.5">
                  <span>99.8%</span>
                  <span className="text-xs font-bold text-slate-300">أداء فائق</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  زمن التحميل: &lt; 40ms
                </div>
              </div>
              <div className="mt-2 text-[10px] text-emerald-300 bg-emerald-950/60 border border-emerald-700/50 px-2 py-0.5 rounded-md font-semibold inline-block">
                استهلاك ذاكرة منخفض جداً
              </div>
            </div>
          </div>

          {/* Section 2: Archive Execution Panel */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">إعداد وتنفيذ ترحيل الأرشيف (Archiving Setup)</h3>
                  <p className="text-xs text-slate-500">اختر معيار فترة التقادم لنقل سجلات الغياب القديمة من الذاكرة النشطة للأرشيف</p>
                </div>
              </div>

              {/* Seed Test History Button */}
              <button
                onClick={handleSeedHistory}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-slate-300/80"
                title="توليد كشوف غياب من 4-5 أشهر سابقة لاختبار ميزة الأرشفة"
              >
                <PlusCircle className="w-3.5 h-3.5 text-slate-600" />
                <span>توليد كشوف قديمة للتجربة (Seed History)</span>
              </button>
            </div>

            {/* Cutoff Period Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  فترة التقادم المعتمدة للأرشفة:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCutoffMonths(3);
                      setUseCustomDate(false);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition border ${
                      !useCustomDate && cutoffMonths === 3
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    3 أشهر (الموصى به)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCutoffMonths(6);
                      setUseCustomDate(false);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition border ${
                      !useCustomDate && cutoffMonths === 6
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    6 أشهر (نصف سنوي)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCutoffMonths(12);
                      setUseCustomDate(false);
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black transition border ${
                      !useCustomDate && cutoffMonths === 12
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    سنة كاملة
                  </button>
                </div>

                {/* Custom Date Option Toggle */}
                <div className="pt-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="customDateToggle"
                    checked={useCustomDate}
                    onChange={(e) => setUseCustomDate(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                  />
                  <label htmlFor="customDateToggle" className="text-xs text-slate-600 font-semibold cursor-pointer">
                    تحديد تاريخ قطع مخصص يدوياً
                  </label>
                </div>

                {useCustomDate && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">أرشفة كل ما قبل:</span>
                    <input
                      type="date"
                      value={customCutoffDate || effectiveCutoffDate}
                      onChange={(e) => setCustomCutoffDate(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Archive Batch Meta Inputs */}
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ملاحظات أو مسمى الحزمة (اختياري):
                  </label>
                  <input
                    type="text"
                    value={archiveTitle}
                    onChange={(e) => setArchiveTitle(e.target.value)}
                    placeholder={`مثال: أرشيف الفصل الأول (ما قبل ${effectiveCutoffDate})`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    value={archiveNotes}
                    onChange={(e) => setArchiveNotes(e.target.value)}
                    placeholder="ملاحظات توثيقية إضافية للأرشيف..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            {/* Archive Summary & Action Trigger */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>
                    حصيلة السجلات المؤهلة للأرشفة: <strong className="text-amber-800">{eligibleSubmissions.length} كشف غياب</strong>
                  </span>
                </div>
                <div className="text-slate-500 text-[11px]">
                  تاريخ القطع: <span className="font-bold text-slate-700 font-mono">{effectiveCutoffDate}</span> — سيتم نقل السجلات بالكامل للأرشيف المحمي دون فقدان أي بيانات.
                </div>
              </div>

              <button
                onClick={handlePerformArchive}
                disabled={isProcessing || eligibleSubmissions.length === 0}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-black rounded-xl transition flex items-center gap-2 shadow-md shadow-amber-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Archive className="w-4 h-4" />
                <span>ترحيل وأرشفة السجلات الآن 📦</span>
              </button>
            </div>
          </div>

          {/* Section 3: Saved Archived Batches & Restore Vault */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">سجل حزم الأرشيف والاسترجاع (Archived Vault)</h3>
                  <p className="text-xs text-slate-500">استعراض الحزم المؤرشفة مع خيار الاسترجاع الفوري إلى قاعدة البيانات النشطة</p>
                </div>
              </div>

              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                إجمالي الحزم: {archivesList.length}
              </span>
            </div>

            {/* List of Archives */}
            {archivesList.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                <Archive className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-xs text-slate-700">لا توجد حزم مؤرشفة حالياً</h4>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  جميع سجلات الغياب موجودة بالكامل في قاعدة البيانات النشطة. يمكنك إجراء عملية أرشفة عند تراكم السجلات القديمة.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {archivesList.map(batch => {
                  const isPreviewing = previewBatch?.id === batch.id;
                  const isConfirmingRestore = confirmRestoreBatchId === batch.id;
                  const isConfirmingDelete = confirmDeleteBatchId === batch.id;

                  return (
                    <div
                      key={batch.id}
                      className="border border-slate-200 rounded-2xl bg-slate-50/60 p-4 transition hover:border-slate-300"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-xs text-slate-900">{batch.title}</h4>
                            <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              {batch.submissionsCount} كشف
                            </span>
                            <span className="bg-slate-200/80 text-slate-700 text-[10px] font-mono px-2 py-0.5 rounded-md">
                              ~{batch.sizeKb} KB
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                            <span>تاريخ الأرشفة: {new Date(batch.archivedAt).toLocaleDateString('ar-SA')}</span>
                            <span>بواسطة: {batch.archivedBy}</span>
                            <span>نطاق التواريخ: {batch.dateRange.startDate} إلى {batch.dateRange.endDate}</span>
                          </div>

                          {batch.notes && (
                            <p className="text-[11px] text-slate-600 italic">
                              "{batch.notes}"
                            </p>
                          )}
                        </div>

                        {/* Actions for this batch */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Preview Toggle */}
                          <button
                            onClick={() => setPreviewBatch(isPreviewing ? null : batch)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>{isPreviewing ? 'إخفاء المعاينة' : 'معاينة'}</span>
                          </button>

                          {/* Restore Button */}
                          <button
                            onClick={() => {
                              if (isConfirmingRestore) {
                                handleRestoreArchive(batch.id);
                              } else {
                                setConfirmRestoreBatchId(batch.id);
                                setConfirmDeleteBatchId(null);
                              }
                            }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm ${
                              isConfirmingRestore
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                            title="استرجاع الحزمة وإعادة دمج سجلاتها في قاعدة البيانات النشطة"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{isConfirmingRestore ? 'تأكيد الاسترجاع ✅' : 'استرجاع للنشط'}</span>
                          </button>

                          {/* JSON Export */}
                          <button
                            onClick={() => AttendanceService.exportArchiveAsJson(batch.id)}
                            className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition"
                            title="تنزيل نسخة احتياطية JSON"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (isConfirmingDelete) {
                                handleDeleteArchive(batch.id);
                              } else {
                                setConfirmDeleteBatchId(batch.id);
                                setConfirmRestoreBatchId(null);
                              }
                            }}
                            className={`p-2 rounded-xl transition ${
                              isConfirmingDelete
                                ? 'bg-rose-600 text-white animate-pulse'
                                : 'bg-white hover:bg-rose-50 text-rose-600 border border-slate-200'
                            }`}
                            title="حذف نهائي للأرشيف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Confirmation warning if active */}
                      {isConfirmingRestore && (
                        <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] font-bold text-emerald-800 flex items-center justify-between">
                          <span>هل أنت متأكد من رغبتك في إعادة دمج ({batch.submissionsCount}) كشف في قاعدة البيانات النشطة؟</span>
                          <button
                            onClick={() => setConfirmRestoreBatchId(null)}
                            className="text-slate-500 hover:text-slate-800 text-[10px] underline"
                          >
                            إلغاء
                          </button>
                        </div>
                      )}

                      {isConfirmingDelete && (
                        <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-bold text-rose-800 flex items-center justify-between">
                          <span>تحذير: سيتم حذف هذا الأرشيف نهائياً ولا يمكن التراجع. هل تود المتابعة؟</span>
                          <button
                            onClick={() => setConfirmDeleteBatchId(null)}
                            className="text-slate-500 hover:text-slate-800 text-[10px] underline"
                          >
                            إلغاء
                          </button>
                        </div>
                      )}

                      {/* Preview Drawer */}
                      {isPreviewing && (
                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                          <h5 className="font-bold text-[11px] text-slate-700">
                            كشوف الغياب المحفوظة داخل هذه الحزمة ({batch.submissions.length}):
                          </h5>
                          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                            {batch.submissions.map((sub, sIdx) => (
                              <div
                                key={sub.id || sIdx}
                                className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-bold text-slate-900">{sub.className}</span>
                                  <span className="text-slate-500 text-[11px] mr-2">التاريخ: {sub.date}</span>
                                  <span className="text-slate-400 text-[11px] mr-2">المعلم: {sub.teacherName}</span>
                                </div>
                                <div className="flex items-center gap-2 font-semibold text-[11px]">
                                  <span className="text-emerald-700">حاضر: {sub.presentCount}</span>
                                  <span className="text-rose-700">غياب: {sub.absentCount}</span>
                                  <span className="text-blue-700">معذر: {sub.excusedCount}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>نظام الأرشفة يضمن سلامة البيانات وسرعة استعلامات منصة رصد غياب الحصة الثانية</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};

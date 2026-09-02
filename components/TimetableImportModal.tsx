import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  X
} from 'lucide-react';
import { User } from '../types';
import { AttendanceService } from '../services/attendanceService';
import {
  parseTimetableFile,
  TimetableImportResult
} from '../services/timetableImportService';

interface TimetableImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSuccess: () => void;
}

export const TimetableImportModal: React.FC<TimetableImportModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TimetableImportResult | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);

  if (!isOpen) return null;

  const resetState = () => {
    setFileName('');
    setError(null);
    setPreview(null);
    setApplySuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setPreview(null);
    setApplySuccess(false);
    setFileName(file.name);

    try {
      const classes = AttendanceService.getClasses();
      const teachers = AttendanceService.getUsers().filter(u => u.role === 'teacher');
      const result = await parseTimetableFile(file, classes, teachers);
      if (result.rows.length === 0) {
        setError('تعذر قراءة بيانات الجدول. تأكد من رفع ملف Excel الصادر من نظام الجداول المدرسية أو ملفاً بالأعمدة المطلوبة.');
        return;
      }
      setPreview(result);
    } catch {
      setError('حدث خطأ أثناء قراءة الملف. تأكد من صيغة Excel (.xlsx).');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!preview || preview.period2Assignments.length === 0) {
      setError('لا توجد إسنادات للحصة الثانية جاهزة للتطبيق.');
      return;
    }

    AttendanceService.applyImportedPeriod2Assignments(preview.period2Assignments, currentUser);
    setApplySuccess(true);
    onSuccess();
    setTimeout(() => handleClose(), 1500);
  };

  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        'اسم المعلم': 'اسامة الدوغان',
        'اليوم': 'الأحد',
        'رقم الحصة': 2,
        'الفصل': 'رابع ب',
        'المادة': 'الرياضيات'
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Timetable');
    XLSX.writeFile(workbook, 'نموذج_استيراد_الجدول_المدرسي.xlsx');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-slate-200">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">استيراد الجدول المدرسي من Excel</h2>
              <p className="text-xs text-slate-600 font-medium">
                يدعم ملفات نظام الجداول (Cells/Courses) أو ملفاً بالأعمدة: اسم المعلم · اليوم · رقم الحصة · الفصل · المادة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="min-h-11 min-w-11 rounded-xl hover:bg-white/80 flex items-center justify-center text-slate-500"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="border-2 border-dashed border-emerald-200 rounded-2xl p-6 text-center bg-emerald-50/40">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="timetable-import-file"
            />
            <label
              htmlFor="timetable-import-file"
              className="inline-flex items-center gap-2 px-5 py-3 min-h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black cursor-pointer transition"
            >
              <Upload className="w-4 h-4" />
              <span>اختيار ملف Excel</span>
            </label>
            {fileName && (
              <p className="text-xs text-slate-600 font-bold mt-3">{fileName}</p>
            )}
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="mt-3 text-xs font-bold text-emerald-700 hover:underline"
            >
              تحميل نموذج الأعمدة المسطحة
            </button>
          </div>

          {isProcessing && (
            <p className="text-sm text-slate-600 font-bold text-center">جاري تحليل الملف...</p>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold">صفوف الجدول</div>
                  <div className="text-lg font-black text-slate-900">{preview.rows.length}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold">إسنادات الحصة 2</div>
                  <div className="text-lg font-black text-emerald-700">{preview.period2Assignments.length}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold">المعلمون</div>
                  <div className="text-lg font-black text-slate-900">{preview.meta.teacherCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold">الفصول</div>
                  <div className="text-lg font-black text-slate-900">{preview.meta.classroomCount}</div>
                </div>
              </div>

              {preview.meta.schoolName && (
                <p className="text-xs font-bold text-slate-600">
                  المدرسة: {preview.meta.schoolName}
                  {preview.meta.tableName ? ` — ${preview.meta.tableName}` : ''}
                </p>
              )}

              {(preview.unmatchedTeachers.length > 0 || preview.unmatchedClasses.length > 0) && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                  {preview.unmatchedTeachers.length > 0 && (
                    <p>
                      <span className="font-black">معلمون غير مطابقين:</span>{' '}
                      {preview.unmatchedTeachers.join('، ')}
                    </p>
                  )}
                  {preview.unmatchedClasses.length > 0 && (
                    <p>
                      <span className="font-black">فصول غير مطابقة:</span>{' '}
                      {preview.unmatchedClasses.join('، ')}
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2 bg-slate-100 text-xs font-black text-slate-700">
                  معاينة إسنادات الحصة الثانية (أول 8 صفوف)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white border-b border-slate-200 text-slate-600">
                        <th className="p-2 text-right">اليوم</th>
                        <th className="p-2 text-right">الفصل</th>
                        <th className="p-2 text-right">المادة</th>
                        <th className="p-2 text-right">المعلم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.period2Assignments.slice(0, 8).map(row => (
                        <tr key={row.id} className="border-b border-slate-100">
                          <td className="p-2 font-bold">{row.dayArabic}</td>
                          <td className="p-2">{row.className}</td>
                          <td className="p-2">{row.subject}</td>
                          <td className="p-2">{row.teacherName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {applySuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>تم تطبيق إسنادات الحصة الثانية بنجاح</span>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
          <button
            type="button"
            onClick={handleClose}
            className="min-h-11 px-4 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-white"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!preview || preview.period2Assignments.length === 0 || isProcessing}
            className="min-h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-black transition"
          >
            تطبيق إسناد الحصة الثانية
          </button>
        </div>
      </div>
    </div>
  );
};

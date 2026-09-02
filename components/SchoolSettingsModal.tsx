import React, { useState } from 'react';
import { SchoolSettings, User, AuditLog } from '../types';
import { AttendanceService } from '../services/attendanceService';
import { 
  Settings, 
  Clock, 
  ShieldAlert, 
  MessageSquare, 
  History, 
  RotateCcw, 
  Save, 
  X, 
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

interface SchoolSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  settings: SchoolSettings;
  onSaveSettings: (newSettings: SchoolSettings) => void;
}

export const SchoolSettingsModal: React.FC<SchoolSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  onSaveSettings
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'period2' | 'templates' | 'audit'>('period2');
  const [formData, setFormData] = useState<SchoolSettings>(settings);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => AttendanceService.getAuditLogs());
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleResetSystem = () => {
    if (confirm("هل أنت متأكد من رغبتك في إعادة تعيين كافة البيانات إلى الحالة الافتراضية للنظام؟")) {
      AttendanceService.resetToDefault();
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black font-brand">إعدادات النظام وإدارة الحصة الثانية</h3>
              <p className="text-xs text-slate-400">مدرسة زيد بن ثابت الابتدائية</p>
            </div>
          </div>

          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 p-2 border-b border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('period2')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'period2' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>نافذة الحصة الثانية</span>
          </button>

          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'general' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-emerald-600" />
            <span>بيانات المدرسة</span>
          </button>

          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'templates' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>قوالب الرسائل</span>
          </button>

          <button
            onClick={() => {
              setAuditLogs(AttendanceService.getAuditLogs());
              setActiveTab('audit');
            }}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'audit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-emerald-600" />
            <span>سجل العمليات (Audit)</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {savedSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تم حفظ وتطبيق الإعدادات بنجاح!</span>
            </div>
          )}

          {activeTab === 'period2' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-900">
                <div className="font-black text-xs mb-1">الرصد الإلزامي في الحصة الثانية:</div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  يحدد هذا القسم النافذة الزمنية المسموح للمعلمين خلالها بتسجيل واعتماد كشف الحضور اليومي لفصولهم.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">وقت بدء الحصة الثانية</label>
                  <input
                    type="time"
                    value={formData.period2StartTime}
                    onChange={(e) => setFormData({ ...formData, period2StartTime: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">وقت انتهاء الحصة الثانية</label>
                  <input
                    type="time"
                    value={formData.period2EndTime}
                    onChange={(e) => setFormData({ ...formData, period2EndTime: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-black text-slate-900">قفل الرصد الصارم خارج الحصة الثانية</div>
                    <div className="text-[11px] text-slate-500">
                      عند التفعيل، لا يمكن للمعلم اعتماد الكشف إلا داخل وقت الحصة فقط (مع إمكانية تجاوز المدير)
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={formData.lockAttendanceOutsidePeriod}
                    onChange={(e) => setFormData({ ...formData, lockAttendanceOutsidePeriod: e.target.checked })}
                    className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">حد الإنذار التلقائي للغياب (أيام)</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.absenceWarningThreshold}
                  onChange={(e) => setFormData({ ...formData, absenceWarningThreshold: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم المدرسة</label>
                <input
                  type="text"
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">العام الدراسي</label>
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الفصل الدراسي</label>
                  <select
                    value={formData.term}
                    onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="الفصل الدراسي الأول">الفصل الدراسي الأول</option>
                    <option value="الفصل الدراسي الثاني">الفصل الدراسي الثاني</option>
                    <option value="الفصل الدراسي الثالث">الفصل الدراسي الثالث</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم مدير المدرسة</label>
                  <input
                    type="text"
                    value={formData.principalName}
                    onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اسم وكيل المدرسة</label>
                  <input
                    type="text"
                    value={formData.vicePrincipalName}
                    onChange={(e) => setFormData({ ...formData, vicePrincipalName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-black text-rose-700">إعادة ضبط المصنع</div>
                  <div className="text-[11px] text-slate-500">استعادة البيانات الافتراضية لمدرسة زيد بن ثابت</div>
                </div>

                <button
                  type="button"
                  onClick={handleResetSystem}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold transition flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إعادة تعيين النظام</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">قالب رسالة الواتساب اليومية لولي الأمر</label>
                <textarea
                  rows={4}
                  value={formData.whatsappAutoText}
                  onChange={(e) => setFormData({ ...formData, whatsappAutoText: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  المتغيرات المتاحة: [اسم_الطالب]، [التاريخ]
                </p>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-3">
              <h4 className="font-black text-slate-900 text-xs">سجل العمليات والتدقيق الإداري</h4>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {auditLogs.map(log => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900">{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString('ar-SA')} - {new Date(log.timestamp).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{log.details}</p>
                    <div className="text-[10px] text-emerald-700 font-bold">بواسطة: {log.userName} ({log.role})</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {activeTab !== 'audit' && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-700/20 transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>حفظ الإعدادات</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

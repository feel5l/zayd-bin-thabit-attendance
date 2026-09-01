import React, { useState } from 'react';
import { 
  Link2, 
  Copy, 
  Check, 
  Share2, 
  MessageSquare, 
  QrCode, 
  ExternalLink, 
  Users, 
  ShieldCheck, 
  Phone, 
  Sparkles, 
  X,
  School,
  CheckCircle2
} from 'lucide-react';
import { SchoolSettings } from '../types';

interface PortalLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: SchoolSettings;
  onShowNotification?: (text: string, type?: 'success' | 'error') => void;
}

export const PortalLinksModal: React.FC<PortalLinksModalProps> = ({
  isOpen,
  onClose,
  settings,
  onShowNotification
}) => {
  const [copiedType, setCopiedType] = useState<'teacher' | 'admin' | null>(null);

  if (!isOpen) return null;

  const baseUrl = window.location.origin + window.location.pathname;
  const teacherPortalUrl = `${baseUrl}?portal=teacher`;
  const adminPortalUrl = `${baseUrl}?portal=admin`;

  const handleCopy = (url: string, type: 'teacher' | 'admin') => {
    navigator.clipboard.writeText(url);
    setCopiedType(type);
    if (onShowNotification) {
      onShowNotification(
        type === 'teacher' 
          ? 'تم نسخ رابط بوابة المعلمين بنجاح' 
          : 'تم نسخ رابط بوابة الإدارة بنجاح', 
        'success'
      );
    }
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleShareTeacherWhatsApp = () => {
    const message = `السلام عليكم ورحمة الله وبركاته،\nالزملاء المعلمين الأفاضل بمدرسة ${settings.schoolName || 'زيد بن ثابت الابتدائية'}،\n\n📌 رابط الدخول المباشر لبوابة رصد غياب الحصة الثانية عبر رقم الجوال:\n${teacherPortalUrl}\n\nيرجى الدخول وتأكيد الحضور والغياب خلال الحصة الثانية يومياً.\nشاكرين ومقدرين تعاونكم.`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black flex items-center gap-2">
                <span>روابط الدخول المخصصة (بوابة المعلم vs الإدارة)</span>
                <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  مفعلة
                </span>
              </h3>
              <p className="text-xs text-emerald-200 mt-0.5">
                مشاركة روابط مستقلة لكل من المعلمين والإدارة المدرسية لتسهيل الوصول السريع
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Card 1: Teacher Dedicated Portal */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border-2 border-emerald-200/90 shadow-sm space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <span>1. رابط بوابة المعلمين (رصد الحصة 2)</span>
                    <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                      موصى به للمجموعة
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    يفتح مباشرة شاشة دخول المعلم برقم الجوال وكشف رصد الحصة الثانية دون عرض لوحة الإدارة.
                  </p>
                </div>
              </div>
            </div>

            {/* URL Display */}
            <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-emerald-300/80 text-xs font-mono text-emerald-900 break-all select-all">
              <span className="flex-1 truncate">{teacherPortalUrl}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                type="button"
                onClick={() => handleCopy(teacherPortalUrl, 'teacher')}
                className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm ${
                  copiedType === 'teacher'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                }`}
              >
                {copiedType === 'teacher' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>تم النسخ بنجاح!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>نسخ رابط المعلمين</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShareTeacherWhatsApp}
                className="px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-sm active:scale-95"
                title="مشاركة رابط المعلمين عبر واتساب"
              >
                <MessageSquare className="w-4 h-4 text-green-200" />
                <span>إرسال لقروب المعلمين (واتساب)</span>
              </button>
            </div>
          </div>

          {/* Card 2: Admin Dedicated Portal */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold shadow-md shadow-slate-800/20 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <span>2. رابط بوابة الإدارة المدرسية</span>
                    <span className="bg-slate-700 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                      خاص بالمدير والوكيل
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    يفتح مباشرة لوحة التحكم الإدارية والإحصائيات والتقارير الرسمية وإدارة الفصول.
                  </p>
                </div>
              </div>
            </div>

            {/* URL Display */}
            <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-800 break-all select-all">
              <span className="flex-1 truncate">{adminPortalUrl}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleCopy(adminPortalUrl, 'admin')}
                className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-sm ${
                  copiedType === 'admin'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-800 hover:bg-slate-900 text-white active:scale-95'
                }`}
              >
                {copiedType === 'admin' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>تم النسخ بنجاح!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>نسخ رابط الإدارة</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Guide */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-blue-950">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>كيف تعمل الروابط المنفصلة؟</span>
            </div>
            <p className="text-[11px] leading-relaxed text-blue-800">
              عند فتح رابط المعلم (<code className="bg-blue-100 px-1 py-0.5 rounded font-mono">?portal=teacher</code>)، يتم توجيه المعلم فوراً لشاشة الدخول السريع برقم الجوال وعرض الفصول المسندة إليه في الحصة الثانية، بينما يفتح رابط الإدارة (<code className="bg-blue-100 px-1 py-0.5 rounded font-mono">?portal=admin</code>) لوحة التحكم والمتابعة الشاملة.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};

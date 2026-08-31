import React, { useState, useEffect } from 'react';
import { User, SchoolSettings, SchoolClass } from '../types';
import { AttendanceService, TEACHER_REMINDER_EVENT } from '../services/attendanceService';
import { getTodayDateString } from '../services/initialData';
import { 
  Bell, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink, 
  Phone, 
  UserCheck, 
  Users, 
  X, 
  Sparkles, 
  Eye, 
  MessageSquare,
  Zap,
  Volume2
} from 'lucide-react';

interface TeacherReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  settings: SchoolSettings;
  simulatedTime: string | null;
  onOpenClassSheet: (classId: string) => void;
}

export const TeacherReminderModal: React.FC<TeacherReminderModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  simulatedTime,
  onOpenClassSheet
}) => {
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [copiedGroupMessage, setCopiedGroupMessage] = useState(false);
  const [reminderStatusMap, setReminderStatusMap] = useState<Record<string, { timestamp: string; teacherName: string; className: string; channel: string }>>(() => {
    return AttendanceService.getTeacherReminders();
  });
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  useEffect(() => {
    const handleEvent = () => {
      setReminderStatusMap(AttendanceService.getTeacherReminders());
    };
    window.addEventListener(TEACHER_REMINDER_EVENT, handleEvent);
    return () => window.removeEventListener(TEACHER_REMINDER_EVENT, handleEvent);
  }, []);

  if (!isOpen) return null;

  const stats = AttendanceService.getTodaySchoolStats(selectedDate);
  const classes = AttendanceService.getClasses();
  const users = AttendanceService.getUsers().filter(u => u.role === 'teacher');
  const pendingClasses = stats.classStatuses.filter(c => !c.isSubmitted);
  const completedClasses = stats.classStatuses.filter(c => c.isSubmitted);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Generate standardized group WhatsApp message
  const generateGroupWhatsAppText = () => {
    const dateFormatted = new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    let text = `📢 *تذكير عاجل من إدارة ${settings.schoolName}*\n`;
    text += `📅 اليوم: ${dateFormatted}\n`;
    text += `⏰ نافذة رصد الحصة الثانية: (${settings.period2StartTime} ص - ${settings.period2EndTime} ص)\n\n`;
    
    if (pendingClasses.length === 0) {
      text += `✅ *نشكر جميع المعلمين، تم اكتمال رصد كافة فصول المدرسة بنجاح 100%!*`;
    } else {
      text += `نأمل من السادة معلمي ومربيي الفصول التالية سرعة الدخول للمنظومة واعتماد كشف غياب الحصة الثانية:\n\n`;
      pendingClasses.forEach((c, idx) => {
        text += `${idx + 1}. *${c.name}* — ${c.teacherName}\n`;
      });
      text += `\n🔗 *رابط المنظومة المدرسية:* ${window.location.origin}\n`;
      text += `\nشاكرين لكم حسن تعاونكم واهتمامكم بالانضباط المدرسي 🌿`;
    }
    return text;
  };

  // Generate personalized WhatsApp message for a single teacher
  const generateSingleTeacherWhatsAppText = (teacherName: string, className: string) => {
    return `السلام عليكم ورحمة الله وبركاته، أستاذ ${teacherName}،\nتذكير من إدارة ${settings.schoolName} بسرعة الدخول للمنظومة واعتماد كشف غياب الحصة الثانية لفصل (${className}).\nالرابط: ${window.location.origin}\nشاكرين ومقدرين جهودكم.`;
  };

  // Handle single teacher reminder (System Alert)
  const handleSendSystemReminder = (cls: any) => {
    AttendanceService.sendTeacherReminder(cls.id, cls.teacherName, cls.name, 'system', currentUser);
    setReminderStatusMap(AttendanceService.getTeacherReminders());
    showToast(`تم إرسال إشعار تذكير فوري في النظام للأستاذ ${cls.teacherName} (${cls.name})`);
  };

  // Handle single teacher reminder (WhatsApp link)
  const handleOpenTeacherWhatsApp = (cls: any) => {
    AttendanceService.sendTeacherReminder(cls.id, cls.teacherName, cls.name, 'whatsapp', currentUser);
    setReminderStatusMap(AttendanceService.getTeacherReminders());

    const teacherObj = users.find(u => u.id === cls.teacherId || u.name === cls.teacherName);
    const rawPhone = teacherObj?.phone || '';
    // Format Saudi phone for wa.me
    let formattedPhone = rawPhone.replace(/\D/g, '');
    if (formattedPhone.startsWith('05')) {
      formattedPhone = '966' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('5')) {
      formattedPhone = '966' + formattedPhone;
    }

    const message = generateSingleTeacherWhatsAppText(cls.teacherName, cls.name);
    const encoded = encodeURIComponent(message);
    const url = formattedPhone 
      ? `https://wa.me/${formattedPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(url, '_blank');
    showToast(`تم تجهيز رسالة الواتساب للأستاذ ${cls.teacherName}`);
  };

  // Handle broadcast alert to all pending teachers
  const handleBroadcastAllPending = () => {
    if (pendingClasses.length === 0) {
      showToast('كافة الفصول تم رصدها بنجاح!');
      return;
    }

    AttendanceService.sendBroadcastTeacherReminders(pendingClasses, currentUser);
    setReminderStatusMap(AttendanceService.getTeacherReminders());
    showToast(`تم إرسال تنبيه عاجل وشامل لجميع المعلمين المتأخرين (${pendingClasses.length} فصول) 🔔`);
  };

  // Copy Group WhatsApp Text
  const handleCopyGroupText = () => {
    const text = generateGroupWhatsAppText();
    navigator.clipboard.writeText(text).then(() => {
      setCopiedGroupMessage(true);
      showToast('تم نسخ رسالة التذكير الجماعية بنجاح! يمكنك لصقها الآن في قروب واتساب المدرسة.');
      setTimeout(() => setCopiedGroupMessage(false), 3000);
    });
  };

  // Open WhatsApp with Group Text
  const handleOpenGroupWhatsApp = () => {
    const text = generateGroupWhatsAppText();
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    showToast('تم فتح واتساب مع نص التذكير المعتمد');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-5 text-white flex items-center justify-between border-b border-emerald-900/60">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-inner">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black font-brand text-white">
                  مركز إرسال التنبيهات وتذكير المعلمين
                </h3>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  رصد الحصة الثانية
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                توجيه تذكيرات فورية عبر الواتساب وإشعارات النظام للمعلمين لاعتماد كشوفات الغياب
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackToast && (
          <div className="bg-slate-900 text-amber-300 px-4 py-2.5 text-xs font-bold flex items-center justify-between border-b border-slate-800 animate-in slide-in-from-top">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>{feedbackToast}</span>
            </div>
            <button onClick={() => setFeedbackToast(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Status Progress Summary Card */}
          <div className="bg-gradient-to-br from-slate-50 to-emerald-50/50 p-5 rounded-3xl border border-emerald-100/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1.5 text-center sm:text-right w-full sm:w-auto">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-bold text-slate-500">حالة رصد فصول المدرسة اليوم:</span>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2 py-0.5 rounded-md border border-emerald-200">
                  {stats.submittedCount} من {stats.totalClasses} فصل
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 font-brand">
                {pendingClasses.length === 0 ? (
                  <span className="text-emerald-700 flex items-center justify-center sm:justify-start gap-1.5">
                    <CheckCircle2 className="w-6 h-6" />
                    <span>تم اكتمال رصد كافة الفصول بنجاح 100%</span>
                  </span>
                ) : (
                  <span className="text-amber-700 flex items-center justify-center sm:justify-start gap-1.5">
                    <Clock className="w-6 h-6 text-amber-600" />
                    <span>متبقي {pendingClasses.length} فصول بانتظار الاعتماد</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                نافذة الرصد المعتمدة: ({settings.period2StartTime} ص - {settings.period2EndTime} ص)
              </p>
            </div>

            {/* Quick Broadcast Actions */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
              <button
                type="button"
                onClick={handleBroadcastAllPending}
                disabled={pendingClasses.length === 0}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md ${
                  pendingClasses.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 shadow-amber-500/20'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>إرسال تنبيه نظام فوري للجميع 🔔</span>
              </button>

              <button
                type="button"
                onClick={handleCopyGroupText}
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                {copiedGroupMessage ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-600" />}
                <span>{copiedGroupMessage ? 'تم النسخ بنجاح ✓' : 'نسخ رسالة لقروب الواتساب 📋'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenGroupWhatsApp}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-700/20"
                title="فتح تطبيق واتساب وإرسال النص المجهز لقروب المعلمين"
              >
                <MessageSquare className="w-4 h-4" />
                <span>واتساب القروب</span>
              </button>
            </div>
          </div>

          {/* Pending Teachers Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                <h4 className="text-sm font-black text-slate-900">
                  الفصول والمعلمون بانتظار الرصد ({pendingClasses.length})
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">
                يمكنك التذكير المباشر لكل معلم عبر واتساب أو إشعار النظام
              </span>
            </div>

            {pendingClasses.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50/50 rounded-3xl border border-emerald-100 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h5 className="text-sm font-bold text-emerald-950">جميع المعلمين قاموا باعتماد الغياب!</h5>
                <p className="text-xs text-emerald-700">لا يوجد أي فصل متأخر عن رصد غياب الحصة الثانية لهذا اليوم.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {pendingClasses.map(cls => {
                  const teacherObj = users.find(u => u.id === cls.teacherId || u.name === cls.teacherName);
                  const reminderInfo = reminderStatusMap[cls.id];
                  const hasReminder = !!reminderInfo;

                  return (
                    <div 
                      key={cls.id}
                      className="bg-white p-4 rounded-2xl border border-amber-200/90 shadow-sm hover:border-amber-400 transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0">
                            {cls.shortName}
                          </div>
                          <div>
                            <h5 className="text-xs font-black text-slate-900">{cls.name}</h5>
                            <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mt-0.5">
                              <Users className="w-3 h-3 text-slate-400" />
                              <span>المعلم: {cls.teacherName}</span>
                            </div>
                            {teacherObj?.phone && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5 text-emerald-600" />
                                <span>{teacherObj.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200 shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>قيد الانتظار</span>
                        </span>
                      </div>

                      {/* Reminder status badge if sent */}
                      {hasReminder && (
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-600 flex items-center justify-between">
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>تم إرسال تذكير ({reminderInfo.channel === 'whatsapp' ? 'واتساب' : 'نظام'})</span>
                          </span>
                          <span className="text-slate-400 font-mono">
                            {new Date(reminderInfo.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenTeacherWhatsApp(cls)}
                          className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1"
                          title="إرسال رسالة تذكير مخصصة للمعلم عبر الواتساب"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>واتساب</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendSystemReminder(cls)}
                          className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1"
                          title="إرسال إشعار تنبيه داخلي في المنظومة للمعلم"
                        >
                          <Bell className="w-3.5 h-3.5 text-amber-600" />
                          <span>تنبيه نظام</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenClassSheet(cls.id);
                          }}
                          className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1"
                          title="الدخول ورصد غياب الفصل نيابة عن المعلم"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>رصد نيابة</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Completed Classes Section */}
          {completedClasses.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-sm font-black text-slate-900">
                    الفصول المعتمدة اليوم ({completedClasses.length})
                  </h4>
                </div>
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  تم الرصد بنجاح
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {completedClasses.map(cls => (
                  <div
                    key={cls.id}
                    className="p-3 bg-emerald-50/40 border border-emerald-200/70 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center">
                        {cls.shortName}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{cls.name}</div>
                        <div className="text-[10px] text-slate-500">{cls.teacherName}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                      {cls.submission ? new Date(cls.submission.submittedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : 'معتمد'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            نظام المتابعة الفورية — مدرسة زيد بن ثابت الابتدائية
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition text-xs"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};

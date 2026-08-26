import React, { useState, useEffect } from 'react';
import { AttendanceNotification, AbsentStudentDetail } from '../types';
import { AttendanceService, NOTIFICATION_EVENT } from '../services/attendanceService';
import { 
  Bell, 
  X, 
  Check, 
  Trash2, 
  UserX, 
  FileCheck, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  PlayCircle,
  ExternalLink,
  ChevronLeft,
  Filter,
  CheckCheck
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenClassSheet: (classId: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onOpenClassSheet
}) => {
  const [notifications, setNotifications] = useState<AttendanceNotification[]>(() => AttendanceService.getNotifications());
  const [activeFilter, setActiveFilter] = useState<'all' | 'unexcused' | 'excused' | 'unread'>('all');
  const [selectedNotifId, setSelectedNotifId] = useState<string | null>(null);

  const reloadNotifications = () => {
    setNotifications(AttendanceService.getNotifications());
  };

  useEffect(() => {
    if (isOpen) {
      reloadNotifications();
    }
  }, [isOpen]);

  // Listen for live events
  useEffect(() => {
    const handleEvent = () => {
      reloadNotifications();
    };
    window.addEventListener(NOTIFICATION_EVENT, handleEvent);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handleEvent);
  }, []);

  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    AttendanceService.markAllNotificationsAsRead();
    reloadNotifications();
  };

  const handleClearAll = () => {
    if (window.confirm('هل تريد مسح جميع إشعارات الرصد؟')) {
      AttendanceService.clearNotifications();
      reloadNotifications();
    }
  };

  const handleSimulateNew = () => {
    AttendanceService.simulateTeacherSubmission();
    reloadNotifications();
  };

  const handleSelectNotif = (notif: AttendanceNotification) => {
    if (!notif.read) {
      AttendanceService.markNotificationAsRead(notif.id);
      reloadNotifications();
    }
    setSelectedNotifId(selectedNotifId === notif.id ? null : notif.id);
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'unread') return !n.read;
    if (activeFilter === 'unexcused') return n.absentStudents.some(s => s.status === 'absent');
    if (activeFilter === 'excused') return n.absentStudents.some(s => s.status === 'excused');
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">مركز إشعارات وتنبيهات الرصد الفوري</h3>
                {unreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
                    {unreadCount} جديد
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                متابعة لحظية لاعتمادات كشوف الحصة الثانية وتفاصيل الغياب (المؤكد والمعذر)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              الكل ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('unexcused')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeFilter === 'unexcused'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-rose-700 hover:bg-rose-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>غياب مؤكد</span>
            </button>
            <button
              onClick={() => setActiveFilter('excused')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeFilter === 'excused'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-blue-700 hover:bg-blue-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>غياب معذر</span>
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeFilter === 'unread'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              غير مقروء ({unreadCount})
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateNew}
              className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              title="توليد إشعار رصد افتراضي لاختبار نظام التنبيهات الفورية"
            >
              <PlayCircle className="w-3.5 h-3.5 text-amber-700" />
              <span>محاكاة رصد جديد 🔔</span>
            </button>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>تحديد كمقروء</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-1.5 rounded-xl bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition"
                title="مسح السجل"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications List Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Bell className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-700 text-base">لا توجد إشعارات حالياً</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                ستظهر هنا التنبيهات اللحظية فور اعتماد المعلمين لكشوف غياب الحصة الثانية، مع تفصيل حالات الغياب.
              </p>
              <button
                onClick={handleSimulateNew}
                className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2"
              >
                <PlayCircle className="w-4 h-4" />
                <span>تجربة محاكاة رصد معلم الآن</span>
              </button>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const unexcused = notif.absentStudents.filter(s => s.status === 'absent');
              const excused = notif.absentStudents.filter(s => s.status === 'excused');
              const late = notif.absentStudents.filter(s => s.status === 'late');
              const isSelected = selectedNotifId === notif.id;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleSelectNotif(notif)}
                  className={`p-4 rounded-2xl border transition cursor-pointer ${
                    !notif.read 
                      ? 'bg-emerald-50/40 border-emerald-200 ring-1 ring-emerald-500/20' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                        unexcused.length > 0
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : excused.length > 0
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}>
                        {unexcused.length > 0 ? (
                          <UserX className="w-5 h-5" />
                        ) : excused.length > 0 ? (
                          <FileCheck className="w-5 h-5" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">
                            {notif.className}
                          </span>
                          <span className="text-slate-400 text-xs">•</span>
                          <span className="text-xs font-semibold text-slate-600">
                            {notif.teacherName}
                          </span>
                          {!notif.read && (
                            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.2 rounded-full">
                              جديد
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(notif.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>التاريخ: {notif.date}</span>
                        </div>

                        {/* Counts Pills */}
                        <div className="flex items-center gap-2 mt-2.5 flex-wrap text-xs">
                          {unexcused.length > 0 && (
                            <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-0.5 rounded-lg border border-rose-200 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-rose-600" />
                              <span>غياب مؤكد: {unexcused.length}</span>
                            </span>
                          )}

                          {excused.length > 0 && (
                            <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-lg border border-blue-200 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-blue-600" />
                              <span>غياب معذر: {excused.length}</span>
                            </span>
                          )}

                          {late.length > 0 && (
                            <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-600" />
                              <span>تأخر: {late.length}</span>
                            </span>
                          )}

                          <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-lg">
                            حاضر: {notif.presentCount} / {notif.totalStudents}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenClassSheet(notif.classId);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-xs font-bold flex items-center gap-1 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">فتح الكشف</span>
                    </button>
                  </div>

                  {/* Student Details Breakdown */}
                  {notif.absentStudents.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                      {unexcused.map((st, idx) => (
                        <div key={`u-${idx}`} className="bg-rose-50/80 p-2 rounded-xl border border-rose-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-rose-900">{st.studentName}</span>
                            <span className="text-rose-700 text-[11px] mr-2">({st.reason || 'بدون عذر'})</span>
                          </div>
                          <span className="bg-rose-200 text-rose-900 text-[10px] font-black px-2 py-0.5 rounded-md">
                            غياب مؤكد
                          </span>
                        </div>
                      ))}

                      {excused.map((st, idx) => (
                        <div key={`e-${idx}`} className="bg-blue-50/80 p-2 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-blue-900">{st.studentName}</span>
                            <span className="text-blue-700 text-[11px] mr-2">({st.reason || 'عذر معتمد'})</span>
                          </div>
                          <span className="bg-blue-200 text-blue-900 text-[10px] font-black px-2 py-0.5 rounded-md">
                            غياب معذر
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>يتم تحديث الإشعارات تلقائياً وفورياً عند حفظ أي معلم لكشف الحصة</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};

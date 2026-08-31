import React, { useState, useEffect, useRef } from 'react';
import { AttendanceNotification, AbsentStudentDetail } from '../types';
import { NOTIFICATION_EVENT, AttendanceService } from '../services/attendanceService';
import { 
  Bell, 
  X, 
  UserX, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  FileCheck, 
  ArrowLeft, 
  Sparkles, 
  Volume2, 
  VolumeX,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface ToastNotificationContainerProps {
  isAdmin: boolean;
  onOpenClassSheet?: (classId: string) => void;
  onViewStudentProfile?: (studentId: string) => void;
}

interface ActiveToast {
  id: string;
  notification: AttendanceNotification;
  duration: number;
  expanded: boolean;
}

// Gentle Web Audio Synth Chime
function playChimeSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    // First tone (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second tone (G#5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now + 0.12);
    gain2.gain.setValueAtTime(0.1, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);

    // Third tone (B5)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(987.77, now + 0.22);
    gain3.gain.setValueAtTime(0.09, now + 0.22);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.22);
    osc3.stop(now + 0.75);
  } catch (e) {
    // audio context might be blocked prior to user interaction
  }
}

export const ToastNotificationContainer: React.FC<ToastNotificationContainerProps> = ({
  isAdmin,
  onOpenClassSheet,
  onViewStudentProfile
}) => {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Listen for real-time notification events
  useEffect(() => {
    const handleNotification = (e: Event) => {
      const customEvent = e as CustomEvent<AttendanceNotification>;
      if (!customEvent.detail) return;
      const notif = customEvent.detail;

      // Only show popup toasts to admin
      if (!isAdmin) return;

      if (soundEnabled) {
        playChimeSound();
      }

      const toastId = `${notif.id}-${Date.now()}`;
      const newToast: ActiveToast = {
        id: toastId,
        notification: notif,
        duration: 8000, // 8 seconds
        expanded: notif.absentStudents.length > 0
      };

      setToasts(prev => [newToast, ...prev.slice(0, 2)]); // Keep max 3 active toasts

      // Auto-dismiss without interval
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
      }, 8000);
    };

    window.addEventListener(NOTIFICATION_EVENT, handleNotification);
    return () => {
      window.removeEventListener(NOTIFICATION_EVENT, handleNotification);
    };
  }, [isAdmin, soundEnabled]);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toggleExpand = (id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, expanded: !t.expanded } : t));
  };

  if (!isAdmin || toasts.length === 0) return null;

  return (
    <aside 
      aria-label="إشعارات الرصد المباشرة"
      className="fixed top-24 left-4 z-50 flex flex-col gap-3 max-w-md w-[calc(100vw-2rem)] sm:w-[420px] pointer-events-none"
    >
      {toasts.map((toast) => {
        const { notification, expanded } = toast;
        const unexcusedList = notification.absentStudents.filter(s => s.status === 'absent');
        const excusedList = notification.absentStudents.filter(s => s.status === 'excused');
        const lateList = notification.absentStudents.filter(s => s.status === 'late');
        const hasAbsence = unexcusedList.length > 0 || excusedList.length > 0;

        return (
          <div
            key={toast.id}
            className="pointer-events-auto bg-slate-900/95 backdrop-blur-xl text-white rounded-3xl p-4 shadow-2xl border border-slate-700/80 ring-1 ring-white/10 transition-all duration-300 transform animate-in slide-in-from-top-4 fade-in overflow-hidden relative"
          >
            {/* Ambient Background Glow based on absence type */}
            <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-25 ${
              unexcusedList.length > 0 ? 'bg-rose-500' : excusedList.length > 0 ? 'bg-blue-500' : 'bg-emerald-500'
            }`} />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                  unexcusedList.length > 0 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 ring-2 ring-rose-500/20' 
                    : excusedList.length > 0 
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' 
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}>
                  {unexcusedList.length > 0 ? (
                    <UserX className="w-6 h-6 animate-pulse" />
                  ) : excusedList.length > 0 ? (
                    <FileCheck className="w-6 h-6" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
                      رصد الحصة الثانية
                    </span>
                    <span className="text-slate-400 text-[11px] flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(notification.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-100 mt-0.5 flex items-center gap-1.5">
                    <span>{notification.className}</span>
                    <span className="text-slate-500 text-xs font-normal">•</span>
                    <span className="text-xs text-slate-300 font-medium">{notification.teacherName}</span>
                  </h4>
                </div>
              </div>

              {/* Close & Sound Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? 'كتم صوت الإشعارات' : 'تفعيل صوت الإشعارات'}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-xl transition"
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
                </button>
                <button
                  onClick={() => dismissToast(toast.id)}
                  title="إغلاق التنبيه"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Summary Pill Bar */}
            <div className="grid grid-cols-4 gap-1.5 mt-3 relative z-10">
              <div className={`p-2 rounded-xl text-center border ${
                unexcusedList.length > 0 
                  ? 'bg-rose-950/60 border-rose-800/60 text-rose-200 ring-1 ring-rose-500/30' 
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
              }`}>
                <div className="text-[10px] font-semibold text-rose-300">غياب مؤكد</div>
                <div className="text-sm font-black mt-0.5 text-rose-400">{unexcusedList.length}</div>
              </div>

              <div className={`p-2 rounded-xl text-center border ${
                excusedList.length > 0 
                  ? 'bg-blue-950/60 border-blue-800/60 text-blue-200 ring-1 ring-blue-500/30' 
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
              }`}>
                <div className="text-[10px] font-semibold text-blue-300">غياب معذر</div>
                <div className="text-sm font-black mt-0.5 text-blue-400">{excusedList.length}</div>
              </div>

              <div className="p-2 rounded-xl text-center bg-slate-800/60 border border-slate-700/60 text-slate-300">
                <div className="text-[10px] font-semibold text-amber-300">تأخر</div>
                <div className="text-sm font-black mt-0.5 text-amber-400">{lateList.length}</div>
              </div>

              <div className="p-2 rounded-xl text-center bg-slate-800/60 border border-slate-700/60 text-emerald-300">
                <div className="text-[10px] font-semibold text-emerald-400">حاضر</div>
                <div className="text-sm font-black mt-0.5 text-emerald-400">{notification.presentCount}</div>
              </div>
            </div>

            {/* Detailed Absent Students Breakdown */}
            {notification.absentStudents.length > 0 ? (
              <div className="mt-3 relative z-10">
                <button
                  onClick={() => toggleExpand(toast.id)}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-slate-300 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800/50 transition mb-1"
                >
                  <span className="flex items-center gap-1.5">
                    <span>تفاصيل الطلاب الغائبين ({notification.absentStudents.length})</span>
                    {unexcusedList.length > 0 && (
                      <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    )}
                  </span>
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {expanded && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar pr-0.5">
                    {/* Unexcused Absences (غياب مؤكد / بدون عذر) */}
                    {unexcusedList.map((st, idx) => (
                      <div
                        key={`abs-${idx}-${st.studentId}`}
                        className="p-2 rounded-xl bg-rose-950/40 border border-rose-800/50 flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            <span className="font-bold text-rose-100">{st.studentName}</span>
                          </div>
                          <div className="text-[11px] text-rose-300/80 mr-4 mt-0.5 font-medium">
                            {st.reason || 'غياب غير مبرر وبدون عذر مسبق'}
                            {st.notes && ` — ${st.notes}`}
                          </div>
                        </div>
                        <span className="bg-rose-600/30 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-500/40 shrink-0">
                          غياب مؤكد
                        </span>
                      </div>
                    ))}

                    {/* Excused Absences (غياب معذر / بعذر) */}
                    {excusedList.map((st, idx) => (
                      <div
                        key={`exc-${idx}-${st.studentId}`}
                        className="p-2 rounded-xl bg-blue-950/40 border border-blue-800/50 flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                            <span className="font-bold text-blue-100">{st.studentName}</span>
                          </div>
                          <div className="text-[11px] text-blue-300/80 mr-4 mt-0.5 font-medium">
                            {st.reason || 'عذر مقبول ومعتمد'}
                            {st.notes && ` — ${st.notes}`}
                          </div>
                        </div>
                        <span className="bg-blue-600/30 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-500/40 shrink-0">
                          غياب معذر
                        </span>
                      </div>
                    ))}

                    {/* Late Students */}
                    {lateList.map((st, idx) => (
                      <div
                        key={`late-${idx}-${st.studentId}`}
                        className="p-2 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                            <span className="font-bold text-amber-100">{st.studentName}</span>
                          </div>
                          <div className="text-[11px] text-amber-300/80 mr-4 mt-0.5 font-medium">
                            {st.reason || `تأخر ${st.minutesLate || 10} دقائق`}
                          </div>
                        </div>
                        <span className="bg-amber-600/30 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-500/40 shrink-0">
                          تأخر
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2.5 p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-2 text-xs text-emerald-200 relative z-10">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">حضور كامل لجميع طلاب الفصل بنسبة 100% ✨</span>
              </div>
            )}

            {/* Quick Action Footer */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2 relative z-10">
              {onOpenClassSheet && (
                <button
                  onClick={() => {
                    onOpenClassSheet(notification.classId);
                    dismissToast(toast.id);
                  }}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-700/50 hover:bg-emerald-900/80 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح كشف {notification.className}</span>
                </button>
              )}

              <button
                onClick={() => dismissToast(toast.id)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-800 transition"
              >
                تجاهل
              </button>
            </div>

            {/* Auto-dismiss Animated Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/80 overflow-hidden">
              <div
                className={`h-full origin-left transition-all duration-[8000ms] ease-linear ${
                  unexcusedList.length > 0 
                    ? 'bg-rose-500' 
                    : excusedList.length > 0 
                      ? 'bg-blue-500' 
                      : 'bg-emerald-500'
                }`}
                style={{
                  animation: 'shrinkWidth 8s linear forwards'
                }}
              />
            </div>
          </div>
        );
      })}
    </aside>
  );
};

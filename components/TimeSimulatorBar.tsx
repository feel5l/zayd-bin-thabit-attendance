import React from 'react';
import { SchoolSettings } from '../types';
import { AttendanceService } from '../services/attendanceService';
import { Clock, Play, RotateCcw, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface TimeSimulatorBarProps {
  settings: SchoolSettings;
  simulatedTime: string | null;
  onSetSimulatedTime: (time: string | null) => void;
  onUpdateSettings: (newSettings: SchoolSettings) => void;
}

export const TimeSimulatorBar: React.FC<TimeSimulatorBarProps> = ({
  settings,
  simulatedTime,
  onSetSimulatedTime,
  onUpdateSettings
}) => {
  const periodInfo = AttendanceService.isPeriod2Active(settings, simulatedTime || undefined);

  return (
    <div className="bg-slate-900 text-white px-4 py-2.5 shadow-inner border-b border-slate-800 text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Current status display */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-amber-400">
            <Clock className="w-4 h-4" />
            <span>محاكي وقت الحصة الثانية:</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
            <span className="text-slate-300">الوقت الفعلي/المحاكى:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {periodInfo.currentTimeStr}
            </span>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs ${
            periodInfo.isActive 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
          }`}>
            {periodInfo.isActive ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>نافذة رصد الحصة الثانية مفتوحة ({settings.period2StartTime} - {settings.period2EndTime})</span>
                {periodInfo.minutesRemaining !== undefined && (
                  <span className="bg-emerald-500/30 px-1.5 py-0.5 rounded text-[11px]">
                    متبقي {periodInfo.minutesRemaining} دقيقة
                  </span>
                )}
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>خارج وقت الحصة الثانية ({settings.period2StartTime} - {settings.period2EndTime})</span>
              </>
            )}
          </div>
        </div>

        {/* Quick Simulation Presets */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 hidden sm:inline">اختبار سريع:</span>
          
          <button
            onClick={() => onSetSimulatedTime('08:00')}
            className={`px-2.5 py-1 rounded-md transition text-xs font-semibold flex items-center gap-1 ${
              simulatedTime === '08:00' 
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' 
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700'
            }`}
            title="وقت افتراضي داخل الحصة الثانية (08:00 ص)"
          >
            <Play className="w-3 h-3" />
            08:00 ص (داخل الحصة 2)
          </button>

          <button
            onClick={() => onSetSimulatedTime('08:15')}
            className={`px-2.5 py-1 rounded-md transition text-xs font-semibold flex items-center gap-1 ${
              simulatedTime === '08:15' 
                ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' 
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700'
            }`}
            title="وقت افتراضي داخل الحصة الثانية (08:15 ص)"
          >
            <Play className="w-3 h-3" />
            08:15 ص (داخل الحصة 2)
          </button>

          <button
            onClick={() => onSetSimulatedTime('10:30')}
            className={`px-2.5 py-1 rounded-md transition text-xs font-semibold flex items-center gap-1 ${
              simulatedTime === '10:30' 
                ? 'bg-rose-600 text-white ring-2 ring-rose-400' 
                : 'bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700'
            }`}
            title="وقت افتراضي خارج الحصة الثانية (10:30 ص)"
          >
            <Play className="w-3 h-3" />
            10:30 ص (خارج الحصة 2)
          </button>

          {simulatedTime && (
            <button
              onClick={() => onSetSimulatedTime(null)}
              className="px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium flex items-center gap-1 transition"
              title="إعادة للوقت الفعلي للجهاز"
            >
              <RotateCcw className="w-3 h-3" />
              الوقت الفعلي
            </button>
          )}

          {/* Strict Lock Toggle */}
          <button
            onClick={() => onUpdateSettings({
              ...settings,
              lockAttendanceOutsidePeriod: !settings.lockAttendanceOutsidePeriod
            })}
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
              settings.lockAttendanceOutsidePeriod 
                ? 'bg-rose-900/50 text-rose-200 border border-rose-700' 
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
            }`}
            title="تفعيل/تعطيل الإغلاق الصارم لكشف الحضور خارج الحصة الثانية"
          >
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            <span>قفل الإرسال خارج الحصة: {settings.lockAttendanceOutsidePeriod ? 'مفعّل (صارم)' : 'مرن (للمدير فقط)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { User, SchoolClass, ClassAttendanceSubmission } from '../types';
import { AttendanceService } from '../services/attendanceService';
import { 
  FileText, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  Printer, 
  Users,
  Search,
  ChevronLeft
} from 'lucide-react';

interface ClassHistoryViewerProps {
  currentUser: User;
  onOpenSubmissionModal?: (submission: ClassAttendanceSubmission) => void;
}

export const ClassHistoryViewer: React.FC<ClassHistoryViewerProps> = ({
  currentUser,
  onOpenSubmissionModal
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(currentUser.assignedClassId || '4-A');
  const [selectedSubmission, setSelectedSubmission] = useState<ClassAttendanceSubmission | null>(null);

  const classes = AttendanceService.getClasses();
  const allSubmissions = AttendanceService.getSubmissions();

  const classSubmissions = allSubmissions.filter(s => {
    if (currentUser.role === 'teacher') {
      return s.classId === (currentUser.assignedClassId || selectedClassId);
    }
    return s.classId === selectedClassId;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black font-brand text-slate-900">سجل كشوفات الحضور التاريخية</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            استعراض كشوفات غياب الحصة الثانية السابقة وتفاصيل الرصد لكل يوم
          </p>
        </div>

        {currentUser.role === 'admin' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">الفصل:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Submissions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classSubmissions.length === 0 ? (
          <div className="col-span-3 text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">لا توجد كشوفات سابقة مسجلة لهذا الفصل</p>
          </div>
        ) : (
          classSubmissions.map(sub => (
            <div
              key={sub.id}
              className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:border-emerald-300 transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span className="font-black text-xs text-slate-900">
                    {new Date(sub.date).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' })}
                  </span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  الحصة 2
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="block text-[10px] text-emerald-600 font-bold">حضور</span>
                  <span className="font-black text-emerald-700">{sub.presentCount}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-rose-600 font-bold">غياب</span>
                  <span className="font-black text-rose-700">{sub.absentCount}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-blue-600 font-bold">بعذر</span>
                  <span className="font-black text-blue-700">{sub.excusedCount}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 font-semibold flex items-center justify-between pt-1">
                <span>المعلم: {sub.teacherName}</span>
                <span>{new Date(sub.submittedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <button
                onClick={() => setSelectedSubmission(sub)}
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>عرض تفاصيل الكشف</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black font-brand">كشف الحضور: {selectedSubmission.className}</h3>
                <p className="text-xs text-emerald-200">تاريخ: {selectedSubmission.date} — رصد الحصة الثانية</p>
              </div>
              <button onClick={() => setSelectedSubmission(null)} className="text-white text-sm">✕</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-3 text-xs">
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {selectedSubmission.students.map((st, i) => (
                  <div key={i} className="p-3 flex items-center justify-between bg-white hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-slate-400 font-mono text-[10px]">{i + 1}</span>
                      <span className="font-bold text-slate-900">{st.studentName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        st.status === 'present' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : st.status === 'absent' 
                            ? 'bg-rose-100 text-rose-800' 
                            : st.status === 'excused' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-amber-100 text-amber-800'
                      }`}>
                        {st.status === 'present' ? 'حاضر' : st.status === 'absent' ? 'غائب' : st.status === 'excused' ? 'بعذر' : 'متأخر'}
                      </span>
                      {st.reason && (
                        <span className="text-[10px] text-slate-500">({st.reason})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { AbsenceExcuseRequest, User, SchoolSettings } from '../types';
import { AttendanceService } from '../services/attendanceService';
import { getTodayDateString } from '../services/mockData';
import { 
  FileCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus, 
  Search, 
  User as UserIcon, 
  FileText, 
  MessageSquare,
  ShieldCheck,
  Filter
} from 'lucide-react';

interface ExcuseManagerProps {
  currentUser: User;
  settings: SchoolSettings;
}

export const ExcuseManager: React.FC<ExcuseManagerProps> = ({ currentUser, settings }) => {
  const [excuses, setExcuses] = useState<AbsenceExcuseRequest[]>(() => AttendanceService.getExcuses());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New excuse form
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [excuseDate, setExcuseDate] = useState(getTodayDateString());
  const [excuseReason, setExcuseReason] = useState('مرض بعذر طبي معتمد');
  const [parentNotes, setParentNotes] = useState('');

  const students = AttendanceService.getStudents();
  const classes = AttendanceService.getClasses();

  const handleUpdateStatus = (id: string, newStatus: 'approved' | 'rejected', notes?: string) => {
    const excuse = excuses.find(e => e.id === id);
    if (!excuse) return;

    const updated: AbsenceExcuseRequest = {
      ...excuse,
      status: newStatus,
      reviewedBy: currentUser.name,
      reviewNotes: notes || (newStatus === 'approved' ? 'تم قبول العذر واعتماده رسمياً' : 'عذر غير مستوفٍ للشروط')
    };

    AttendanceService.saveExcuse(updated);
    setExcuses(AttendanceService.getExcuses());

    AttendanceService.logAudit({
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      action: `${newStatus === 'approved' ? 'قبول' : 'رفض'} عذر غياب`,
      details: `تم ${newStatus === 'approved' ? 'قبول' : 'رفض'} عذر الطالب: ${excuse.studentName} (${excuse.className})`,
      targetClass: excuse.className,
      type: 'attendance_edit'
    });
  };

  const handleAddExcuse = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    const newExcuse: AbsenceExcuseRequest = {
      id: `exc-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      classId: student.classId,
      className: student.className,
      date: excuseDate,
      reason: excuseReason,
      parentNotes: parentNotes || 'عذر مسجل عبر إدارة المدرسة',
      parentPhone: student.parentPhone,
      status: 'approved',
      submittedAt: new Date().toISOString(),
      reviewedBy: currentUser.name,
      reviewNotes: 'تم الاعتماد المباشر من إدارة المدرسة'
    };

    AttendanceService.saveExcuse(newExcuse);
    setExcuses(AttendanceService.getExcuses());
    setShowAddModal(false);
    setSelectedStudentId('');
    setParentNotes('');
  };

  const filteredExcuses = excuses.filter(exc => {
    const matchesSearch = exc.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || exc.reason.includes(searchQuery);
    if (!matchesSearch) return false;
    if (statusFilter !== 'all' && exc.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black font-brand text-slate-900">إدارة أعذار وغياب الطلاب</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            مراجعة واعتماد الأعذار الطبية والرسمية المقدمة من أولياء الأمور وربطها بسجل الغياب
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-700/20 transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل عذر جديد لطالب</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الطالب أو سبب العذر..."
            className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            الكل ({excuses.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl transition ${statusFilter === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700'}`}
          >
            قيد الانتظار ({excuses.filter(e => e.status === 'pending').length})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-xl transition ${statusFilter === 'approved' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700'}`}
          >
            مقبول ({excuses.filter(e => e.status === 'approved').length})
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-xl transition ${statusFilter === 'rejected' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-700'}`}
          >
            مرفوض ({excuses.filter(e => e.status === 'rejected').length})
          </button>
        </div>
      </div>

      {/* Excuses Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredExcuses.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">لا توجد طلبات أعذار مطابقة</p>
          </div>
        ) : (
          filteredExcuses.map(excuse => (
            <div
              key={excuse.id}
              className={`p-5 rounded-3xl border transition shadow-sm ${
                excuse.status === 'approved'
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : excuse.status === 'rejected'
                    ? 'bg-rose-50/40 border-rose-200'
                    : 'bg-amber-50/40 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm ${
                    excuse.status === 'approved' ? 'bg-emerald-600 text-white' : excuse.status === 'rejected' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {excuse.studentName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{excuse.studentName}</h4>
                    <p className="text-xs text-slate-500 font-semibold">{excuse.className} — تاريخ: {excuse.date}</p>
                  </div>
                </div>

                <span className={`text-[11px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 border ${
                  excuse.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : excuse.status === 'rejected'
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}>
                  {excuse.status === 'approved' ? 'عذر معتمد ✓' : excuse.status === 'rejected' ? 'مرفوض ✕' : 'بانتظار المراجعة'}
                </span>
              </div>

              <div className="mt-4 p-3 bg-white rounded-2xl border border-slate-100 space-y-2 text-xs">
                <div>
                  <span className="font-bold text-slate-500 text-[11px]">سبب الغياب:</span>
                  <p className="font-black text-slate-800 mt-0.5">{excuse.reason}</p>
                </div>

                {excuse.parentNotes && (
                  <div>
                    <span className="font-bold text-slate-500 text-[11px]">ملاحظات ولي الأمر:</span>
                    <p className="text-slate-600 mt-0.5">{excuse.parentNotes}</p>
                  </div>
                )}

                {excuse.reviewNotes && (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span className="font-bold">المراجع: </span> {excuse.reviewedBy} ({excuse.reviewNotes})
                  </div>
                )}
              </div>

              {/* Action buttons if pending */}
              {excuse.status === 'pending' && (
                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateStatus(excuse.id, 'approved')}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>قبول واعتماد العذر</span>
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(excuse.id, 'rejected')}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>رفض العذر</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Excuse Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 p-5 text-white flex items-center justify-between">
              <h3 className="text-base font-black font-brand">تسجيل عذر غياب لطالب</h3>
              <button onClick={() => setShowAddModal(false)} className="text-white text-sm">✕</button>
            </div>

            <form onSubmit={handleAddExcuse} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اختر الطالب</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="">-- حدد الطالب --</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.className})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ الغياب</label>
                <input
                  type="date"
                  value={excuseDate}
                  onChange={(e) => setExcuseDate(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">سبب العذر</label>
                <select
                  value={excuseReason}
                  onChange={(e) => setExcuseReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="مرض بعذر طبي معتمد">مرض بعذر طبي معتمد</option>
                  <option value="ظرف عائلي طارئ">ظرف عائلي طارئ</option>
                  <option value="إذن مسبق من إدارة المدرسة">إذن مسبق من إدارة المدرسة</option>
                  <option value="مراجعة مستشفى أو مركز صحي">مراجعة مستشفى أو مركز صحي</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ملاحظات العذر والتفاصيل</label>
                <textarea
                  value={parentNotes}
                  onChange={(e) => setParentNotes(e.target.value)}
                  placeholder="رقم التقرير الطبي أو تفاصيل الإذن..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-md shadow-emerald-700/20"
                >
                  حفظ واعتماد العذر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

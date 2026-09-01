import React, { useState, useEffect } from 'react';
import { StudentReferralForm, User, SchoolSettings, SchoolClass } from '../types';
import { AttendanceService, NOTIFICATION_EVENT } from '../services/attendanceService';
import { OFFICIAL_REFERRAL_REASONS } from '../services/initialData';
import { StudentReferralModal } from './StudentReferralModal';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  GraduationCap, 
  UserCheck, 
  Sparkles, 
  Download, 
  Share2, 
  Eye,
  Calendar,
  ChevronRight,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';

interface StudentReferralsManagerProps {
  currentUser: User | null;
  settings: SchoolSettings;
}

export const StudentReferralsManager: React.FC<StudentReferralsManagerProps> = ({
  currentUser,
  settings
}) => {
  const [referrals, setReferrals] = useState<StudentReferralForm[]>(() => AttendanceService.getReferralForms());
  const [classes, setClasses] = useState<SchoolClass[]>(() => AttendanceService.getClasses());
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'resolved'>('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<StudentReferralForm | null>(null);
  const [preselectedStudentId, setPreselectedStudentId] = useState<string | null>(null);

  const reloadData = () => {
    setReferrals(AttendanceService.getReferralForms());
    setClasses(AttendanceService.getClasses());
  };

  useEffect(() => {
    const handleUpdate = () => {
      reloadData();
    };
    window.addEventListener(NOTIFICATION_EVENT, handleUpdate);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handleUpdate);
  }, []);

  const handleOpenNew = (studentId?: string) => {
    setSelectedReferral(null);
    setPreselectedStudentId(studentId || null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (referral: StudentReferralForm) => {
    setSelectedReferral(referral);
    setPreselectedStudentId(referral.studentId);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string, num: string) => {
    if (window.confirm(`هل أنت متأكد من حذف استمارة التحويل رقم [${num}] الخاصة بالطالب: ${name}؟`)) {
      AttendanceService.deleteReferralForm(id, currentUser || undefined);
      reloadData();
    }
  };

  // Filtered referrals
  const filteredReferrals = referrals.filter(r => {
    if (classFilter !== 'all' && r.className !== classFilter && !r.className.includes(classFilter)) {
      return false;
    }
    if (statusFilter !== 'all' && r.status !== statusFilter) {
      return false;
    }
    if (reasonFilter !== 'all') {
      if (!r.reasons.some(res => res.includes(reasonFilter))) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        r.studentName.toLowerCase().includes(q) ||
        r.referralNumber.toLowerCase().includes(q) ||
        r.className.toLowerCase().includes(q) ||
        r.referrerName.toLowerCase().includes(q) ||
        r.problemDescription.toLowerCase().includes(q) ||
        (r.actionTakenByCounselor && r.actionTakenByCounselor.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // KPI Calculations
  const totalCount = referrals.length;
  const pendingCount = referrals.filter(r => r.status === 'pending' || r.status === 'in_progress').length;
  const resolvedCount = referrals.filter(r => r.status === 'resolved').length;

  // Most common reason
  const reasonFrequency: Record<string, number> = {};
  referrals.forEach(r => {
    r.reasons.forEach(reason => {
      reasonFrequency[reason] = (reasonFrequency[reason] || 0) + 1;
    });
  });
  let mostCommonReason = 'لا توجد بيانات';
  let maxReasonCount = 0;
  Object.entries(reasonFrequency).forEach(([reason, count]) => {
    if (count > maxReasonCount) {
      maxReasonCount = count;
      mostCommonReason = reason;
    }
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-900/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <FileText className="w-7 h-7 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-brand font-black text-2xl tracking-tight text-white">
                  استمارات تحويل الطلاب للمرشد الطلابي
                </h1>
                <span className="bg-amber-400 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full shadow-sm">
                  النموذج الوزاري الرسمي
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100 font-bold">
                إدارة ومتابعة وتوثيق حالات الإحالة الإرشادية والسلوكية وطباعة الاستمارات المعتمدة A4
              </p>
            </div>
          </div>
        </div>

        {/* Create Referral CTA */}
        <div className="relative z-10 flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => handleOpenNew()}
            className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 font-black text-xs sm:text-sm rounded-2xl transition shadow-lg shadow-amber-950/20 flex items-center justify-center gap-2 transform active:scale-98"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>+ إنشاء استمارة تحويل جديدة</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Referrals */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">إجمالي استمارات التحويل</span>
            <span className="text-3xl font-black text-slate-900">{totalCount}</span>
            <span className="text-[11px] font-bold text-emerald-600 block mt-1">حالة موثقة بالنظام</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Cases */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">قيد المتابعة والإرشاد</span>
            <span className="text-3xl font-black text-amber-600">{pendingCount}</span>
            <span className="text-[11px] font-bold text-amber-700 block mt-1">بحاجة لجلسات أو متابعة</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Resolved Cases */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">تمت المعالجة والإرشاد</span>
            <span className="text-3xl font-black text-emerald-700">{resolvedCount}</span>
            <span className="text-[11px] font-bold text-emerald-600 block mt-1">تم توثيق الإجراء بنجاح</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Most Frequent Reason */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block mb-1">السبب الأكثر تكراراً</span>
            <span className="text-sm font-black text-purple-900 truncate max-w-[140px] block" title={mostCommonReason}>
              {mostCommonReason}
            </span>
            <span className="text-[11px] font-bold text-purple-700 block mt-1">تكرر ({maxReasonCount}) مرات</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          
          {/* Search Box */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الطالب، رقم الاستمارة، المعلم، المشكلة..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Class Filter */}
          <div className="sm:col-span-3">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">جميع الفصول والشعب</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.name}>{cls.name}</option>
              ))}
            </select>
          </div>

          {/* Reason Filter */}
          <div className="sm:col-span-3">
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">جميع أسباب التحويل</option>
              {OFFICIAL_REFERRAL_REASONS.map(r => (
                <option key={r.id} value={r.label}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">قيد المتابعة ⏳</option>
              <option value="in_progress">جلسات جارية 🔄</option>
              <option value="resolved">تمت المعالجة ✅</option>
            </select>
          </div>
        </div>

        {/* Active Filters summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            عرض <strong className="text-slate-900">{filteredReferrals.length}</strong> من إجمالي{' '}
            <strong className="text-slate-900">{referrals.length}</strong> استمارة تحويل
          </span>
          {(searchQuery || classFilter !== 'all' || statusFilter !== 'all' || reasonFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setClassFilter('all');
                setStatusFilter('all');
                setReasonFilter('all');
              }}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
            >
              إعادة ضبط التصفية ↺
            </button>
          )}
        </div>
      </div>

      {/* Referrals Cards / Table List */}
      {filteredReferrals.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-base">لا توجد استمارات تحويل مطابقة</h3>
            <p className="text-xs text-slate-500 font-bold mt-1">
              لم يتم العثور على أي استمارة تحويل وفق معايير البحث أو التصفية الحالية.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleOpenNew()}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء استمارة تحويل جديدة الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReferrals.map((referral) => {
            const isResolved = referral.status === 'resolved';
            return (
              <div
                key={referral.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between space-y-4 relative overflow-hidden group"
              >
                {/* Top status stripe */}
                <div className={`absolute top-0 right-0 left-0 h-1.5 ${
                  isResolved ? 'bg-emerald-500' : 'bg-amber-400'
                }`} />

                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-sm flex items-center justify-center shadow-xs">
                      {referral.studentName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-sm text-slate-900 hover:text-emerald-700 transition">
                          {referral.studentName}
                        </h3>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          isResolved
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isResolved ? 'تمت المعالجة ✅' : 'قيد المتابعة ⏳'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-0.5">
                        <span>{referral.gradeLevel}</span>
                        <span>•</span>
                        <span>فصل: {referral.className}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-[11px] font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 block">
                      {referral.referralNumber}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 block mt-1">
                      {referral.hijriDate || referral.date}
                    </span>
                  </div>
                </div>

                {/* Reasons Badges */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    أسباب التحويل:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {referral.reasons.map((res, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-bold bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>{res}</span>
                      </span>
                    ))}
                    {referral.otherReasonText && (
                      <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                        {referral.otherReasonText}
                      </span>
                    )}
                  </div>
                </div>

                {/* Problem Clarification Snippet */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-600 mb-1">
                    <span>إيضاح المشكلة:</span>
                    <span className="text-slate-400 font-bold">المحيل: {referral.referrerName}</span>
                  </div>
                  <p className="text-slate-800 line-clamp-2 leading-relaxed">
                    {referral.problemDescription || 'لا يوجد إيضاح مسجل'}
                  </p>
                </div>

                {/* Counselor Action Snippet (if exists) */}
                {referral.actionTakenByCounselor && (
                  <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-200/80 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-black text-emerald-900 mb-1">
                      <span>إجراءات المرشد الطلابي:</span>
                      <span className="text-emerald-700 font-bold">{referral.counselorName || 'التوجيه الطلابي'}</span>
                    </div>
                    <p className="text-emerald-950 line-clamp-2 leading-relaxed font-medium">
                      {referral.actionTakenByCounselor}
                    </p>
                  </div>
                )}

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Official Print Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(referral)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                      title="معاينة وطباعة الاستمارة الرسمية A4"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة الاستمارة</span>
                    </button>

                    {/* Edit / Counselor Follow-up */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(referral)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                      title="تعديل وتحديث إجراءات المرشد"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>متابعة الإجراء</span>
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDelete(referral.id, referral.studentName, referral.referralNumber)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="حذف الاستمارة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Student Referral Modal (Form & Print) */}
      <StudentReferralModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialReferral={selectedReferral}
        preselectedStudentId={preselectedStudentId}
        currentUser={currentUser}
        onSaved={() => {
          reloadData();
        }}
      />
    </div>
  );
};

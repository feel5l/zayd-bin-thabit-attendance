import React, { useState, useEffect } from 'react';
import { Student, User, SchoolSettings, SchoolClass } from '../types';
import { AttendanceService } from '../services/attendanceService';
import { generateAbsenceWarningLetter } from '../services/geminiService';
import { StudentImportModal } from './StudentImportModal';
import { 
  Users, 
  Search, 
  Filter, 
  Phone, 
  FileText, 
  MessageSquare, 
  AlertTriangle, 
  Sparkles, 
  Printer, 
  Calendar, 
  UserCheck, 
  UserX,
  Clock,
  ShieldCheck, 
  ChevronLeft,
  X, 
  Copy, 
  Check,
  Plus,
  Edit3,
  Trash2,
  ArrowRightLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

interface StudentDirectoryProps {
  currentUser: User;
  settings: SchoolSettings;
  onOpenStudentModal?: string | null;
  onCloseStudentModal?: () => void;
  onOpenReferralModal?: (studentId: string) => void;
}

export const StudentDirectory: React.FC<StudentDirectoryProps> = ({
  currentUser,
  settings,
  onOpenStudentModal,
  onCloseStudentModal,
  onOpenReferralModal
}) => {
  const [students, setStudents] = useState<Student[]>(() => AttendanceService.getStudents());
  const [classes, setClasses] = useState<SchoolClass[]>(() => AttendanceService.getClasses());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [filterChronic, setFilterChronic] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [copied, setCopied] = useState(false);

  // Student CRUD Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [transferringStudent, setTransferringStudent] = useState<Student | null>(null);
  const [targetTransferClassId, setTargetTransferClassId] = useState('');

  const [studentFormData, setStudentFormData] = useState({
    id: '',
    name: '',
    studentNumber: '',
    nationalId: '',
    classId: '',
    className: '',
    gradeLevel: 'الصف الرابع الابتدائي',
    parentName: '',
    parentPhone: '05',
    homePhone: '',
    birthDate: '',
    nationality: 'سعودي'
  });

  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const refreshData = () => {
    const updatedStudents = AttendanceService.getStudents();
    const updatedClasses = AttendanceService.getClasses();
    setStudents(updatedStudents);
    setClasses(updatedClasses);

    // If a student is currently selected, refresh their reference
    if (selectedStudent) {
      const refreshed = updatedStudents.find(s => s.id === selectedStudent.id);
      if (refreshed) setSelectedStudent(refreshed);
    }
  };

  // If passed from parent
  useEffect(() => {
    if (onOpenStudentModal) {
      const found = students.find(s => s.id === onOpenStudentModal);
      if (found) setSelectedStudent(found);
    }
  }, [onOpenStudentModal, students]);

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentNumber.includes(searchQuery) ||
      (student.nationalId && student.nationalId.includes(searchQuery)) ||
      student.parentPhone.includes(searchQuery);
    
    if (!matchesSearch) return false;

    if (selectedGrade !== 'all') {
      if (student.gradeLevel !== selectedGrade && !student.gradeLevel.includes(selectedGrade)) return false;
    }
    if (selectedClass !== 'all' && student.classId !== selectedClass) return false;

    if (filterChronic) {
      const history = AttendanceService.getStudentHistory(student.id);
      if (history.absentDays + history.excusedDays < settings.absenceWarningThreshold) return false;
    }

    return true;
  });

  // --- Add Student ---
  const handleOpenAddModal = () => {
    const defaultCls = classes[0];
    setStudentFormData({
      id: `s_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: '',
      studentNumber: `1000${Math.floor(1000 + Math.random() * 9000)}`,
      nationalId: `1${Math.floor(100000000 + Math.random() * 900000000)}`,
      classId: defaultCls ? defaultCls.id : 'c_4_1',
      className: defaultCls ? defaultCls.shortName : 'رابع 1',
      gradeLevel: defaultCls ? defaultCls.gradeLevel : 'الصف الرابع الابتدائي',
      parentName: '',
      parentPhone: '05',
      homePhone: '',
      birthDate: '1436-05-15',
      nationality: 'سعودي'
    });
    setIsAddModalOpen(true);
  };

  // --- Edit Student ---
  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setStudentFormData({
      id: student.id,
      name: student.name,
      studentNumber: student.studentNumber,
      nationalId: student.nationalId || student.studentNumber,
      classId: student.classId,
      className: student.className,
      gradeLevel: student.gradeLevel,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      homePhone: student.homePhone || '',
      birthDate: student.birthDate || '',
      nationality: student.nationality || 'سعودي'
    });
    setIsEditModalOpen(true);
  };

  // --- Quick Transfer Class/Section ---
  const handleOpenTransferModal = (student: Student) => {
    setTransferringStudent(student);
    setTargetTransferClassId(student.classId);
    setIsTransferModalOpen(true);
  };

  const handleSaveTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringStudent || !targetTransferClassId) return;

    if (transferringStudent.classId === targetTransferClassId) {
      showFeedback('الطالب مسجل بالفعل في هذه الشعبة', 'error');
      return;
    }

    const updated = AttendanceService.transferStudent(transferringStudent.id, targetTransferClassId, currentUser);
    if (updated) {
      showFeedback(`تم نقل الطالب ${transferringStudent.name} إلى شعبة (${updated.className}) بنجاح`);
      setIsTransferModalOpen(false);
      setTransferringStudent(null);
      refreshData();
    }
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentFormData.name.trim() || !studentFormData.parentName.trim() || !studentFormData.parentPhone.trim()) {
      showFeedback('يرجى تعبئة الحقول الأساسية: اسم الطالب، اسم ولي الأمر، ورقم الجوال', 'error');
      return;
    }

    const targetCls = classes.find(c => c.id === studentFormData.classId);

    const studentToSave: Student = {
      id: studentFormData.id,
      name: studentFormData.name.trim(),
      studentNumber: studentFormData.studentNumber.trim(),
      nationalId: studentFormData.nationalId.trim(),
      classId: studentFormData.classId,
      className: targetCls ? targetCls.shortName : studentFormData.className,
      gradeLevel: targetCls ? targetCls.gradeLevel : studentFormData.gradeLevel,
      parentName: studentFormData.parentName.trim(),
      parentPhone: studentFormData.parentPhone.trim(),
      homePhone: studentFormData.homePhone ? studentFormData.homePhone.trim() : undefined,
      birthDate: studentFormData.birthDate.trim(),
      nationality: studentFormData.nationality.trim(),
      gender: 'male'
    };

    AttendanceService.saveStudent(studentToSave, currentUser);
    showFeedback(isAddModalOpen ? 'تمت إضافة الطالب بنجاح وتحديث الكشوفات' : 'تم تعديل بيانات الطالب بنجاح');
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setEditingStudent(null);
    refreshData();
  };

  const handleDeleteStudent = (student: Student) => {
    if (confirm(`هل أنت متأكد من حذف الطالب "${student.name}" من السجلات وقوائم الحضور نهائياً؟`)) {
      AttendanceService.deleteStudent(student.id, currentUser);
      showFeedback(`تم حذف الطالب "${student.name}" بنجاح`);
      if (selectedStudent?.id === student.id) {
        setSelectedStudent(null);
      }
      refreshData();
    }
  };

  const handleGenerateWarningLetter = async (student: Student, history: any) => {
    setIsGeneratingLetter(true);
    setGeneratedLetter(null);
    try {
      const letter = await generateAbsenceWarningLetter(
        student.name,
        student.gradeLevel,
        student.className,
        history.absentDays + history.excusedDays,
        settings.schoolName,
        settings.principalName
      );
      setGeneratedLetter(letter);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppContact = (student: Student) => {
    const history = AttendanceService.getStudentHistory(student.id);
    const text = `المكرم ولي أمر الطالب/ ${student.name} المحترم،
السلام عليكم ورحمة الله وبركاته،
تود إدارة ${settings.schoolName} إشعاركم بأن مجموع أيام غياب ابنكم بلغ (${history.absentDays + history.excusedDays}) أيام.
نرجو التواصل مع المدرسة أو تقديم الأعذار المقبولة.
شاكرين تعاونكم.`;
    
    const cleanPhone = student.parentPhone.replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('0') ? `966${cleanPhone.substring(1)}` : cleanPhone;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className={`p-3.5 rounded-2xl text-xs font-bold shadow-md flex items-center justify-between animate-fadeIn ${
          feedback.type === 'success' ? 'bg-emerald-800 text-white' : 'bg-rose-800 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <AlertCircle className="w-4 h-4 text-rose-300" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Filter Controls */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black font-brand text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-700" />
              <span>سجل الطلاب والمواظبة المدرسية ({students.length} طالباً)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              إضافة طلاب جدد، تعديل السجلات، نقل الطلاب بين الشعب، ومتابعة الانضباط المدرسي
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-900 hover:bg-emerald-950 text-white rounded-2xl text-xs font-black transition flex items-center gap-2 shadow-md shadow-emerald-900/20 border border-emerald-700/50"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                <span>استيراد وتوزيع من Excel / CSV</span>
              </button>
            )}

            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-black transition flex items-center gap-2 shadow-md shadow-emerald-700/20"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة طالب جديد</span>
            </button>

            <button
              onClick={() => setFilterChronic(!filterChronic)}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border ${
                filterChronic
                  ? 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-600/20'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>الطلاب الأكثر غياباً (3+ أيام)</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو السجل المدني أو الهاتف..."
              className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          </div>

          <div>
            <select
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setSelectedClass('all');
              }}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
            >
              <option value="all">كافة الصفوف الدراسية (3، 4، 5، 6)</option>
              <option value="الصف الثالث الابتدائي">الصف الثالث الابتدائي</option>
              <option value="الصف الرابع الابتدائي">الصف الرابع الابتدائي</option>
              <option value="الصف الخامس الابتدائي">الصف الخامس الابتدائي</option>
              <option value="الصف السادس الابتدائي">الصف السادس الابتدائي</option>
            </select>
          </div>

          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
            >
              <option value="all">كافة الفصول والشعب الـ 11</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.shortName}) - {c.studentCount} طالب</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">اسم الطالب والسجل</th>
                <th className="p-4">الصف والشعبة</th>
                <th className="p-4">نسبة الانضباط</th>
                <th className="p-4">أيام الغياب</th>
                <th className="p-4">أيام التأخر</th>
                <th className="p-4">ولي الأمر والهاتف</th>
                <th className="p-4 text-center">الإجراءات والتحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                    لا يوجد طلاب يطابقون شروط البحث
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const history = AttendanceService.getStudentHistory(student.id);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 flex items-center gap-1.5">
                              <span>{student.name}</span>
                              {student.nationality && (
                                <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                                  {student.nationality}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              هوية: {student.nationalId || student.studentNumber}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-bold text-slate-700">
                        <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-100">
                          {student.className}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-black ${
                            history.attendancePercentage >= 90 
                              ? 'text-emerald-700' 
                              : history.attendancePercentage >= 80 
                                ? 'text-amber-700' 
                                : 'text-rose-700'
                          }`}>
                            {history.attendancePercentage}%
                          </span>
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                history.attendancePercentage >= 90 
                                  ? 'bg-emerald-500' 
                                  : history.attendancePercentage >= 80 
                                    ? 'bg-amber-500' 
                                    : 'bg-rose-500'
                              }`}
                              style={{ width: `${history.attendancePercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        {history.absentDays + history.excusedDays > 0 ? (
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-rose-600">
                              {history.absentDays} بدون عذر
                            </span>
                            {history.excusedDays > 0 && (
                              <span className="text-blue-600 font-bold text-[11px]">
                                (+ {history.excusedDays} بعذر)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-bold">حضور كامل ✓</span>
                        )}
                      </td>

                      <td className="p-4">
                        {history.lateDays > 0 ? (
                          <span className="text-amber-600 font-bold">{history.lateDays} مرات</span>
                        ) : (
                          <span className="text-slate-400 font-semibold">0</span>
                        )}
                      </td>

                      <td className="p-4">
                        <div>
                          <div className="text-slate-900 font-bold">{student.parentName}</div>
                          <a href={`tel:${student.parentPhone}`} className="text-emerald-700 hover:underline font-mono text-[11px]">
                            {student.parentPhone}
                          </a>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Profile details */}
                          <button
                            onClick={() => {
                              setSelectedStudent(student);
                              setGeneratedLetter(null);
                            }}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold transition flex items-center gap-1 shadow-sm"
                            title="عرض الملف والسجل التراكمي"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            <span>الملف</span>
                          </button>

                          {/* Student Referral to Counselor Button */}
                          {onOpenReferralModal && (
                            <button
                              onClick={() => onOpenReferralModal(student.id)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl transition shadow-sm"
                              title="استمارة تحويل الطالب للمرشد الطلابي"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-700" />
                            </button>
                          )}

                          {/* Quick Section Transfer */}
                          <button
                            onClick={() => handleOpenTransferModal(student)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition shadow-sm"
                            title="نقل الطالب إلى شعبة أخرى"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-slate-700" />
                          </button>

                          {/* Edit Student */}
                          <button
                            onClick={() => handleOpenEditModal(student)}
                            className="p-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-xl transition shadow-sm"
                            title="تعديل أي معلومة للطالب"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* WhatsApp */}
                          <button
                            onClick={() => handleWhatsAppContact(student)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition shadow-sm"
                            title="مراسلة ولي الأمر واتساب"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Student */}
                          <button
                            onClick={() => handleDeleteStudent(student)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                            title="حذف الطالب من السجل"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- ADD STUDENT MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between">
              <h3 className="font-black text-base font-brand flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-300" />
                <span>إضافة طالب جديد لسجلات {settings.schoolName}</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الطالب الرباعي الكامل *</label>
                <input
                  type="text"
                  required
                  value={studentFormData.name}
                  onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })}
                  placeholder="مثال: يوسف بن إبراهيم بن فهد السبيعي"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الهوية الوطنية / الإقامة *</label>
                  <input
                    type="text"
                    required
                    value={studentFormData.nationalId}
                    onChange={(e) => setStudentFormData({ ...studentFormData, nationalId: e.target.value })}
                    placeholder="10 أرقام"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الرقم الأكاديمي</label>
                  <input
                    type="text"
                    value={studentFormData.studentNumber}
                    onChange={(e) => setStudentFormData({ ...studentFormData, studentNumber: e.target.value })}
                    placeholder="الرقم الأكاديمي"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الجنسية</label>
                  <input
                    type="text"
                    value={studentFormData.nationality}
                    onChange={(e) => setStudentFormData({ ...studentFormData, nationality: e.target.value })}
                    placeholder="سعودي"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الفصل والشعبة المسند إليها *</label>
                  <select
                    value={studentFormData.classId}
                    onChange={(e) => {
                      const selected = classes.find(c => c.id === e.target.value);
                      setStudentFormData({
                        ...studentFormData,
                        classId: e.target.value,
                        className: selected ? selected.shortName : '',
                        gradeLevel: selected ? selected.gradeLevel : ''
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.shortName}) - {c.teacherName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ الميلاد</label>
                  <input
                    type="text"
                    value={studentFormData.birthDate}
                    onChange={(e) => setStudentFormData({ ...studentFormData, birthDate: e.target.value })}
                    placeholder="مثال: 1436-05-15 أو 2015-03-05"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-black text-slate-800 mb-2">بيانات ولي الأمر والاتصال</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block font-bold text-slate-700 mb-1">اسم ولي الأمر *</label>
                    <input
                      type="text"
                      required
                      value={studentFormData.parentName}
                      onChange={(e) => setStudentFormData({ ...studentFormData, parentName: e.target.value })}
                      placeholder="اسم ولي الأمر"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">جوال ولي الأمر (واتساب) *</label>
                    <input
                      type="tel"
                      required
                      value={studentFormData.parentPhone}
                      onChange={(e) => setStudentFormData({ ...studentFormData, parentPhone: e.target.value })}
                      placeholder="05xxxxxxxx"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">هاتف المنزل (اختياري)</label>
                    <input
                      type="tel"
                      value={studentFormData.homePhone}
                      onChange={(e) => setStudentFormData({ ...studentFormData, homePhone: e.target.value })}
                      placeholder="011xxxxxxx"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-700/20"
                >
                  <Save className="w-4 h-4" />
                  <span>إضافة وتثبيت الطالب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT STUDENT MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between">
              <h3 className="font-black text-base font-brand flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-300" />
                <span>تعديل بيانات الطالب: {editingStudent?.name}</span>
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم الطالب الرباعي الكامل *</label>
                <input
                  type="text"
                  required
                  value={studentFormData.name}
                  onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">رقم الهوية الوطنية / الإقامة</label>
                  <input
                    type="text"
                    required
                    value={studentFormData.nationalId}
                    onChange={(e) => setStudentFormData({ ...studentFormData, nationalId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الرقم الأكاديمي</label>
                  <input
                    type="text"
                    value={studentFormData.studentNumber}
                    onChange={(e) => setStudentFormData({ ...studentFormData, studentNumber: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الجنسية</label>
                  <input
                    type="text"
                    value={studentFormData.nationality}
                    onChange={(e) => setStudentFormData({ ...studentFormData, nationality: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الفصل والشعبة (تغيير الشعبة) *</label>
                  <select
                    value={studentFormData.classId}
                    onChange={(e) => {
                      const selected = classes.find(c => c.id === e.target.value);
                      setStudentFormData({
                        ...studentFormData,
                        classId: e.target.value,
                        className: selected ? selected.shortName : '',
                        gradeLevel: selected ? selected.gradeLevel : ''
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.shortName}) - {c.teacherName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ الميلاد</label>
                  <input
                    type="text"
                    value={studentFormData.birthDate}
                    onChange={(e) => setStudentFormData({ ...studentFormData, birthDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-black text-slate-800 mb-2">بيانات ولي الأمر والاتصال</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">اسم ولي الأمر *</label>
                    <input
                      type="text"
                      required
                      value={studentFormData.parentName}
                      onChange={(e) => setStudentFormData({ ...studentFormData, parentName: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">جوال ولي الأمر *</label>
                    <input
                      type="tel"
                      required
                      value={studentFormData.parentPhone}
                      onChange={(e) => setStudentFormData({ ...studentFormData, parentPhone: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-emerald-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">هاتف المنزل</label>
                    <input
                      type="tel"
                      value={studentFormData.homePhone}
                      onChange={(e) => setStudentFormData({ ...studentFormData, homePhone: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-700/20"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- QUICK TRANSFER CLASS MODAL --- */}
      {isTransferModalOpen && transferringStudent && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between">
              <h3 className="font-black text-base font-brand flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-300" />
                <span>نقل الطالب إلى شعبة / فصل آخر</span>
              </h3>
              <button onClick={() => setIsTransferModalOpen(false)} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransfer} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-slate-500">اسم الطالب:</div>
                <div className="font-black text-sm text-slate-900">{transferringStudent.name}</div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                  <span className="text-slate-500">الشعبة الحالية:</span>
                  <span className="font-bold text-rose-700">{transferringStudent.className} ({transferringStudent.gradeLevel})</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اختر الشعبة الجديدة المراد النقل إليها:</label>
                <select
                  value={targetTransferClassId}
                  onChange={(e) => setTargetTransferClassId(e.target.value)}
                  className="w-full p-3 bg-white border-2 border-emerald-500 rounded-xl font-bold text-slate-900 outline-none text-xs"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.shortName}) — مربي الفصل: {c.teacherName} ({c.studentCount} طالب)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-700/20"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>تأكيد النقل الفوري</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Student Profile Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center font-black text-lg border border-white/20">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black font-brand">{selectedStudent.name}</h3>
                  <p className="text-xs text-emerald-200">{selectedStudent.gradeLevel} — {selectedStudent.className}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleOpenEditModal(selectedStudent);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    if (onCloseStudentModal) onCloseStudentModal();
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {(() => {
                const history = AttendanceService.getStudentHistory(selectedStudent.id);

                return (
                  <>
                    {/* Detailed Student Identity & Parent Information Card */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <span className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-700" />
                          بيانات السجل المدني وولي الأمر
                        </span>
                        <div className="flex items-center gap-2">
                          {selectedStudent.nationality && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {selectedStudent.nationality}
                            </span>
                          )}
                          <button
                            onClick={() => handleOpenTransferModal(selectedStudent)}
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 hover:bg-emerald-100 hover:text-emerald-800 transition flex items-center gap-1"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>تغيير الشعبة</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                        <div>
                          <span className="text-slate-400 block">رقم الهوية / الإقامة</span>
                          <span className="font-mono font-bold text-slate-800 text-xs select-all">
                            {selectedStudent.nationalId || selectedStudent.studentNumber}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block">تاريخ الميلاد</span>
                          <span className="font-medium text-slate-800">
                            {selectedStudent.birthDate || 'غير مسجل'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block">الفصل الدراسي</span>
                          <span className="font-bold text-emerald-800">
                            {selectedStudent.className} ({selectedStudent.gradeLevel})
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block">اسم ولي الأمر</span>
                          <span className="font-bold text-slate-900 truncate block">
                            {selectedStudent.parentName}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block">جوال ولي الأمر</span>
                          <a
                            href={`tel:${selectedStudent.parentPhone}`}
                            className="font-mono font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            {selectedStudent.parentPhone}
                          </a>
                        </div>

                        {selectedStudent.homePhone && (
                          <div>
                            <span className="text-slate-400 block">هاتف المنزل</span>
                            <span className="font-mono text-slate-700">
                              {selectedStudent.homePhone}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats Tiles */}
                    <div className="grid grid-cols-4 gap-3 text-center">
                      <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                        <span className="block text-emerald-600 font-bold text-[11px]">نسبة المواظبة</span>
                        <span className="text-xl font-black text-emerald-700">{history.attendancePercentage}%</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-rose-50 border border-rose-100">
                        <span className="block text-rose-600 font-bold text-[11px]">غياب بدون عذر</span>
                        <span className="text-xl font-black text-rose-700">{history.absentDays}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                        <span className="block text-blue-600 font-bold text-[11px]">غياب بعذر</span>
                        <span className="text-xl font-black text-blue-700">{history.excusedDays}</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
                        <span className="block text-amber-600 font-bold text-[11px]">التأخر الصباحي</span>
                        <span className="text-xl font-black text-amber-700">{history.lateDays}</span>
                      </div>
                    </div>

                    {/* AI Warning Letter Generation Button */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-black text-purple-900">إنشاء خطاب إنذار غياب رسمي ذكي (AI)</div>
                          <div className="text-[11px] text-purple-700 font-medium">
                            صياغة خطاب رسمي معتمد وموجه لولي الأمر متضمن لائحة المواظبة
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {onOpenReferralModal && (
                          <button
                            onClick={() => onOpenReferralModal(selectedStudent.id)}
                            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-sm transition flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>استمارة تحويل للمرشد</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleGenerateWarningLetter(selectedStudent, history)}
                          disabled={isGeneratingLetter}
                          className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                        >
                          {isGeneratingLetter ? (
                            <span>جاري الصياغة...</span>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>توليد الخطاب</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Display Generated Letter if present */}
                    {generatedLetter && (
                      <div className="p-4 bg-white rounded-2xl border border-purple-200 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-purple-900 text-xs">نص الخطاب المقترح:</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyToClipboard(generatedLetter)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1"
                            >
                              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copied ? 'تم النسخ' : 'نسخ النص'}</span>
                            </button>
                            <button
                              onClick={() => window.print()}
                              className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-[11px] font-bold flex items-center gap-1"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>طباعة</span>
                            </button>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed max-h-60 overflow-y-auto">
                          {generatedLetter}
                        </div>
                      </div>
                    )}

                    {/* Timeline of attendance records */}
                    <div>
                      <h4 className="font-black text-slate-900 text-sm mb-3">سجل الغياب والتأخر التاريخي</h4>
                      <div className="space-y-2">
                        {history.history.length === 0 ? (
                          <div className="text-center py-6 bg-slate-50 rounded-2xl text-slate-400 font-bold">
                            لا توجد سجلات غياب سابقة لهذا الطالب (حضور كامل)
                          </div>
                        ) : (
                          history.history.map((rec, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                                  rec.status === 'absent' ? 'bg-rose-100 text-rose-700' : rec.status === 'excused' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {rec.status === 'absent' ? 'غ' : rec.status === 'excused' ? 'ع' : 'ت'}
                                </span>
                                <div>
                                  <div className="font-black text-slate-800">
                                    {rec.status === 'absent' ? 'غياب بدون عذر' : rec.status === 'excused' ? 'غياب بعذر معتمد' : 'تأخر عن الحصة'}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    تاريخ: {rec.date} — معلم الفصل: {rec.teacherName}
                                  </div>
                                </div>
                              </div>

                              {rec.reason && (
                                <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-bold text-slate-600 text-[11px]">
                                  {rec.reason}
                                </span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Student Import and Distribution Modal */}
      {isImportModalOpen && (
        <StudentImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          currentUser={currentUser}
          onSuccess={() => {
            refreshData();
            showFeedback('تم استيراد قائمة الطلاب وتوزيعهم على الفصول بنجاح', 'success');
          }}
        />
      )}
    </div>
  );
};

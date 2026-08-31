import React, { useState } from 'react';
import { User, SchoolClass, SchoolSettings } from '../types';
import { AttendanceService } from '../services/attendanceService';
import { StudentImportModal } from './StudentImportModal';
import { Period2AssignmentScheduleTable } from './Period2AssignmentScheduleTable';
import { 
  Users, 
  GraduationCap, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Phone, 
  BookOpen, 
  DoorOpen, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Save, 
  UserCheck, 
  ShieldCheck, 
  Sparkles,
  Layers,
  ChevronLeft,
  KeyRound,
  FileSpreadsheet,
  CalendarDays
} from 'lucide-react';

interface TeacherAndClassManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  settings: SchoolSettings;
  onDataChanged?: () => void;
}

export const TeacherAndClassManagerModal: React.FC<TeacherAndClassManagerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  onDataChanged
}) => {
  const [activeTab, setActiveTab] = useState<'teachers' | 'classes' | 'period2_schedule'>('period2_schedule');
  const [searchQuery, setSearchQuery] = useState('');

  
  // Teachers state
  const [teachers, setTeachers] = useState<User[]>(() => AttendanceService.getUsers());
  const [selectedTeacher, setSelectedTeacher] = useState<User | null>(null);
  const [isEditingTeacher, setIsEditingTeacher] = useState(false);
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);
  const [teacherFormData, setTeacherFormData] = useState({
    id: '',
    sequenceNumber: 0,
    name: '',
    nationalId: '',
    email: '',
    username: '',
    role: 'teacher' as 'admin' | 'teacher',
    assignedClassId: '',
    phone: '',
    subject: ''
  });

  // Classes state
  const [classes, setClasses] = useState<SchoolClass[]>(() => AttendanceService.getClasses());
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [classFormData, setClassFormData] = useState({
    id: '',
    name: '',
    shortName: '',
    gradeLevel: 'الصف الرابع الابتدائي',
    section: '1',
    roomNumber: 'قاعة 101',
    teacherId: '',
    color: 'border-emerald-500'
  });

  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const refreshData = () => {
    setTeachers(AttendanceService.getUsers());
    setClasses(AttendanceService.getClasses());
    if (onDataChanged) onDataChanged();
  };

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // --- Teacher Handlers ---
  const handleOpenAddTeacher = () => {
    setTeacherFormData({
      id: `u_${Date.now()}`,
      sequenceNumber: teachers.length + 1,
      name: '',
      nationalId: '',
      email: '',
      username: `teacher_${Math.floor(100 + Math.random() * 900)}`,
      role: 'teacher',
      assignedClassId: '',
      phone: '05',
      subject: 'معلم فصل'
    });
    setIsAddingTeacher(true);
    setIsEditingTeacher(false);
  };

  const handleOpenEditTeacher = (teacher: User) => {
    setSelectedTeacher(teacher);
    setTeacherFormData({
      id: teacher.id,
      sequenceNumber: teacher.sequenceNumber || 0,
      name: teacher.name,
      nationalId: teacher.nationalId || '',
      email: teacher.email || '',
      username: teacher.username,
      role: teacher.role,
      assignedClassId: teacher.assignedClassId || '',
      phone: teacher.phone || '',
      subject: teacher.subject || ''
    });
    setIsEditingTeacher(true);
    setIsAddingTeacher(false);
  };

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherFormData.name.trim()) {
      showNotification('يرجى إدخال اسم المعلم الرباعي', 'error');
      return;
    }

    const assignedCls = classes.find(c => c.id === teacherFormData.assignedClassId);

    const updatedTeacher: User = {
      id: teacherFormData.id || `u_${Date.now()}`,
      sequenceNumber: teacherFormData.sequenceNumber || undefined,
      name: teacherFormData.name.trim(),
      nationalId: teacherFormData.nationalId.trim() || undefined,
      email: teacherFormData.email.trim() || undefined,
      username: teacherFormData.username.trim() || `teacher_${Date.now().toString().slice(-4)}`,
      role: teacherFormData.role,
      assignedClassId: teacherFormData.assignedClassId || undefined,
      assignedClassName: assignedCls ? `${assignedCls.gradeLevel} (${assignedCls.section})` : undefined,
      phone: teacherFormData.phone.trim(),
      password: teacherFormData.role === 'admin' ? 'Aa12345' : (teacherFormData.nationalId?.trim() || teacherFormData.phone.trim() || '123456'),
      subject: teacherFormData.subject.trim()
    };

    AttendanceService.saveUser(updatedTeacher, currentUser);
    showNotification(isAddingTeacher ? 'تمت إضافة المعلم بنجاح وتحديث السجلات' : 'تم تعديل بيانات المعلم بنجاح');
    setIsAddingTeacher(false);
    setIsEditingTeacher(false);
    setSelectedTeacher(null);
    refreshData();
  };

  const handleDeleteTeacher = (teacher: User) => {
    if (teacher.id === currentUser.id) {
      showNotification('لا يمكن حذف حسابك الحالي المستخدم في النظام', 'error');
      return;
    }
    if (confirm(`هل أنت متأكد من حذف المعلم "${teacher.name}"؟`)) {
      AttendanceService.deleteUser(teacher.id, currentUser);
      showNotification('تم حذف المعلم بنجاح');
      refreshData();
    }
  };

  // --- Class Handlers ---
  const handleOpenAddClass = () => {
    setClassFormData({
      id: `c_${Date.now()}`,
      name: 'الصف الثالث الابتدائي - شعبة 4',
      shortName: 'ثالث 4',
      gradeLevel: 'الصف الثالث الابتدائي',
      section: '4',
      roomNumber: `قاعة ${Math.floor(100 + Math.random() * 200)}`,
      teacherId: '',
      color: 'border-emerald-500'
    });
    setIsAddingClass(true);
    setIsEditingClass(false);
  };

  const handleOpenEditClass = (cls: SchoolClass) => {
    setSelectedClass(cls);
    setClassFormData({
      id: cls.id,
      name: cls.name,
      shortName: cls.shortName,
      gradeLevel: cls.gradeLevel,
      section: cls.section,
      roomNumber: cls.roomNumber,
      teacherId: cls.teacherId,
      color: cls.color || 'border-emerald-500'
    });
    setIsEditingClass(true);
    setIsAddingClass(false);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classFormData.name.trim() || !classFormData.shortName.trim()) {
      showNotification('يرجى ملء اسم الشعبة والاسم المختصر', 'error');
      return;
    }

    const assignedTeacher = teachers.find(t => t.id === classFormData.teacherId);

    const updatedClass: SchoolClass = {
      id: classFormData.id || `c_${Date.now()}`,
      name: classFormData.name.trim(),
      shortName: classFormData.shortName.trim(),
      gradeLevel: classFormData.gradeLevel,
      section: classFormData.section,
      roomNumber: classFormData.roomNumber.trim(),
      teacherId: classFormData.teacherId,
      teacherName: assignedTeacher ? assignedTeacher.name : 'لم يُحدد مربي الفصل',
      studentCount: selectedClass ? selectedClass.studentCount : 0,
      color: classFormData.color
    };

    AttendanceService.saveClass(updatedClass, currentUser);
    showNotification(isAddingClass ? 'تمت إضافة الشعبة بنجاح' : 'تم تعديل بيانات الشعبة بنجاح');
    setIsAddingClass(false);
    setIsEditingClass(false);
    setSelectedClass(null);
    refreshData();
  };

  const handleDeleteClass = (cls: SchoolClass) => {
    const studentsInClass = AttendanceService.getStudents(cls.id);
    if (studentsInClass.length > 0) {
      if (!confirm(`تنبيه: هذه الشعبة تحتوي على (${studentsInClass.length}) طالباً مسجلاً. هل أنت متأكد من حذف الشعبة؟ سيحتاج الطلاب لنقلهم لشعب أخرى.`)) {
        return;
      }
    } else {
      if (!confirm(`هل أنت متأكد من حذف الشعبة "${cls.name}"؟`)) return;
    }

    AttendanceService.deleteClass(cls.id, currentUser);
    showNotification('تم حذف الشعبة بنجاح');
    refreshData();
  };

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.nationalId && t.nationalId.includes(searchQuery)) ||
    (t.phone && t.phone.includes(searchQuery)) ||
    (t.email && t.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.subject && t.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.assignedClassName && t.assignedClassName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.roomNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <GraduationCap className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black font-brand">
                إدارة الكادر التعليمي والفصول والشعب الدراسية
              </h2>
              <p className="text-xs text-emerald-100/90 font-medium">
                إضافة وتعديل بيانات المعلمين ومربيي الفصول وتعديل قاعات وشعب {settings.schoolName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className={`p-3 text-xs font-bold text-center flex items-center justify-center gap-2 ${
            feedbackMessage.type === 'success' ? 'bg-emerald-100 text-emerald-900 border-b border-emerald-200' : 'bg-rose-100 text-rose-900 border-b border-rose-200'
          }`}>
            {feedbackMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : <AlertCircle className="w-4 h-4 text-rose-700" />}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Tabs Bar & Controls */}
        <div className="p-4 sm:p-6 border-b border-slate-200/80 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-200/80 p-1 rounded-2xl flex-wrap">
            <button
              onClick={() => { setActiveTab('period2_schedule'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                activeTab === 'period2_schedule'
                  ? 'bg-emerald-700 shadow-sm text-white'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>جدول إسناد الحصة الثانية حسب الأيام ⭐</span>
            </button>

            <button
              onClick={() => { setActiveTab('teachers'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'teachers'
                  ? 'bg-white shadow-sm text-emerald-800'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>هيئة المعلمين ({teachers.length})</span>
            </button>

            <button
              onClick={() => { setActiveTab('classes'); setSearchQuery(''); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'classes'
                  ? 'bg-white shadow-sm text-emerald-800'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>الشعب والفصول الدراسية ({classes.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {activeTab !== 'period2_schedule' && (
              <div className="relative flex-1 sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeTab === 'teachers' ? 'بحث باسم المعلم أو المادة...' : 'بحث باسم الشعبة أو القاعة...'}
                  className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
            )}

            {activeTab === 'teachers' ? (
              <button
                onClick={handleOpenAddTeacher}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-700/20 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة معلم جديد</span>
              </button>
            ) : activeTab === 'classes' ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-4 py-2 bg-emerald-900 hover:bg-emerald-950 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-900/20 shrink-0 border border-emerald-700/50"
                  title="استيراد وتوزيع أسماء الطلاب على الفصول والشعب تلقائياً"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                  <span>استيراد وتوزيع الطلاب (Excel) 📥</span>
                </button>
                <button
                  onClick={handleOpenAddClass}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-700/20 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة شعبة جديدة</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* PERIOD 2 SCHEDULE MATRIX TAB */}
          {activeTab === 'period2_schedule' && (
            <Period2AssignmentScheduleTable
              currentUser={currentUser}
              onAssignmentsUpdated={refreshData}
              onShowNotification={showNotification}
            />
          )}

          {/* TEACHERS TAB */}
          {activeTab === 'teachers' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeachers.map((teacher) => {
                  const assignedCls = classes.find(c => c.id === teacher.assignedClassId);
                  const isCur = teacher.id === currentUser.id;

                  return (
                    <div 
                      key={teacher.id}
                      className={`p-4 rounded-2xl border transition bg-white shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-300 hover:shadow-md ${
                        isCur ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm ${
                            teacher.role === 'admin' 
                              ? 'bg-gradient-to-tr from-purple-700 to-indigo-800 text-white' 
                              : 'bg-gradient-to-tr from-emerald-600 to-teal-700 text-white'
                          }`}>
                            {teacher.name.replace(/^(أ\.|د\.|الـ|معلم\s+الصف\s+|مدير\s+)/g, '').substring(0, 2) || (teacher.role === 'admin' ? 'إد' : 'مع')}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-bold text-sm text-slate-900">{teacher.name}</h3>
                              {isCur && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-bold">
                                  أنت
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <BookOpen className="w-3 h-3 text-emerald-600" />
                              <span>{teacher.subject || 'معلم صف'}</span>
                            </p>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          teacher.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {teacher.role === 'admin' ? 'مدير المدرسة' : 'معلم'}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>الفصل المسند:</span>
                          <span className="font-bold text-emerald-800">
                            {assignedCls ? `${assignedCls.name} (${assignedCls.shortName})` : 'لا يوجد فصل مسند'}
                          </span>
                        </div>
                        {teacher.nationalId && (
                          <div className="flex items-center justify-between text-slate-600">
                            <span>السجل المدني (الهوية):</span>
                            <span className="font-mono font-bold text-slate-800">{teacher.nationalId}</span>
                          </div>
                        )}
                        {teacher.phone && (
                          <div className="flex items-center justify-between text-slate-600">
                            <span>رقم الجوال:</span>
                            <span className="font-mono font-bold text-slate-800">{teacher.phone}</span>
                          </div>
                        )}
                        {teacher.email && (
                          <div className="flex items-center justify-between text-slate-600">
                            <span>البريد الإلكتروني:</span>
                            <span className="font-mono text-[11px] text-slate-700 truncate max-w-[160px]">{teacher.email}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-slate-500 text-[11px]">
                          <span>اسم المستخدم:</span>
                          <span className="font-mono font-medium text-slate-700">{teacher.username}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleOpenEditTeacher(teacher)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل البيانات</span>
                        </button>
                        
                        {!isCur && (
                          <button
                            onClick={() => handleDeleteTeacher(teacher)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="حذف المعلم"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CLASSES TAB */}
          {activeTab === 'classes' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClasses.map((cls) => {
                  return (
                    <div 
                      key={cls.id}
                      className="p-4 rounded-2xl border border-slate-200 transition bg-white shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-300 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {cls.gradeLevel}
                          </span>
                          <h3 className="font-black text-base text-slate-900 mt-1">{cls.name}</h3>
                          <p className="text-xs text-slate-500 font-medium">الشعبة الرسمية: {cls.shortName}</p>
                        </div>

                        <div className="text-center bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                          <span className="text-xs font-black text-slate-900 block">{cls.studentCount}</span>
                          <span className="text-[10px] text-slate-500 font-medium">طالب</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="flex items-center gap-1 text-slate-500">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            مربي الفصل:
                          </span>
                          <span className="font-bold text-slate-900">{cls.teacherName}</span>
                        </div>

                        <div className="flex items-center justify-between text-slate-700">
                          <span className="flex items-center gap-1 text-slate-500">
                            <DoorOpen className="w-3.5 h-3.5 text-emerald-600" />
                            مقر القاعة:
                          </span>
                          <span className="font-medium text-slate-800">{cls.roomNumber}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleOpenEditClass(cls)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل الشعبة</span>
                        </button>
                        
                        <button
                          onClick={() => handleDeleteClass(cls)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="حذف الشعبة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 px-6 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            جميع التعديلات على المعلمين والفصول تُحفظ فورياً وتنعكس على جداول الرصد وكشوفات الحضور.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* --- ADD / EDIT TEACHER MODAL --- */}
      {(isAddingTeacher || isEditingTeacher) && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
              <h3 className="font-black text-base font-brand flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-300" />
                {isAddingTeacher ? 'إضافة معلم جديد للنظام' : 'تعديل بيانات المعلم'}
              </h3>
              <button
                onClick={() => { setIsAddingTeacher(false); setIsEditingTeacher(false); }}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الرباعي الكامل للمعلم *</label>
                <input
                  type="text"
                  required
                  value={teacherFormData.name}
                  onChange={(e) => setTeacherFormData({ ...teacherFormData, name: e.target.value })}
                  placeholder="مثال: أ. عبدالله بن محمد الغامدي"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السجل المدني (رقم الهوية)</label>
                  <input
                    type="text"
                    value={teacherFormData.nationalId}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, nationalId: e.target.value })}
                    placeholder="10xxxxxxxx"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={teacherFormData.email}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, email: e.target.value })}
                    placeholder="teacher@example.com"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المادة / التخصص</label>
                  <input
                    type="text"
                    value={teacherFormData.subject}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, subject: e.target.value })}
                    placeholder="مثال: لغتي الجميلة / رياضيات"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الجوال للتواصل</label>
                  <input
                    type="tel"
                    value={teacherFormData.phone}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, phone: e.target.value })}
                    placeholder="05xxxxxxxx"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستخدم للدخول</label>
                  <input
                    type="text"
                    required
                    value={teacherFormData.username}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, username: e.target.value })}
                    placeholder="اسم المستخدم"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الدور والصلاحية</label>
                  <select
                    value={teacherFormData.role}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, role: e.target.value as 'admin' | 'teacher' })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="teacher">معلم ومربي فصل</option>
                    <option value="admin">مدير المدرسة (إدارة كاملة)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">إسناد الفصل ومسؤولية الحصة الثانية</label>
                <select
                  value={teacherFormData.assignedClassId}
                  onChange={(e) => setTeacherFormData({ ...teacherFormData, assignedClassId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="">بدون فصل مسند (معلم مواد عامة)</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.shortName}) - {cls.roomNumber}
                    </option>
                  ))}
                </select>
              </div>

              {/* Password notice */}
              <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-2xl text-xs text-emerald-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                  <span>معلومات كلمة المرور المعتمدة:</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  كلمة مرور المعلم المضاف تُعيّن تلقائياً كـ <strong>رقم جواله المسجل</strong>، بينما كلمة مرور المشرف المسؤول/الإدارة هي <span className="font-mono font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-900">Aa12345</span>.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setIsAddingTeacher(false); setIsEditingTeacher(false); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-700/20"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ البيانات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT CLASS MODAL --- */}
      {(isAddingClass || isEditingClass) && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
              <h3 className="font-black text-base font-brand flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-300" />
                {isAddingClass ? 'إضافة شعبة / فصل دراسي جديد' : 'تعديل بيانات الشعبة'}
              </h3>
              <button
                onClick={() => { setIsAddingClass(false); setIsEditingClass(false); }}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الشعبة الكامل *</label>
                <input
                  type="text"
                  required
                  value={classFormData.name}
                  onChange={(e) => setClassFormData({ ...classFormData, name: e.target.value })}
                  placeholder="مثال: الصف الرابع الابتدائي - شعبة 1"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الصف الدراسي</label>
                  <select
                    value={classFormData.gradeLevel}
                    onChange={(e) => setClassFormData({ ...classFormData, gradeLevel: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="الصف الثالث الابتدائي">الصف الثالث الابتدائي</option>
                    <option value="الصف الرابع الابتدائي">الصف الرابع الابتدائي</option>
                    <option value="الصف الخامس الابتدائي">الصف الخامس الابتدائي</option>
                    <option value="الصف السادس الابتدائي">الصف السادس الابتدائي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم/رمز الشعبة</label>
                  <input
                    type="text"
                    required
                    value={classFormData.section}
                    onChange={(e) => setClassFormData({ ...classFormData, section: e.target.value })}
                    placeholder="مثال: 1 أو 2"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم المختصر</label>
                  <input
                    type="text"
                    required
                    value={classFormData.shortName}
                    onChange={(e) => setClassFormData({ ...classFormData, shortName: e.target.value })}
                    placeholder="مثال: رابع 1"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم أو اسم القاعة</label>
                  <input
                    type="text"
                    value={classFormData.roomNumber}
                    onChange={(e) => setClassFormData({ ...classFormData, roomNumber: e.target.value })}
                    placeholder="قاعة 101"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تعيين مربي الفصل</label>
                  <select
                    value={classFormData.teacherId}
                    onChange={(e) => setClassFormData({ ...classFormData, teacherId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="">لم يُحدد بعد</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => { setIsAddingClass(false); setIsEditingClass(false); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-700/20"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ الشعبة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Import Modal */}
      {isImportModalOpen && (
        <StudentImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          currentUser={currentUser}
          onSuccess={() => {
            refreshData();
            showNotification('تم استيراد قائمة الطلاب وتوزيعهم على الفصول وتحديث السجلات بنجاح', 'success');
          }}
        />
      )}

    </div>
  );
};

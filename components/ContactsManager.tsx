import React, { useState, useEffect, useMemo } from 'react';
import { 
  ContactItem, 
  ContactCategory, 
  ContactsSyncStats, 
  User, 
  SchoolSettings 
} from '../types';
import { ContactsService, CONTACTS_CHANGED_EVENT } from '../services/contactsService';
import { GoogleContactsService } from '../services/googleContactsService';
import { AttendanceService } from '../services/attendanceService';
import { 
  Phone, 
  Mail, 
  Search, 
  Plus, 
  Star, 
  Trash2, 
  Edit3, 
  Filter, 
  ArrowUpDown, 
  RefreshCw, 
  Download, 
  Upload, 
  ExternalLink, 
  MessageCircle, 
  GraduationCap, 
  Users, 
  Building2, 
  HeartHandshake, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Save, 
  Smartphone,
  Copy,
  ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ContactsManagerProps {
  currentUser: User;
  settings: SchoolSettings;
  onOpenStudentProfile?: (studentId: string) => void;
}

type SortOption = 'name-asc' | 'name-desc' | 'recent' | 'favorites' | 'category';

export const ContactsManager: React.FC<ContactsManagerProps> = ({
  currentUser,
  settings,
  onOpenStudentProfile
}) => {
  const [contacts, setContacts] = useState<ContactItem[]>(() => ContactsService.getContacts());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ContactCategory | 'all' | 'favorites'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  
  // Modals & States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // WhatsApp Quick Message Modal
  const [whatsappModalContact, setWhatsappModalContact] = useState<ContactItem | null>(null);
  const [customWaMessage, setCustomWaMessage] = useState('');
  
  // Google Contacts States
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [googleStatusMsg, setGoogleStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  
  // Feedback toast banner
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const loadData = () => {
    setContacts(ContactsService.getContacts());
  };

  useEffect(() => {
    const handleChanged = () => loadData();
    window.addEventListener(CONTACTS_CHANGED_EVENT, handleChanged);
    return () => window.removeEventListener(CONTACTS_CHANGED_EVENT, handleChanged);
  }, []);

  // Check Google Auth Status
  useEffect(() => {
    const unsubscribe = GoogleContactsService.initAuth(
      (user) => setGoogleUserEmail(user.email || 'حساب Google متصل'),
      () => setGoogleUserEmail(null)
    );
    if (GoogleContactsService.isAuthenticated()) {
      setGoogleUserEmail(GoogleContactsService.getCurrentUser()?.email || 'حساب Google متصل');
    }
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Filtered & Sorted Contacts List
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      // Category filter
      if (activeCategory === 'favorites' && !c.isFavorite) return false;
      if (activeCategory !== 'all' && activeCategory !== 'favorites' && c.category !== activeCategory) {
        return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone.includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q) || false;
        const matchRole = c.roleDescription?.toLowerCase().includes(q) || false;
        const matchStudent = c.studentName?.toLowerCase().includes(q) || false;
        const matchClass = c.className?.toLowerCase().includes(q) || false;
        const matchNotes = c.notes?.toLowerCase().includes(q) || false;
        return matchName || matchPhone || matchEmail || matchRole || matchStudent || matchClass || matchNotes;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'favorites') {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return a.name.localeCompare(b.name, 'ar');
      }
      if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name, 'ar');
      }
      if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name, 'ar');
      }
      if (sortBy === 'category') {
        return a.category.localeCompare(b.category);
      }
      if (sortBy === 'recent') {
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      }
      return 0;
    });
  }, [contacts, searchQuery, activeCategory, sortBy]);

  // Statistics
  const stats: ContactsSyncStats = useMemo(() => ContactsService.getStats(), [contacts]);

  // Form State for Adding / Editing
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    category: 'parent' as ContactCategory,
    roleDescription: '',
    studentName: '',
    className: '',
    notes: '',
    isFavorite: false
  });

  const openAddModal = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      category: 'parent',
      roleDescription: '',
      studentName: '',
      className: '',
      notes: '',
      isFavorite: false
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (contact: ContactItem) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      category: contact.category,
      roleDescription: contact.roleDescription || '',
      studentName: contact.studentName || '',
      className: contact.className || '',
      notes: contact.notes || '',
      isFavorite: !!contact.isFavorite
    });
    setIsAddModalOpen(true);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('يرجى إدخال اسم جهة الاتصال');
      return;
    }
    if (!formData.phone.trim()) {
      alert('يرجى إدخال رقم الهاتف / الجوال');
      return;
    }

    if (editingContact) {
      ContactsService.updateContact(editingContact.id, formData, currentUser);
      showToast(`تم تحديث بيانات (${formData.name}) بنجاح`);
    } else {
      ContactsService.addContact(formData, currentUser);
      showToast(`تمت إضافة (${formData.name}) إلى دليل الهاتف بنجاح`);
    }

    setIsAddModalOpen(false);
    loadData();
  };

  const handleDelete = (id: string) => {
    const contact = contacts.find(c => c.id === id);
    if (contact) {
      ContactsService.deleteContact(id, currentUser);
      showToast(`تم حذف جهة الاتصال (${contact.name})`);
      setDeleteConfirmId(null);
      loadData();
    }
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFav = ContactsService.toggleFavorite(id);
    loadData();
    showToast(isFav ? 'تمت الإضافة للمفضلة ⭐' : 'تمت الإزالة من المفضلة');
  };

  const handleCopyPhone = (phone: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast(`تم نسخ الرقم (${phone})`);
  };

  // Sync from School Database (Students + Teachers)
  const handleSyncFromRoster = () => {
    const res = ContactsService.syncFromSchoolRoster(currentUser);
    loadData();
    showToast(`اكتملت المزامنة: تمت إضافة ${res.added} جهة اتصال وتحديث ${res.updated}`);
  };

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const data = filteredContacts.map((c, idx) => ({
      'م': idx + 1,
      'الاسم': c.name,
      'رقم الجوال': c.phone,
      'البريد الإلكتروني': c.email || '-',
      'التصنيف': 
        c.category === 'parent' ? 'ولي أمر' :
        c.category === 'teacher' ? 'معلم' :
        c.category === 'admin' ? 'إدارة مدرسية' :
        c.category === 'medical' ? 'صحي وطوارئ' : 'جهة رسمية',
      'الوصف / الصفة': c.roleDescription || '-',
      'الطالب المرتبط': c.studentName || '-',
      'الفصل': c.className || '-',
      'الملاحظات': c.notes || '-',
      'المفضلة': c.isFavorite ? 'نعم' : 'لا',
      'تاريخ التحديث': new Date(c.lastUpdated).toLocaleDateString('ar-SA')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'دليل جهات الاتصال');
    XLSX.writeFile(wb, `دليل_جهات_الاتصال_${settings.schoolName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('تم تصدير ملف Excel بنجاح');
  };

  // Export VCF / vCard
  const handleExportVCard = () => {
    const vcfData = ContactsService.exportToVCard();
    const blob = new Blob([vcfData], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `جهات_اتصال_مدرسة_زيد_بن_ثابت.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('تم تصدير ملف بطاقات الاتصال (vCard) للهواتف الذكية بنجاح');
  };

  // Google Contacts Connect
  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setGoogleStatusMsg(null);
      const res = await GoogleContactsService.googleSignIn();
      if (res?.user) {
        setGoogleUserEmail(res.user.email || 'حساب Google متصل');
        setGoogleStatusMsg({ text: `تم الاتصال بحساب Google: ${res.user.email}`, type: 'success' });
      }
    } catch (err: any) {
      setGoogleStatusMsg({ text: err.message || 'فشل تسجيل الدخول بحساب Google', type: 'error' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Google Import
  const handleGoogleImport = async () => {
    try {
      setIsGoogleLoading(true);
      setGoogleStatusMsg({ text: 'جاري استيراد جهات الاتصال من Google People API...', type: 'info' });
      const res = await GoogleContactsService.importFromGoogle();
      loadData();
      setGoogleStatusMsg({
        text: `تم استيراد ${res.imported} جهة اتصال جديدة وتحديث ${res.updated} جهة اتصال موجودة.`,
        type: 'success'
      });
      showToast(`تم استيراد ${res.imported} جهة اتصال من Google بنجاح`);
    } catch (err: any) {
      setGoogleStatusMsg({ text: err.message || 'فشل استيراد جهات الاتصال من Google', type: 'error' });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Google Export
  const handleGoogleExport = async () => {
    try {
      setIsGoogleLoading(true);
      setExportProgress({ current: 0, total: filteredContacts.length, name: '' });
      setGoogleStatusMsg({ text: 'جاري تصدير جهات الاتصال إلى Google Contacts...', type: 'info' });
      
      const res = await GoogleContactsService.batchExportToGoogle(filteredContacts, (curr, tot, name) => {
        setExportProgress({ current: curr, total: tot, name });
      });

      loadData();
      setExportProgress(null);
      if (res.failed === 0) {
        setGoogleStatusMsg({
          text: `تم تصدير جميع جهات الاتصال (${res.successful}) بنجاح إلى حساب Google Contacts!`,
          type: 'success'
        });
        showToast(`تم تصدير ${res.successful} جهة اتصال إلى Google`);
      } else {
        setGoogleStatusMsg({
          text: `اكتمل التصدير: نجح ${res.successful} وفشل ${res.failed}.`,
          type: 'info'
        });
      }
    } catch (err: any) {
      setGoogleStatusMsg({ text: err.message || 'فشل تصدير جهات الاتصال إلى Google', type: 'error' });
      setExportProgress(null);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Send WhatsApp Message
  const openWhatsAppModal = (contact: ContactItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setWhatsappModalContact(contact);
    // Prepopulate message based on contact type
    if (contact.category === 'parent' && contact.studentName) {
      setCustomWaMessage(`السلام عليكم ورحمة الله وبركاته،\nالمكرم ولي أمر الطالب/ ${contact.studentName} المحترم (${contact.className || ''})\nتحية طيبة من إدارة ${settings.schoolName}، نود إحاطتكم بـ...`);
    } else if (contact.category === 'teacher') {
      setCustomWaMessage(`السلام عليكم ورحمة الله وبركاته،\nالزميل المعلم الفاضل/ ${contact.name} المحترم\nتحية طيبة من إدارة المدرسة، نود تذكيركم بـ...`);
    } else {
      setCustomWaMessage(`السلام عليكم ورحمة الله وبركاته،\nالمكرم/ ${contact.name} المحترم\nتحية طيبة من إدارة ${settings.schoolName}...`);
    }
  };

  const handleSendWhatsApp = () => {
    if (!whatsappModalContact) return;
    const cleanPhone = whatsappModalContact.phone.replace(/[^0-9]/g, '');
    let formattedPhone = cleanPhone;
    if (formattedPhone.startsWith('05')) {
      formattedPhone = '966' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('5')) {
      formattedPhone = '966' + formattedPhone;
    }
    const encoded = encodeURIComponent(customWaMessage);
    window.open(`https://wa.me/${formattedPhone}?text=${encoded}`, '_blank');
    setWhatsappModalContact(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast feedback banner */}
      {actionNotice && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 z-50 animate-in slide-in-from-bottom-3 border border-emerald-500/30">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Top Hero Banner & Quick Actions */}
      <div className="bg-gradient-to-br from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-400/30 text-emerald-300">
                <Phone className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black font-brand tracking-tight">
                  دليل جهات الاتصال والتواصل المدرسي
                </h1>
                <p className="text-xs text-emerald-200 font-medium">
                  إدارة وحفظ أرقام هواتف وعناوين البريد الإلكتروني لأولياء الأمور والمعلمين والإدارة مع المزامنة المحلية والسحابية
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={openAddModal}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition flex items-center gap-1.5 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة جهة اتصال</span>
            </button>

            <button
              onClick={() => setIsGoogleModalOpen(true)}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl border border-white/20 transition flex items-center gap-1.5 min-h-[44px]"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>مزامنة Google Contacts</span>
            </button>

            <button
              onClick={handleSyncFromRoster}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-emerald-100 font-semibold text-xs rounded-xl border border-white/10 transition flex items-center gap-1.5 min-h-[44px]"
              title="مزامنة تلقائية مع سجل 364 طالب و20 معلم"
            >
              <RefreshCw className="w-4 h-4 text-emerald-300" />
              <span className="hidden sm:inline">مزامنة سجل المدرسة</span>
            </button>

            <div className="relative group">
              <button
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/10 transition flex items-center gap-1.5 min-h-[44px]"
              >
                <Download className="w-4 h-4 text-emerald-300" />
                <span>تصدير</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
              <div className="absolute left-0 mt-1 w-44 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-100 p-1 hidden group-hover:block z-30 animate-in fade-in duration-100">
                <button
                  onClick={handleExportExcel}
                  className="w-full text-right px-3 py-2 text-xs font-bold hover:bg-emerald-50 rounded-lg text-slate-700 hover:text-emerald-800 transition"
                >
                  📊 تصدير ملف Excel (.xlsx)
                </button>
                <button
                  onClick={handleExportVCard}
                  className="w-full text-right px-3 py-2 text-xs font-bold hover:bg-emerald-50 rounded-lg text-slate-700 hover:text-emerald-800 transition"
                >
                  📱 بطاقات الهاتف (vCard .vcf)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-white/10 text-center">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <div className="text-xl sm:text-2xl font-black text-white">{stats.totalContacts}</div>
            <div className="text-[11px] text-emerald-200 font-semibold">إجمالي جهات الاتصال</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <div className="text-xl sm:text-2xl font-black text-amber-300">{stats.parentsCount}</div>
            <div className="text-[11px] text-emerald-200 font-semibold">أولياء الأمور</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <div className="text-xl sm:text-2xl font-black text-teal-300">{stats.teachersCount}</div>
            <div className="text-[11px] text-emerald-200 font-semibold">المعلمين ومنسوبي التدريس</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <div className="text-xl sm:text-2xl font-black text-blue-300">{stats.adminCount}</div>
            <div className="text-[11px] text-emerald-200 font-semibold">الإدارة والوكلاء</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <div className="text-xl sm:text-2xl font-black text-rose-300">{stats.officialCount}</div>
            <div className="text-[11px] text-emerald-200 font-semibold">جهات رسمية وطبية</div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <div className="text-xl sm:text-2xl font-black text-yellow-300">⭐ {stats.favoritesCount}</div>
            <div className="text-[11px] text-emerald-200 font-semibold">المفضلة</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 min-h-[40px] ${
              activeCategory === 'all'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>الكل ({stats.totalContacts})</span>
          </button>

          <button
            onClick={() => setActiveCategory('parent')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 min-h-[40px] ${
              activeCategory === 'parent'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>أولياء الأمور ({stats.parentsCount})</span>
          </button>

          <button
            onClick={() => setActiveCategory('teacher')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 min-h-[40px] ${
              activeCategory === 'teacher'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>المعلمين ({stats.teachersCount})</span>
          </button>

          <button
            onClick={() => setActiveCategory('admin')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 min-h-[40px] ${
              activeCategory === 'admin'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>الإدارة المدرسية ({stats.adminCount})</span>
          </button>

          <button
            onClick={() => setActiveCategory('official')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 min-h-[40px] ${
              activeCategory === 'official'
                ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>جهات رسمية وطبية</span>
          </button>

          <button
            onClick={() => setActiveCategory('favorites')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 min-h-[40px] ${
              activeCategory === 'favorites'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>المفضلة ({stats.favoritesCount})</span>
          </button>
        </div>

        {/* Search Input & Sort Selector */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="البحث بالاسم، رقم الجوال، البريد، اسم الطالب، الفصل الدراسي..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                مسح
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-full sm:w-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">الفرز:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="name-asc">الاسم أبجدياً (أ - ي)</option>
                <option value="name-desc">الاسم أبجدياً (ي - أ)</option>
                <option value="recent">الأحدث تحديثاً</option>
                <option value="favorites">المفضلة أولاً ⭐</option>
                <option value="category">حسب التصنيف</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Contacts Cards Grid */}
      {filteredContacts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map(contact => {
            const categoryBadge = 
              contact.category === 'parent' ? { text: 'ولي أمر', bg: 'bg-amber-50 text-amber-800 border-amber-200' } :
              contact.category === 'teacher' ? { text: 'معلم', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' } :
              contact.category === 'admin' ? { text: 'إدارة', bg: 'bg-blue-50 text-blue-800 border-blue-200' } :
              contact.category === 'medical' ? { text: 'صحي وطوارئ', bg: 'bg-rose-50 text-rose-800 border-rose-200' } :
              { text: 'جهة رسمية', bg: 'bg-slate-100 text-slate-800 border-slate-200' };

            return (
              <div
                key={contact.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition p-5 flex flex-col justify-between space-y-4 relative group"
              >
                {/* Header: Name + Badge + Favorite */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm ${
                        contact.category === 'parent' ? 'bg-amber-100 text-amber-800' :
                        contact.category === 'teacher' ? 'bg-emerald-100 text-emerald-800' :
                        contact.category === 'admin' ? 'bg-blue-100 text-blue-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {contact.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-900 leading-snug">
                            {contact.name}
                          </h3>
                        </div>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border mt-1 ${categoryBadge.bg}`}>
                          {categoryBadge.text}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleToggleFavorite(contact.id, e)}
                      className={`p-2 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center ${
                        contact.isFavorite ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:text-amber-400 hover:bg-slate-50'
                      }`}
                      title={contact.isFavorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                    >
                      <Star className={`w-5 h-5 ${contact.isFavorite ? 'fill-amber-400' : ''}`} />
                    </button>
                  </div>

                  {/* Role / Context Description */}
                  {contact.roleDescription && (
                    <p className="text-xs text-slate-600 mt-2 font-medium bg-slate-50 p-2 rounded-xl border border-slate-100">
                      {contact.roleDescription}
                    </p>
                  )}

                  {/* Contact Info Details */}
                  <div className="mt-3 space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center justify-between gap-2 p-1 rounded-lg hover:bg-slate-50">
                      <div className="flex items-center gap-2 font-mono font-bold text-slate-800">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span dir="ltr">{contact.phone}</span>
                      </div>
                      <button
                        onClick={(e) => handleCopyPhone(contact.phone, contact.id, e)}
                        className="text-[11px] text-slate-400 hover:text-emerald-700 font-semibold flex items-center gap-1"
                        title="نسخ الرقم"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedId === contact.id ? 'تم النسخ' : 'نسخ'}</span>
                      </button>
                    </div>

                    {contact.email && (
                      <div className="flex items-center gap-2 p-1 text-slate-600 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <a href={`mailto:${contact.email}`} className="hover:text-emerald-700 truncate font-mono text-[11px]">
                          {contact.email}
                        </a>
                      </div>
                    )}

                    {contact.studentName && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>الطالب: <strong className="text-slate-800">{contact.studentName}</strong></span>
                        {contact.className && (
                          <span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                            {contact.className}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons (44px touch targets) */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 flex-1">
                    {/* Direct WhatsApp */}
                    <button
                      onClick={(e) => openWhatsAppModal(contact, e)}
                      className="flex-1 py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 min-h-[44px] shadow-sm shadow-emerald-600/20"
                      title="إرسال رسالة واتساب"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>واتساب</span>
                    </button>

                    {/* Direct Call */}
                    <a
                      href={`tel:${contact.phone}`}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition flex items-center justify-center min-h-[44px] min-w-[44px]"
                      title="اتصال هاتفي مباشر"
                    >
                      <Phone className="w-4 h-4 text-emerald-700" />
                    </a>

                    {/* Direct Email */}
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition flex items-center justify-center min-h-[44px] min-w-[44px]"
                        title="إرسال بريد إلكتروني"
                      >
                        <Mail className="w-4 h-4 text-blue-600" />
                      </a>
                    )}
                  </div>

                  {/* Edit and Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(contact)}
                      className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="تعديل بيانات جهة الاتصال"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(contact.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="حذف جهة الاتصال"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">لا توجد جهات اتصال مطابقة</h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            {searchQuery
              ? `لم يتم العثور على نتائج تطابق "${searchQuery}". جرب البحث باسم أو رقم مختلف.`
              : 'دليل الهاتف فارغ حالياً. يمكنك المزامنة مع سجل المدرسة أو إضافة جهة اتصال جديدة.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={handleSyncFromRoster}
              className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition"
            >
              مزامنة سجل المدرسة الآن
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
            >
              إضافة يدوية
            </button>
          </div>
        </div>
      )}

      {/* Modal 1: Add / Edit Contact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  {editingContact ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingContact ? 'تعديل جهة الاتصال' : 'إضافة جهة اتصال جديدة'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    حفظ البيانات في قاعدة البيانات المحلية ودليل المدرسة
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم الكامل <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: أ. عبدالله بن سعد الغامدي"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الجوال / الهاتف <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    placeholder="05xxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    التصنيف <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as ContactCategory })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="parent">ولي أمر طالب</option>
                    <option value="teacher">معلم / كادر تعليمي</option>
                    <option value="admin">إدارة مدرسية / وكيل</option>
                    <option value="medical">جهة صحية / إسعاف</option>
                    <option value="official">جهة رسمية / تعليمية</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    البريد الإلكتروني (اختياري)
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-right"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الصفة أو الوظيفة
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: معلم الرياضيات أو والد الطالب"
                    value={formData.roleDescription}
                    onChange={(e) => setFormData({ ...formData, roleDescription: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {formData.category === 'parent' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      اسم الطالب التابع
                    </label>
                    <input
                      type="text"
                      placeholder="اسم الطالب"
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs text-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      الفصل الدراسي
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: رابع 1"
                      value={formData.className}
                      onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات إضافية
                </label>
                <textarea
                  rows={2}
                  placeholder="أي ملاحظات خاصة بجهة الاتصال..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="favCheck"
                  checked={formData.isFavorite}
                  onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="favCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                  تمييز كجهة اتصال مفضلة ⭐
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-700/20 transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingContact ? 'حفظ التعديلات' : 'إضافة الآن'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Google Contacts Sync Modal */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    مزامنة Google Contacts (People API)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    ربط وتصدير دليل الهاتف المدرسي بحساب Google الخاص بالمدرسة
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGoogleModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Connection Status Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${googleUserEmail ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  <span className="text-xs font-bold text-slate-800">
                    {googleUserEmail ? 'متصل بحساب Google' : 'غير متصل بحساب Google'}
                  </span>
                </div>
                {googleUserEmail ? (
                  <button
                    onClick={async () => {
                      await GoogleContactsService.logout();
                      setGoogleUserEmail(null);
                    }}
                    className="text-[11px] text-rose-600 hover:underline font-bold"
                  >
                    تسجيل الخروج
                  </button>
                ) : (
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                  >
                    تسجيل الدخول
                  </button>
                )}
              </div>

              {googleUserEmail && (
                <div className="text-xs text-slate-600 font-mono bg-white p-2.5 rounded-xl border border-slate-200/80">
                  {googleUserEmail}
                </div>
              )}
            </div>

            {/* Status Message */}
            {googleStatusMsg && (
              <div className={`p-3 rounded-xl text-xs font-bold mb-4 flex items-center gap-2 ${
                googleStatusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                googleStatusMsg.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                {googleStatusMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {googleStatusMsg.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600" />}
                {googleStatusMsg.type === 'info' && <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />}
                <span>{googleStatusMsg.text}</span>
              </div>
            )}

            {/* Export Progress Bar */}
            {exportProgress && (
              <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>جاري تصدير: {exportProgress.name}</span>
                  <span>{exportProgress.current} / {exportProgress.total}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-200" 
                    style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Sync Action Buttons */}
            <div className="space-y-2.5">
              <button
                onClick={handleGoogleExport}
                disabled={!googleUserEmail || isGoogleLoading}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Upload className="w-4 h-4" />
                <span>تصدير جهات اتصال المدرسة ({filteredContacts.length}) إلى Google Contacts</span>
              </button>

              <button
                onClick={handleGoogleImport}
                disabled={!googleUserEmail || isGoogleLoading}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>استيراد جهات الاتصال من حساب Google إلى النظام</span>
              </button>
            </div>

            <div className="mt-5 text-[11px] text-slate-400 text-center leading-relaxed">
              تتم المزامنة عبر Google People API الرسمية وتطبيق بروتوكول OAuth 2.0 المعتمد لحفظ وتحديث جهات الاتصال بأمان تام.
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: WhatsApp Custom Message Modal */}
      {whatsappModalContact && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    مراسلة عبر واتساب
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {whatsappModalContact.name} ({whatsappModalContact.phone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWhatsappModalContact(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Quick Template Buttons */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500">نماذج رسائل سريعة:</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCustomWaMessage(`المكرم ولي أمر الطالب/ ${whatsappModalContact.studentName || whatsappModalContact.name}\nنحيطكم علماً بغياب الطالب عن الحصة الثانية لهذا اليوم دون عذر مسبق. نرجو التواصل مع إدارة المدرسة أو تقديم عذر مقبول.`)}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-[10px] font-bold transition"
                  >
                    ⚠️ إشعار غياب
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomWaMessage(`المكرم ولي أمر الطالب/ ${whatsappModalContact.studentName || whatsappModalContact.name}\nنود الترحيب بكم ودعوتكم لزيارة المدرسة لمتابعة المستوى الدراسي والسلوكي للطالب.`)}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-[10px] font-bold transition"
                  >
                    🤝 دعوة زيارة
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomWaMessage(`المكرم ولي أمر الطالب/ ${whatsappModalContact.studentName || whatsappModalContact.name}\nتتقدم إدارة ${settings.schoolName} بالشكر والتقدير لكم على حرصكم ومتابعتكم لانضباط الطالب وحضوره المتميز.`)}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold transition"
                  >
                    🌟 شكر وتقدير
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">نص الرسالة:</label>
                <textarea
                  rows={4}
                  value={customWaMessage}
                  onChange={(e) => setCustomWaMessage(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWhatsappModalContact(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>إرسال عبر WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">تأكيد حذف جهة الاتصال</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                هل أنت متأكد من رغبتك في حذف جهة الاتصال هذه من دليل الهاتف المدرسي؟
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                تراجع
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-rose-600/20"
              >
                نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

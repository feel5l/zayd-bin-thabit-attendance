import { ContactItem, ContactCategory, ContactsSyncStats, User, Student, GoogleContactPerson } from '../types';
import { AttendanceService } from './attendanceService';
import { INITIAL_USERS } from './initialData';

const CONTACTS_STORAGE_KEY = 'zbt_contacts_prod_v2';
export const CONTACTS_CHANGED_EVENT = 'zbt_contacts_changed_event';

// Initial Official Leadership & Emergency Contacts
const INITIAL_OFFICIAL_CONTACTS: Omit<ContactItem, 'id' | 'lastUpdated'>[] = [
  {
    name: 'أ. زياد العتيبي',
    phone: '',
    email: '',
    category: 'admin',
    roleDescription: 'مدير مدرسة زيد بن ثابت الابتدائية',
    notes: 'المشرف العام على المدرسة ومتابعة رصد الحصة الثانية ولجان الانضباط',
    isFavorite: true
  },
  {
    name: 'أ. محمد الزمامي',
    phone: '',
    email: '',
    category: 'admin',
    roleDescription: 'وكيل المدرسة',
    notes: 'متابعة شؤون الطلاب وكشوفات الحصة الثانية والجداول الدراسية',
    isFavorite: true
  },
  {
    name: 'مركز الرعاية الصحية الأولية (المركز الصحي المدرسي)',
    phone: '937',
    email: 'health.center@moh.gov.sa',
    category: 'medical',
    roleDescription: 'المركز الصحي المعتمد للإجازات المرضية المدرسية',
    notes: 'التحقق من الإجازات المرضية المعتمدة عبر منصة صحة',
    isFavorite: false
  },
  {
    name: 'مكتب التعليم',
    phone: '19996',
    email: 'office.education@moe.gov.sa',
    category: 'official',
    roleDescription: 'مكتب التعليم المشرف على المدرسة',
    notes: 'البلاغات والتعاميم الوزارية الرسمية',
    isFavorite: false
  },
  {
    name: 'الدفاع المدني (طوارئ السلامة المدرسية)',
    phone: '998',
    category: 'official',
    roleDescription: 'إدارة السلامة والطوارئ',
    notes: 'طوارئ الإخلاء ومتابعة وسائل السلامة بالمبنى المدرسي',
    isFavorite: false
  },
  {
    name: 'الهلال الأحمر السعودي',
    phone: '997',
    category: 'medical',
    roleDescription: 'الإسعاف والطوارئ الطبية',
    notes: 'حالات الطوارئ الصحية للطلاب ومنسوبي المدرسة',
    isFavorite: false
  }
];

export class ContactsService {
  private static _contactsCache: ContactItem[] | null = null;

  // Initialize and load contacts from localStorage
  static getContacts(): ContactItem[] {
    if (this._contactsCache) return this._contactsCache;

    try {
      const stored = localStorage.getItem(CONTACTS_STORAGE_KEY);
      if (stored) {
        this._contactsCache = JSON.parse(stored);
        return this._contactsCache || [];
      }
    } catch (e) {
      console.warn('Failed to parse contacts from localStorage', e);
    }

    // Seed initial contacts from official data
    const initialList = this.generateInitialContacts();
    this.saveToStorage(initialList);
    this._contactsCache = initialList;
    return initialList;
  }

  // Generate complete baseline contacts from teachers and students roster
  static generateInitialContacts(): ContactItem[] {
    const list: ContactItem[] = [];
    const now = new Date().toISOString();

    // 1. Add official admin and emergency contacts
    INITIAL_OFFICIAL_CONTACTS.forEach((c, idx) => {
      list.push({
        ...c,
        id: `contact-admin-${idx + 1}`,
        lastUpdated: now
      });
    });

    // 2. Add Teachers from system users
    const users = AttendanceService.getUsers ? AttendanceService.getUsers() : INITIAL_USERS;
    const teachers = users.filter(u => u.role === 'teacher');

    teachers.forEach((t, idx) => {
      list.push({
        id: `contact-teacher-${t.id || idx + 1}`,
        name: t.name,
        phone: t.phone || `05${Math.floor(10000000 + Math.random() * 90000000)}`,
        email: t.email || `${t.username}@zbt.edu.sa`,
        category: 'teacher',
        roleDescription: `معلم ${t.subject || 'التربية والتعليم'} — ${t.assignedClassName || 'شعبة دراسية'}`,
        className: t.assignedClassName,
        notes: `الرقم الوطني: ${t.nationalId || '-'} | المادة: ${t.subject || '-'}`,
        isFavorite: false,
        lastUpdated: now
      });
    });

    // 3. Add Parents from existing students list
    const students = AttendanceService.getStudents ? AttendanceService.getStudents() : [];
    const processedParents = new Set<string>();

    students.forEach((st, idx) => {
      const key = `${st.parentName}_${st.parentPhone}`;
      if (!processedParents.has(key) && st.parentPhone) {
        processedParents.add(key);
        list.push({
          id: `contact-parent-${st.id || idx + 1}`,
          name: st.parentName || `ولي أمر الطالب: ${st.name}`,
          phone: st.parentPhone,
          category: 'parent',
          roleDescription: `ولي أمر الطالب: ${st.name} (${st.className})`,
          studentId: st.id,
          studentName: st.name,
          className: st.className,
          notes: `الطالب: ${st.name} | الرقم الأكاديمي: ${st.studentNumber} | الحالة: ${st.chronicCondition ? 'حالة صحية خاصة' : 'سليم'}`,
          isFavorite: false,
          lastUpdated: now
        });
      }
    });

    return list;
  }

  // Save array to localStorage and memory cache
  private static saveToStorage(contacts: ContactItem[]): void {
    this._contactsCache = contacts;
    try {
      localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
    } catch (e) {
      console.error('Failed to save contacts to localStorage', e);
    }
    this.notifySubscribers();
  }

  private static notifySubscribers(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CONTACTS_CHANGED_EVENT));
    }
  }

  // Get Contact by ID
  static getContactById(id: string): ContactItem | undefined {
    return this.getContacts().find(c => c.id === id);
  }

  // Add new Contact
  static addContact(contact: Omit<ContactItem, 'id' | 'lastUpdated'>, user?: User): ContactItem {
    const list = this.getContacts();
    const newContact: ContactItem = {
      ...contact,
      id: `contact-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      lastUpdated: new Date().toISOString()
    };

    list.unshift(newContact);
    this.saveToStorage(list);

    if (user && AttendanceService.logAudit) {
      AttendanceService.logAudit({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'إضافة جهة اتصال جديدة',
        details: `تمت إضافة جهة الاتصال: ${newContact.name} (${newContact.phone}) - التصنيف: ${newContact.category}`,
        type: 'settings_change'
      });
    }

    return newContact;
  }

  // Update existing Contact
  static updateContact(id: string, updates: Partial<ContactItem>, user?: User): ContactItem {
    const list = this.getContacts();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`جهة الاتصال برقم ${id} غير موجودة`);
    }

    const updatedContact: ContactItem = {
      ...list[index],
      ...updates,
      id: list[index].id, // protect ID
      lastUpdated: new Date().toISOString()
    };

    list[index] = updatedContact;
    this.saveToStorage(list);

    if (user && AttendanceService.logAudit) {
      AttendanceService.logAudit({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'تعديل بيانات جهة اتصال',
        details: `تم تحديث بيانات جهة الاتصال: ${updatedContact.name} (${updatedContact.phone})`,
        type: 'settings_change'
      });
    }

    return updatedContact;
  }

  // Toggle favorite status
  static toggleFavorite(id: string): boolean {
    const list = this.getContacts();
    const index = list.findIndex(c => c.id === id);
    if (index === -1) return false;

    list[index].isFavorite = !list[index].isFavorite;
    list[index].lastUpdated = new Date().toISOString();
    this.saveToStorage(list);
    return !!list[index].isFavorite;
  }

  // Delete Contact
  static deleteContact(id: string, user?: User): boolean {
    const list = this.getContacts();
    const target = list.find(c => c.id === id);
    if (!target) return false;

    const filtered = list.filter(c => c.id !== id);
    this.saveToStorage(filtered);

    if (user && AttendanceService.logAudit) {
      AttendanceService.logAudit({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'حذف جهة اتصال',
        details: `تم حذف جهة الاتصال: ${target.name} (${target.phone})`,
        type: 'settings_change'
      });
    }

    return true;
  }

  // Bulk Import Contacts
  static bulkImportContacts(newContacts: Omit<ContactItem, 'id' | 'lastUpdated'>[], user?: User): number {
    const currentList = this.getContacts();
    const now = new Date().toISOString();
    let addedCount = 0;

    newContacts.forEach(item => {
      // deduplicate by phone or name
      const exists = currentList.some(
        c => (c.phone && c.phone === item.phone) || (c.name.trim() === item.name.trim() && c.category === item.category)
      );

      if (!exists && item.name.trim()) {
        currentList.push({
          ...item,
          id: `contact-imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          lastUpdated: now
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      this.saveToStorage(currentList);
      if (user && AttendanceService.logAudit) {
        AttendanceService.logAudit({
          userId: user.id,
          userName: user.name,
          role: user.role,
          action: 'استيراد جهات اتصال مجمع',
          details: `تم استيراد عدد ${addedCount} جهة اتصال جديدة بنجاح`,
          type: 'settings_change'
        });
      }
    }

    return addedCount;
  }

  // 1-Click Sync from Students and Teachers Roster
  static syncFromSchoolRoster(user?: User): { added: number; updated: number } {
    const currentList = this.getContacts();
    const now = new Date().toISOString();
    let added = 0;
    let updated = 0;

    const students = AttendanceService.getStudents();
    const users = AttendanceService.getUsers();
    const teachers = users.filter(u => u.role === 'teacher');

    // Sync Teachers
    teachers.forEach(t => {
      const matchIndex = currentList.findIndex(c => c.name === t.name || (t.phone && c.phone === t.phone));
      if (matchIndex >= 0) {
        // Update teacher info
        currentList[matchIndex].roleDescription = `معلم ${t.subject || 'التربية والتعليم'} — ${t.assignedClassName || 'شعبة دراسية'}`;
        currentList[matchIndex].className = t.assignedClassName;
        if (t.email) currentList[matchIndex].email = t.email;
        if (t.phone) currentList[matchIndex].phone = t.phone;
        currentList[matchIndex].lastUpdated = now;
        updated++;
      } else {
        currentList.push({
          id: `contact-teacher-${t.id}-${Date.now()}`,
          name: t.name,
          phone: t.phone || '05xxxxxxxx',
          email: t.email || `${t.username}@zbt.edu.sa`,
          category: 'teacher',
          roleDescription: `معلم ${t.subject || 'التربية والتعليم'} — ${t.assignedClassName || 'شعبة دراسية'}`,
          className: t.assignedClassName,
          notes: `مادة: ${t.subject || '-'} | الهوية: ${t.nationalId || '-'}`,
          isFavorite: false,
          lastUpdated: now
        });
        added++;
      }
    });

    // Sync Parents
    students.forEach(st => {
      if (!st.parentPhone) return;
      const matchIndex = currentList.findIndex(
        c => c.phone === st.parentPhone || (c.studentId === st.id) || (c.name === st.parentName)
      );

      if (matchIndex >= 0) {
        currentList[matchIndex].studentName = st.name;
        currentList[matchIndex].className = st.className;
        currentList[matchIndex].roleDescription = `ولي أمر الطالب: ${st.name} (${st.className})`;
        currentList[matchIndex].lastUpdated = now;
        updated++;
      } else {
        currentList.push({
          id: `contact-parent-${st.id}-${Date.now()}`,
          name: st.parentName || `ولي أمر الطالب: ${st.name}`,
          phone: st.parentPhone,
          category: 'parent',
          roleDescription: `ولي أمر الطالب: ${st.name} (${st.className})`,
          studentId: st.id,
          studentName: st.name,
          className: st.className,
          notes: `الطالب: ${st.name} | الفصل: ${st.className} | الرقم الأكاديمي: ${st.studentNumber}`,
          isFavorite: false,
          lastUpdated: now
        });
        added++;
      }
    });

    this.saveToStorage(currentList);

    if (user && AttendanceService.logAudit) {
      AttendanceService.logAudit({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'مزامنة دليل جهات الاتصال مع سجل المدرسة',
        details: `تمت مزامنة جهات الاتصال بنجاح (تمت إضافة ${added} وتحديث ${updated})`,
        type: 'settings_change'
      });
    }

    return { added, updated };
  }

  // Get Summary Statistics
  static getStats(): ContactsSyncStats {
    const list = this.getContacts();
    return {
      totalContacts: list.length,
      parentsCount: list.filter(c => c.category === 'parent').length,
      teachersCount: list.filter(c => c.category === 'teacher').length,
      adminCount: list.filter(c => c.category === 'admin').length,
      officialCount: list.filter(c => c.category === 'official' || c.category === 'medical').length,
      googleSyncedCount: list.filter(c => !!c.googleResourceName).length,
      favoritesCount: list.filter(c => !!c.isFavorite).length
    };
  }

  // Export Contacts to VCF (vCard 3.0) format for phone import
  static exportToVCard(): string {
    const list = this.getContacts();
    let vcf = '';

    list.forEach(c => {
      vcf += 'BEGIN:VCARD\r\n';
      vcf += 'VERSION:3.0\r\n';
      vcf += `FN;CHARSET=UTF-8:${c.name}\r\n`;
      vcf += `N;CHARSET=UTF-8:${c.name};;;;\r\n`;
      if (c.phone) {
        const cleanPhone = c.phone.replace(/[^0-9+]/g, '');
        vcf += `TEL;TYPE=CELL,VOICE:${cleanPhone}\r\n`;
      }
      if (c.email) {
        vcf += `EMAIL;TYPE=INTERNET,WORK:${c.email}\r\n`;
      }
      if (c.roleDescription) {
        vcf += `TITLE;CHARSET=UTF-8:${c.roleDescription}\r\n`;
      }
      vcf += `ORG;CHARSET=UTF-8:مدرسة زيد بن ثابت الابتدائية\r\n`;
      if (c.notes) {
        vcf += `NOTE;CHARSET=UTF-8:${c.notes.replace(/\n/g, '\\n')}\r\n`;
      }
      vcf += 'END:VCARD\r\n';
    });

    return vcf;
  }
}

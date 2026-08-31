import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { ContactItem, GoogleContactPerson } from '../types';
import { ContactsService } from './contactsService';
import { AttendanceService } from './attendanceService';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export const CONTACT_SCOPES = [
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/user.phonenumbers.read',
  'https://www.googleapis.com/auth/user.emails.read',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
];

const provider = new GoogleAuthProvider();
CONTACT_SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline'
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let currentGoogleUser: FirebaseUser | null = null;

export interface GoogleContactsSyncReport {
  timestamp: string;
  totalGoogleFound: number;
  importedToApp: number;
  exportedToGoogle: number;
  skippedDuplicates: number;
  errors: string[];
}

export class GoogleContactsService {
  // Auth state listener
  static initAuth(
    onAuthSuccess?: (user: FirebaseUser, token: string) => void,
    onAuthFailure?: () => void
  ) {
    return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      currentGoogleUser = user;
      if (user) {
        if (cachedAccessToken) {
          if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        } else if (!isSigningIn) {
          if (onAuthFailure) onAuthFailure();
        }
      } else {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    });
  }

  // Google Sign-in popup
  static async googleSignIn(): Promise<{ user: FirebaseUser; accessToken: string } | null> {
    try {
      isSigningIn = true;
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('لم يتم استلام تصريح الوصول (Access Token) من Google');
      }

      cachedAccessToken = credential.accessToken;
      currentGoogleUser = result.user;
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (error: any) {
      console.error('Google Contacts Sign-in error:', error);
      throw error;
    } finally {
      isSigningIn = false;
    }
  }

  static async logout(): Promise<void> {
    await signOut(auth);
    cachedAccessToken = null;
    currentGoogleUser = null;
  }

  static getAccessToken(): string | null {
    return cachedAccessToken;
  }

  static getCurrentUser(): FirebaseUser | null {
    return currentGoogleUser;
  }

  static isAuthenticated(): boolean {
    return !!cachedAccessToken && !!currentGoogleUser;
  }

  // --- Fetch Contacts from Google People API ---
  static async listGoogleContacts(): Promise<GoogleContactPerson[]> {
    const token = this.getAccessToken();
    if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google أولاً.');

    const personFields = 'names,emailAddresses,phoneNumbers,organizations,biographies,photos';
    const url = `https://people.googleapis.com/v1/people/me/connections?personFields=${personFields}&pageSize=1000&sortOrder=FIRST_NAME_ASCENDING`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'فشل جلب جهات الاتصال من Google People API');
    }

    const data = await res.json();
    return data.connections || [];
  }

  // --- Import Contacts from Google into Local App Database ---
  static async importFromGoogle(): Promise<{ imported: number; updated: number; total: number }> {
    const googleContacts = await this.listGoogleContacts();
    const localContacts = ContactsService.getContacts();
    let imported = 0;
    let updated = 0;
    const now = new Date().toISOString();

    for (const gPerson of googleContacts) {
      const displayName = gPerson.names?.[0]?.displayName || gPerson.names?.[0]?.givenName || 'جهة اتصال بدون اسم';
      const phone = gPerson.phoneNumbers?.[0]?.value || '';
      const email = gPerson.emailAddresses?.[0]?.value;
      const org = gPerson.organizations?.[0]?.name;
      const title = gPerson.organizations?.[0]?.title;
      const notes = gPerson.biographies?.[0]?.value;

      if (!displayName && !phone && !email) continue;

      // Determine category
      let category: any = 'other';
      const lowerName = (displayName + ' ' + (title || '')).toLowerCase();
      if (lowerName.includes('ولي أمر') || lowerName.includes('والد')) {
        category = 'parent';
      } else if (lowerName.includes('معلم') || lowerName.includes('أستاذ') || lowerName.includes('مربي')) {
        category = 'teacher';
      } else if (lowerName.includes('مدير') || lowerName.includes('وكيل') || lowerName.includes('مرشد')) {
        category = 'admin';
      } else if (lowerName.includes('صحي') || lowerName.includes('مستشفى') || lowerName.includes('طبيب')) {
        category = 'medical';
      } else if (lowerName.includes('تعليم') || lowerName.includes('وزارة') || lowerName.includes('دفاع')) {
        category = 'official';
      }

      // Check if exists locally by googleResourceName or exact phone/name
      const matchIndex = localContacts.findIndex(
        c => (c.googleResourceName && c.googleResourceName === gPerson.resourceName) ||
             (phone && c.phone && c.phone.replace(/[^0-9]/g, '') === phone.replace(/[^0-9]/g, '')) ||
             (c.name === displayName && c.name.length > 5)
      );

      if (matchIndex >= 0) {
        // Update
        localContacts[matchIndex].googleResourceName = gPerson.resourceName;
        localContacts[matchIndex].googleETag = gPerson.etag;
        if (email && !localContacts[matchIndex].email) localContacts[matchIndex].email = email;
        if (phone && !localContacts[matchIndex].phone) localContacts[matchIndex].phone = phone;
        localContacts[matchIndex].lastUpdated = now;
        updated++;
      } else {
        // Add new
        localContacts.push({
          id: `contact-g-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: displayName,
          phone: phone || '',
          email: email,
          category: category,
          roleDescription: title || org || 'جهة اتصال مستوردة من Google Contacts',
          notes: notes,
          googleResourceName: gPerson.resourceName,
          googleETag: gPerson.etag,
          isFavorite: false,
          lastUpdated: now
        });
        imported++;
      }
    }

    try {
      localStorage.setItem('zbt_contacts_prod_v1', JSON.stringify(localContacts));
    } catch (e) {}

    AttendanceService.logAudit({
      userId: 'admin-1',
      userName: 'إدارة المدرسة',
      role: 'admin',
      action: 'استيراد جهات اتصال من Google Contacts',
      details: `تم استيراد ${imported} جهة اتصال جديدة وتحديث ${updated} من حساب Google`,
      type: 'settings_change'
    });

    return { imported, updated, total: googleContacts.length };
  }

  // --- Export a Single Contact to Google Contacts ---
  static async createGoogleContact(contact: ContactItem): Promise<{ resourceName: string; etag: string }> {
    const token = this.getAccessToken();
    if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google أولاً');

    const payload: any = {
      names: [
        {
          givenName: contact.name,
          displayName: contact.name
        }
      ],
      organizations: [
        {
          name: 'مدرسة زيد بن ثابت الابتدائية',
          title: contact.roleDescription || (contact.category === 'teacher' ? 'معلم' : contact.category === 'parent' ? 'ولي أمر' : 'إدارة المدرسة'),
          department: contact.className || 'التعليم العام'
        }
      ]
    };

    if (contact.phone) {
      payload.phoneNumbers = [
        {
          value: contact.phone,
          type: 'mobile'
        }
      ];
    }

    if (contact.email) {
      payload.emailAddresses = [
        {
          value: contact.email,
          type: 'work'
        }
      ];
    }

    if (contact.notes || contact.studentName) {
      const bioText = [
        contact.notes,
        contact.studentName ? `الطالب المرتبط: ${contact.studentName} (${contact.className || ''})` : ''
      ].filter(Boolean).join('\n');

      payload.biographies = [
        {
          value: bioText,
          contentType: 'TEXT_PLAIN'
        }
      ];
    }

    const res = await fetch('https://people.googleapis.com/v1/people:createContact', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `فشل إنشاء جهة الاتصال (${contact.name}) في Google Contacts`);
    }

    const data = await res.json();
    return {
      resourceName: data.resourceName,
      etag: data.etag
    };
  }

  // --- Batch Export All Selected Contacts to Google Contacts ---
  static async batchExportToGoogle(
    contacts: ContactItem[],
    onProgress?: (current: number, total: number, currentName: string) => void
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    const token = this.getAccessToken();
    if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google أولاً');

    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      if (onProgress) onProgress(i + 1, contacts.length, c.name);

      try {
        const result = await this.createGoogleContact(c);
        c.googleResourceName = result.resourceName;
        c.googleETag = result.etag;
        c.lastUpdated = new Date().toISOString();
        successful++;
      } catch (err: any) {
        failed++;
        errors.push(`${c.name}: ${err.message || 'خطأ في التصدير'}`);
      }

      // Small throttle to avoid Google API rate limiting
      await new Promise(r => setTimeout(r, 120));
    }

    // Save updated resourceNames
    try {
      localStorage.setItem('zbt_contacts_prod_v1', JSON.stringify(ContactsService.getContacts()));
    } catch (e) {}

    AttendanceService.logAudit({
      userId: 'admin-1',
      userName: 'إدارة المدرسة',
      role: 'admin',
      action: 'تصدير جهات الاتصال إلى Google Contacts',
      details: `تم تصدير ${successful} جهة اتصال إلى حساب Google (فشل ${failed})`,
      type: 'settings_change'
    });

    return { successful, failed, errors };
  }
}

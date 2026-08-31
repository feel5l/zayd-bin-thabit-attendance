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
import { AttendanceService } from './attendanceService';
import { getTodayDateString } from './initialData';
import { SchoolSettings, Student, SchoolClass } from '../types';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Google Workspace Scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.readonly'
];

const provider = new GoogleAuthProvider();
SCOPES.forEach(scope => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline'
});

// Flag & In-memory token cache (Do NOT store in localStorage per security guidelines)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let currentGoogleUser: FirebaseUser | null = null;

export interface GoogleDriveSheetItem {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink?: string;
}

export interface SheetExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  createdAt: string;
  sheetsCreated: string[];
}

export interface CloudSyncConfig {
  linkedSpreadsheetId: string;
  linkedSpreadsheetName: string;
  linkedSpreadsheetUrl: string;
  lastSyncedAt: string | null;
  autoSyncEnabled: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncMessage?: string;
  totalSyncedRows?: number;
}

const CLOUD_SYNC_STORAGE_KEY = 'zayd_school_cloud_sheets_sync_config';

export class GoogleSheetsService {
  // --- Auth State ---
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

  static async googleSignIn(): Promise<{ user: FirebaseUser; accessToken: string } | null> {
    try {
      isSigningIn = true;
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('لم يتم استلام مفتاح الوصول (Access Token) من حساب Google');
      }

      cachedAccessToken = credential.accessToken;
      currentGoogleUser = result.user;
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (error: any) {
      console.error('Google Sign-in error:', error);
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

  // --- List Spreadsheets from Google Drive ---
  static async listUserSpreadsheets(): Promise<GoogleDriveSheetItem[]> {
    const token = this.getAccessToken();
    if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google أولاً.');

    const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const fields = encodeURIComponent('files(id,name,modifiedTime,webViewLink)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime%20desc&pageSize=20&fields=${fields}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || 'فشل جلب جداول Google Sheets من Google Drive');
    }

    const data = await res.json();
    return data.files || [];
  }

  // --- Export Daily Attendance to a New Styled Google Sheet ---
  static async createDailyAttendanceSpreadsheet(
    date: string = getTodayDateString()
  ): Promise<SheetExportResult> {
    const token = this.getAccessToken();
    if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google أولاً');

    const settings = AttendanceService.getSettings();
    const stats = AttendanceService.getTodaySchoolStats(date);
    const classes = AttendanceService.getClasses();
    const submissions = AttendanceService.getSubmissions(date);
    const absentDetails = AttendanceService.getDetailedAbsences(date);

    const sheetTitle = `كشف غياب الحصة الثانية — ${settings.schoolName} — ${date}`;

    // 1. Create Spreadsheet with RTL Arabic layout
    const createPayload = {
      properties: {
        title: sheetTitle,
        locale: 'ar_SA',
        autoRecalc: 'ON_CHANGE',
        timeZone: 'Asia/Riyadh'
      },
      sheets: [
        {
          properties: {
            sheetId: 0,
            title: 'الملخص الإحصائي العام',
            rightToLeft: true,
            gridProperties: {
              rowCount: 50,
              columnCount: 12,
              frozenRowCount: 4
            }
          }
        },
        {
          properties: {
            sheetId: 1,
            title: 'كشف الغياب والتأخر التفصيلي',
            rightToLeft: true,
            gridProperties: {
              rowCount: Math.max(50, absentDetails.length + 10),
              columnCount: 10,
              frozenRowCount: 4
            }
          }
        },
        {
          properties: {
            sheetId: 2,
            title: 'حالة كشوفات الفصول والمربين',
            rightToLeft: true,
            gridProperties: {
              rowCount: Math.max(30, classes.length + 10),
              columnCount: 10,
              frozenRowCount: 4
            }
          }
        }
      ]
    };

    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createPayload)
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'فشل إنشاء جدول Google Sheets جديد');
    }

    const createdSheet = await createRes.json();
    const spreadsheetId = createdSheet.spreadsheetId;

    // 2. Prepare Data Values for Tab 1: الملخص الإحصائي العام
    const tab1Values = [
      [`المملكة العربية السعودية — وزارة التعليم — ${settings.schoolName}`],
      [`تقرير رصد غياب الحصة الثانية اليومي — تاريخ الرصد: ${date} — العام الدراسي: ${settings.academicYear}`],
      [''],
      ['م', 'المؤشر الإداري / المقياس', 'القيمة الرقمية', 'النسبة المئوية', 'ملاحظات وتوجيهات'],
      ['1', 'إجمالي طلاب المدرسة المسجلين', stats.totalStudents, '100%', 'الطاقة الاستيعابية الكاملة للمدرسة'],
      ['2', 'إجمالي الطلاب الحاضرين فعلياً', stats.presentCount, `${stats.attendanceRate}%`, 'حضور الحصة الثانية المعتمد'],
      ['3', 'إجمالي الغياب بدون عذر (مؤكد)', stats.absentCount, `${((stats.absentCount / (stats.totalStudents || 1)) * 100).toFixed(1)}%`, 'تم إرسال إشعارات فورية لأولياء الأمور'],
      ['4', 'إجمالي الغياب بعذر مقبول', stats.excusedCount, `${((stats.excusedCount / (stats.totalStudents || 1)) * 100).toFixed(1)}%`, 'مرفق إجازات مرضية أو إفادات معتمدة'],
      ['5', 'إجمالي حالات التأخر الصباحي', stats.lateCount, '-', 'تم التوثيق عبر كشف المعلمين'],
      ['6', 'إجمالي كشوفات الفصول المرصودة', `${submissions.length} من أصل ${classes.length}`, `${Math.round((submissions.length / (classes.length || 1)) * 100)}%`, 'نسبة اكتمال إرسال الكشوفات بالمنظومة'],
      [''],
      ['اعتماد مدير المدرسة:', settings.principalName, '', 'وكيل الشؤون التعليمية:', settings.vicePrincipalName]
    ];

    // 3. Prepare Data Values for Tab 2: كشف الغياب والتأخر التفصيلي
    const tab2Values = [
      [`سجل غياب وتأخر الطلاب التفصيلي — ${settings.schoolName}`],
      [`تاريخ الرصد: ${date} | إجمالي المسجلين بالغياب والتأخر: ${absentDetails.length} طالب`],
      [''],
      ['م', 'اسم الطالب', 'الفصل', 'الصف الدراسي', 'حالة الحضور', 'سبب الغياب / التأخر', 'حالة التواصل', 'جوال ولي الأمر', 'ملاحظات المعلم والإدارة'],
      ...(absentDetails.length > 0
        ? absentDetails.map((item, idx) => {
            const studentInfo = AttendanceService.getStudents().find(s => s.id === item.studentId || s.name === item.studentName);
            const statusLabel = 
              item.status === 'absent' ? 'غياب بدون عذر ❌' :
              item.status === 'excused' ? 'غياب بعذر معتمد 📄' : 'متأخر ⏱️';
            
            return [
              String(idx + 1),
              item.studentName,
              item.className,
              item.gradeLevel || '',
              statusLabel,
              item.reason || (item.status === 'absent' ? 'غير مبرر' : 'عذر مقبول'),
              item.contactedParent ? 'تم التواصل ✓' : 'بانتظار التواصل',
              studentInfo?.parentPhone || '05xxxxxxxx',
              item.notes || 'لا توجد ملاحظات'
            ];
          })
        : [['-', 'لا يوجد غياب مرصود لهذا اليوم - نسبة حضور كاملة 100%', '', '', '', '', '', '', '']])
    ];

    // 4. Prepare Data Values for Tab 3: حالة كشوفات الفصول والمربين
    const tab3Values = [
      [`حالة كشوفات الفصول ومربي الفصول — الحصة الثانية — ${settings.schoolName}`],
      [`تاريخ الرصد: ${date} | التوقيت: ${settings.period2StartTime} إلى ${settings.period2EndTime}`],
      [''],
      ['م', 'الفصل الدراسي', 'المرحلة / الصف', 'مربي الفصل / المعلم', 'حالة الرصد', 'وقت الرفع', 'إجمالي الطلاب', 'حضور', 'غياب مؤكد', 'غياب بعذر', 'متأخر'],
      ...classes.map((cls, idx) => {
        const sub = submissions.find(s => s.classId === cls.id);
        const isSubmitted = !!sub;
        const timeStr = sub ? new Date(sub.submittedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-';

        return [
          String(idx + 1),
          cls.name,
          cls.gradeLevel,
          cls.teacherName,
          isSubmitted ? 'تم الاعتماد والرصد ✓' : 'بانتظار الرصد ⏳',
          timeStr,
          cls.studentCount,
          sub ? sub.presentCount : '-',
          sub ? sub.absentCount : '-',
          sub ? sub.excusedCount : '-',
          sub ? sub.lateCount : '-'
        ];
      })
    ];

    // 5. Batch update values
    const dataUpdatePayload = {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: 'الملخص الإحصائي العام!A1',
          values: tab1Values
        },
        {
          range: 'كشف الغياب والتأخر التفصيلي!A1',
          values: tab2Values
        },
        {
          range: 'حالة كشوفات الفصول والمربين!A1',
          values: tab3Values
        }
      ]
    };

    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dataUpdatePayload)
    });

    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'فشل كتابة البيانات داخل جدول Google Sheets');
    }

    // 6. Apply Elegant Styling via batchUpdate (Colors, Fonts, Borders, Cell Sizes)
    const stylingPayload = {
      requests: [
        // Tab 1 Title Styling
        {
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 5 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.02, green: 0.47, blue: 0.34 }, // Emerald-700
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 13 },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        },
        // Tab 1 Table Headers Styling
        {
          repeatCell: {
            range: { sheetId: 0, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 5 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.08, green: 0.22, blue: 0.38 }, // Slate Navy
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 11 },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        },
        // Tab 2 Title Styling
        {
          repeatCell: {
            range: { sheetId: 1, startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 9 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.75, green: 0.2, blue: 0.15 }, // Red/Rose Accent
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 13 },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        },
        // Tab 2 Headers
        {
          repeatCell: {
            range: { sheetId: 1, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 9 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.1, green: 0.15, blue: 0.25 },
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 11 },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        },
        // Tab 3 Title Styling
        {
          repeatCell: {
            range: { sheetId: 2, startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 11 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.15, green: 0.35, blue: 0.65 }, // Royal Blue
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 13 },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        },
        // Tab 3 Headers
        {
          repeatCell: {
            range: { sheetId: 2, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 0, endColumnIndex: 11 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.08, green: 0.22, blue: 0.38 },
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 11 },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        }
      ]
    };

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stylingPayload)
    }).catch(e => console.warn('Styling failed, data still intact:', e));

    const webViewUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    AttendanceService.logAudit({
      userId: 'admin-1',
      userName: 'إدارة المدرسة',
      role: 'admin',
      action: 'تصدير كشف غياب إلى Google Sheets',
      details: `تم إنشاء وتصدير جدول كشف غياب اليوم (${date}) على Google Drive بنجاح: ${sheetTitle}`,
      type: 'settings_change'
    });

    return {
      spreadsheetId,
      spreadsheetUrl: webViewUrl,
      title: sheetTitle,
      createdAt: new Date().toISOString(),
      sheetsCreated: ['الملخص الإحصائي العام', 'كشف الغياب والتأخر التفصيلي', 'حالة كشوفات الفصول والمربين']
    };
  }

  // --- Export Monthly Attendance to Google Sheets ---
  static async createMonthlyAttendanceSpreadsheet(
    yearMonth: string = '2026-08'
  ): Promise<SheetExportResult> {
    const token = this.getAccessToken();
    if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google أولاً');

    const settings = AttendanceService.getSettings();
    const monthlyReport = AttendanceService.getMonthlyReportData(yearMonth);
    const sheetTitle = `التقرير الشهري التراكمي للحضور والغياب — ${settings.schoolName} — شهر ${monthlyReport.monthName} ${yearMonth}`;

    const createPayload = {
      properties: {
        title: sheetTitle,
        locale: 'ar_SA',
        autoRecalc: 'ON_CHANGE',
        timeZone: 'Asia/Riyadh'
      },
      sheets: [
        {
          properties: {
            sheetId: 0,
            title: 'ملخص الفصول والمؤشرات',
            rightToLeft: true,
            gridProperties: {
              rowCount: Math.max(30, monthlyReport.classesSummary.length + 10),
              columnCount: 11,
              frozenRowCount: 4
            }
          }
        },
        {
          properties: {
            sheetId: 1,
            title: 'سجل غياب الطلاب التراكمي',
            rightToLeft: true,
            gridProperties: {
              rowCount: Math.max(50, monthlyReport.studentsAbsenceList.length + 10),
              columnCount: 10,
              frozenRowCount: 4
            }
          }
        },
        {
          properties: {
            sheetId: 2,
            title: 'الاتجاه اليومي للحضور',
            rightToLeft: true,
            gridProperties: {
              rowCount: Math.max(40, monthlyReport.dailyAttendanceTrend.length + 10),
              columnCount: 8,
              frozenRowCount: 4
            }
          }
        }
      ]
    };

    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createPayload)
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'فشل إنشاء جدول التقرير الشهري على Google Sheets');
    }

    const createdSheet = await createRes.json();
    const spreadsheetId = createdSheet.spreadsheetId;

    // Values for Tab 1
    const tab1Values = [
      [`المملكة العربية السعودية — وزارة التعليم — ${settings.schoolName}`],
      [`التقرير الشهري الشامل لحضور وغياب الطلاب — شهر: ${monthlyReport.monthName} ${yearMonth} | معدل حضور المدرسة: ${monthlyReport.schoolAverageAttendanceRate}%`],
      [''],
      ['م', 'الفصل الدراسي', 'المرحلة', 'مربي الفصل', 'عدد الطلاب', 'إجمالي الحصص', 'حضور', 'غياب بدون عذر', 'غياب بعذر', 'تأخر', 'نسبة الحضور'],
      ...monthlyReport.classesSummary.map((c, idx) => [
        String(idx + 1),
        c.className,
        c.gradeLevel,
        c.teacherName,
        c.studentCount,
        c.totalSessions,
        c.totalPresent,
        c.totalAbsentUnexcused,
        c.totalAbsentExcused,
        c.totalLate,
        `${c.attendanceRate}%`
      ])
    ];

    // Values for Tab 2
    const tab2Values = [
      [`سجل الطلاب الأكثر غياباً والتراكمي الشهري — ${settings.schoolName}`],
      [`الشهر: ${monthlyReport.monthName} ${yearMonth} | عدد الطلاب المسجلين بالغياب: ${monthlyReport.studentsAbsenceList.length}`],
      [''],
      ['م', 'اسم الطالب', 'الفصل', 'المرحلة', 'غياب بدون عذر', 'غياب بعذر', 'تأخر', 'إجمالي الأيام', 'نسبة الحضور', 'حالة الطالب'],
      ...monthlyReport.studentsAbsenceList.map((st, idx) => [
        String(idx + 1),
        st.studentName,
        st.className,
        st.gradeLevel,
        st.unexcusedDays,
        st.excusedDays,
        st.lateDays,
        st.totalAbsences,
        `${st.attendanceRate}%`,
        st.isChronic ? '⚠️ غياب متكرر (يحتاج تدخل)' : 'ضمن الحد المقبول'
      ])
    ];

    // Values for Tab 3
    const tab3Values = [
      [`الاتجاه اليومي للحضور والغياب خلال الشهر — ${settings.schoolName}`],
      [`الشهر: ${monthlyReport.monthName} ${yearMonth}`],
      [''],
      ['م', 'التاريخ', 'اليوم', 'الطلاب الحاضرين', 'غياب بدون عذر', 'غياب بعذر', 'نسبة الحضور اليومية'],
      ...monthlyReport.dailyAttendanceTrend.map((d, idx) => [
        String(idx + 1),
        d.date,
        d.dayName,
        d.presentCount,
        d.absentCount,
        d.excusedCount,
        `${d.attendanceRate}%`
      ])
    ];

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'ملخص الفصول والمؤشرات!A1', values: tab1Values },
          { range: 'سجل غياب الطلاب التراكمي!A1', values: tab2Values },
          { range: 'الاتجاه اليومي للحضور!A1', values: tab3Values }
        ]
      })
    });

    const webViewUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    AttendanceService.logAudit({
      userId: 'admin-1',
      userName: 'إدارة المدرسة',
      role: 'admin',
      action: 'تصدير التقرير الشهري إلى Google Sheets',
      details: `تم إنشاء وتصدير جدول التقرير الشهري (${yearMonth}) على Google Drive: ${sheetTitle}`,
      type: 'settings_change'
    });

    return {
      spreadsheetId,
      spreadsheetUrl: webViewUrl,
      title: sheetTitle,
      createdAt: new Date().toISOString(),
      sheetsCreated: ['ملخص الفصول والمؤشرات', 'سجل غياب الطلاب التراكمي', 'الاتجاه اليومي للحضور']
    };
  }

  // --- Export Complete Student Roster to Google Sheets ---
  static async createStudentsRosterSpreadsheet(): Promise<SheetExportResult> {
    const token = this.getAccessToken();
    if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google أولاً');

    const settings = AttendanceService.getSettings();
    const students = AttendanceService.getStudents();
    const sheetTitle = `سجل بيانات طلاب المدرسة الشامل — ${settings.schoolName} — ${settings.academicYear}`;

    const createPayload = {
      properties: {
        title: sheetTitle,
        locale: 'ar_SA',
        autoRecalc: 'ON_CHANGE',
        timeZone: 'Asia/Riyadh'
      },
      sheets: [
        {
          properties: {
            sheetId: 0,
            title: 'دليل الطلاب الشامل',
            rightToLeft: true,
            gridProperties: {
              rowCount: Math.max(100, students.length + 10),
              columnCount: 11,
              frozenRowCount: 4
            }
          }
        }
      ]
    };

    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createPayload)
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'فشل إنشاء جدول سجل الطلاب على Google Sheets');
    }

    const createdSheet = await createRes.json();
    const spreadsheetId = createdSheet.spreadsheetId;

    const values = [
      [`المملكة العربية السعودية — وزارة التعليم — ${settings.schoolName}`],
      [`سجل الطلاب وقاعدة البيانات الرسمية المعتمدة — إجمالي الطلاب: ${students.length} طالب — العام الدراسي: ${settings.academicYear}`],
      [''],
      ['م', 'رقم الهوية الوطنية', 'الرقم الأكاديمي', 'اسم الطالب الرباعي', 'المرحلة الدراسية', 'الفصل', 'اسم ولي الأمر', 'رقم جوال ولي الأمر', 'الحالة الصحية', 'ملاحظات'],
      ...students.map((st, idx) => [
        String(idx + 1),
        st.nationalId,
        st.studentNumber,
        st.name,
        st.gradeLevel,
        st.className,
        st.parentName,
        st.parentPhone,
        st.chronicCondition ? 'حالة صحية خاصة / مزمنة' : 'سليم',
        st.notes || 'لا توجد ملاحظات'
      ])
    ];

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'دليل الطلاب الشامل!A1', values }
        ]
      })
    });

    const webViewUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    AttendanceService.logAudit({
      userId: 'admin-1',
      userName: 'إدارة المدرسة',
      role: 'admin',
      action: 'تصدير دليل الطلاب إلى Google Sheets',
      details: `تم تصدير دليل الطلاب وقاعدة البيانات (${students.length} طالب) إلى Google Drive: ${sheetTitle}`,
      type: 'student_add'
    });

    return {
      spreadsheetId,
      spreadsheetUrl: webViewUrl,
      title: sheetTitle,
      createdAt: new Date().toISOString(),
      sheetsCreated: ['دليل الطلاب الشامل']
    };
  }

  // --- Append Daily Summary Row to Existing User Spreadsheet (Destructive / Mutation Confirmation Guarded) ---
  static async appendDailySummaryToExistingSheet(
    spreadsheetId: string,
    date: string = getTodayDateString(),
    userConfirmed: boolean = false
  ): Promise<boolean> {
    const token = this.getAccessToken();
    if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google أولاً');

    if (!userConfirmed) {
      throw new Error('يتطلب هذا الإجراء تأكيداً صريحاً قبل إضافة السجلات إلى جدول البيانات الموجود.');
    }

    const stats = AttendanceService.getTodaySchoolStats(date);
    const subs = AttendanceService.getSubmissions(date);

    const rowValues = [
      [
        date,
        new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        stats.totalStudents,
        stats.presentCount,
        stats.absentCount,
        stats.excusedCount,
        stats.lateCount,
        `${stats.attendanceRate}%`,
        `${subs.length} فصول`
      ]
    ];

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: rowValues
        })
      }
    );

    if (!appendRes.ok) {
      const err = await appendRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'فشل إدراج السجل في جدول Google Sheets المحدد');
    }

    return true;
  }

  // --- Cloud Live Synchronization Engine ---
  static getCloudSyncConfig(): CloudSyncConfig {
    try {
      const raw = localStorage.getItem(CLOUD_SYNC_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to parse CloudSyncConfig from localStorage', e);
    }
    return {
      linkedSpreadsheetId: '',
      linkedSpreadsheetName: '',
      linkedSpreadsheetUrl: '',
      lastSyncedAt: null,
      autoSyncEnabled: true,
      syncStatus: 'idle',
      lastSyncMessage: 'لم تتم المزامنة السحابية بعد'
    };
  }

  static saveCloudSyncConfig(patch: Partial<CloudSyncConfig>): CloudSyncConfig {
    const current = this.getCloudSyncConfig();
    const updated: CloudSyncConfig = { ...current, ...patch };
    try {
      localStorage.setItem(CLOUD_SYNC_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save CloudSyncConfig', e);
    }
    return updated;
  }

  // Creates or provisions a dedicated Master Cloud Live Sync Google Sheet
  static async createMasterLiveSyncSpreadsheet(): Promise<SheetExportResult> {
    const token = this.getAccessToken();
    if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google أولاً');

    const settings = AttendanceService.getSettings();
    const sheetTitle = `نظام رصد الحصة الثانية السحابي المباشر 🔴 — ${settings.schoolName}`;

    // 1. Create Spreadsheet with 3 dedicated live sync sheets
    const createPayload = {
      properties: {
        title: sheetTitle,
        locale: 'ar_SA',
        autoRecalc: 'ON_CHANGE',
        timeZone: 'Asia/Riyadh'
      },
      sheets: [
        {
          properties: {
            sheetId: 0,
            title: 'المؤشرات والملخص اللحظي',
            rightToLeft: true,
            gridProperties: { rowCount: 60, columnCount: 12, frozenRowCount: 4 }
          }
        },
        {
          properties: {
            sheetId: 1,
            title: 'سجل حضور وغياب الطلاب المباشر',
            rightToLeft: true,
            gridProperties: { rowCount: 100, columnCount: 12, frozenRowCount: 4 }
          }
        },
        {
          properties: {
            sheetId: 2,
            title: 'حالة كشوفات الفصول والمعلمين',
            rightToLeft: true,
            gridProperties: { rowCount: 40, columnCount: 10, frozenRowCount: 4 }
          }
        }
      ]
    };

    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createPayload)
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'فشل إنشاء جدول المزامنة السحابية الرئيسي');
    }

    const createdSheet = await createRes.json();
    const spreadsheetId = createdSheet.spreadsheetId;
    const webViewUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    // Save as default linked sheet
    this.saveCloudSyncConfig({
      linkedSpreadsheetId: spreadsheetId,
      linkedSpreadsheetName: sheetTitle,
      linkedSpreadsheetUrl: webViewUrl,
      lastSyncedAt: new Date().toISOString(),
      syncStatus: 'success',
      lastSyncMessage: 'تم إنشاء وربط جدول المزامنة السحابية بنجاح'
    });

    // Populate initial data immediately
    await this.syncLiveAttendanceToSpreadsheet(spreadsheetId);

    return {
      spreadsheetId,
      spreadsheetUrl: webViewUrl,
      title: sheetTitle,
      createdAt: new Date().toISOString(),
      sheetsCreated: ['المؤشرات والملخص اللحظي', 'سجل حضور وغياب الطلاب المباشر', 'حالة كشوفات الفصول والمعلمين']
    };
  }

  // Performs live sync of attendance, classes, and student data directly to Google Sheets
  static async syncLiveAttendanceToSpreadsheet(
    targetSpreadsheetId?: string,
    date: string = getTodayDateString()
  ): Promise<{ success: boolean; timestamp: string; rowsUpdated: number; url: string }> {
    const token = this.getAccessToken();
    if (!token) throw new Error('يرجى تسجيل الدخول بحساب Google أولاً لتمكين المزامنة السحابية');

    const config = this.getCloudSyncConfig();
    const spreadsheetId = targetSpreadsheetId || config.linkedSpreadsheetId;
    if (!spreadsheetId) {
      throw new Error('لم يتم تحديد أو ربط أي جدول Google Sheets للمزامنة. يرجى اختيار جدول أو إنشاء جدول جديد أولاً.');
    }

    const settings = AttendanceService.getSettings();
    const stats = AttendanceService.getTodaySchoolStats(date);
    const classes = AttendanceService.getClasses();
    const submissions = AttendanceService.getSubmissions(date);
    const absentDetails = AttendanceService.getDetailedAbsences(date);
    const students = AttendanceService.getStudents();
    const syncTimeStr = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // 1. Tab 1: Live Dashboard Summary & School Indicators
    const tab1Values = [
      [`المملكة العربية السعودية — وزارة التعليم — ${settings.schoolName}`],
      [`لوحة المؤشرات السحابية اللحظية — تاريخ الرصد: ${date} — آخر مزامنة مباشرة: ${syncTimeStr}`],
      [''],
      ['م', 'المؤشر الإداري / المقياس', 'القيمة الرقمية', 'النسبة المئوية', 'حالة المؤشر والملاحظات'],
      ['1', 'إجمالي طلاب المدرسة المسجلين', stats.totalStudents, '100%', 'الطاقة الاستيعابية الكاملة للمدرسة'],
      ['2', 'إجمالي الطلاب الحاضرين فعلياً', stats.presentCount, `${stats.attendanceRate}%`, stats.attendanceRate >= 95 ? 'ممتاز (ضمن النطاق الأخضر) 🟢' : 'يحتاج متابعة 🟡'],
      ['3', 'إجمالي الغياب بدون عذر (مؤكد)', stats.absentCount, `${((stats.absentCount / (stats.totalStudents || 1)) * 100).toFixed(1)}%`, 'تم إرسال إشعارات فورية عبر واتساب والرسائل'],
      ['4', 'إجمالي الغياب بعذر معتمد', stats.excusedCount, `${((stats.excusedCount / (stats.totalStudents || 1)) * 100).toFixed(1)}%`, 'مرفق إجازات مرضية أو إفادات مقبولة'],
      ['5', 'إجمالي حالات التأخر الصباحي', stats.lateCount, '-', 'موثق عبر كشف المعلمين'],
      ['6', 'إجمالي كشوفات الفصول المرصودة', `${submissions.length} من أصل ${classes.length}`, `${Math.round((submissions.length / (classes.length || 1)) * 100)}%`, submissions.length === classes.length ? 'مكتمل الرصد لجميع الفصول ✓' : 'جاري استكمال باقي الفصول ⏳'],
      [''],
      ['مدير المدرسة:', settings.principalName, '', 'وكيل الشؤون التعليمية:', settings.vicePrincipalName, '', 'وكيل شؤون الطلاب:', settings.vicePrincipalName]
    ];

    // 2. Tab 2: Live Absent & Tardy Students Roster
    const tab2Values = [
      [`سجل متابعة غياب وتأخر الطلاب المباشر — ${settings.schoolName}`],
      [`تاريخ الرصد: ${date} | إجمالي الحالات المرصودة: ${absentDetails.length} طالب | آخر تحديث: ${syncTimeStr}`],
      [''],
      ['م', 'اسم الطالب', 'الفصل', 'الصف الدراسي', 'حالة الحضور', 'سبب الغياب / التأخر', 'حالة التواصل مع ولي الأمر', 'جوال ولي الأمر', 'ملاحظات المعلم والإدارة'],
      ...(absentDetails.length > 0
        ? absentDetails.map((item, idx) => {
            const studentInfo = students.find(s => s.id === item.studentId || s.name === item.studentName);
            const statusLabel = 
              item.status === 'absent' ? 'غياب بدون عذر ❌' :
              item.status === 'excused' ? 'غياب بعذر معتمد 📄' : 'متأخر ⏱️';
            
            return [
              String(idx + 1),
              item.studentName,
              item.className,
              item.gradeLevel || '',
              statusLabel,
              item.reason || (item.status === 'absent' ? 'غير مبرر' : 'عذر مقبول'),
              item.contactedParent ? 'تم التواصل مع ولي الأمر ✓' : 'بانتظار التواصل',
              studentInfo?.parentPhone || '05xxxxxxxx',
              item.notes || 'لا توجد ملاحظات'
            ];
          })
        : [['1', 'لا توجد حالات غياب مرصودة لهذا التاريخ - نسبة الحضور 100%', '', '', '', '', '', '', '']])
    ];

    // 3. Tab 3: Classes Live Status
    const tab3Values = [
      [`حالة كشوفات الفصول ومربي الفصول — الحصة الثانية — ${settings.schoolName}`],
      [`تاريخ الرصد: ${date} | الحصة الثانية: من ${settings.period2StartTime} إلى ${settings.period2EndTime}`],
      [''],
      ['م', 'الفصل الدراسي', 'المرحلة / الصف', 'مربي الفصل / المعلم', 'حالة الرصد', 'وقت الرفع', 'إجمالي الطلاب', 'حضور', 'غياب مؤكد', 'غياب بعذر', 'متأخر'],
      ...classes.map((cls, idx) => {
        const sub = submissions.find(s => s.classId === cls.id);
        const isSubmitted = !!sub;
        const timeStr = sub ? new Date(sub.submittedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '-';

        return [
          String(idx + 1),
          cls.name,
          cls.gradeLevel,
          cls.teacherName,
          isSubmitted ? 'تم الاعتماد والرصد ✓' : 'بانتظار الرصد ⏳',
          timeStr,
          cls.studentCount,
          sub ? sub.presentCount : '-',
          sub ? sub.absentCount : '-',
          sub ? sub.excusedCount : '-',
          sub ? sub.lateCount : '-'
        ];
      })
    ];

    // Get spreadsheet sheet metadata to find sheet names
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    let sheetNames = ['المؤشرات والملخص اللحظي', 'سجل حضور وغياب الطلاب المباشر', 'حالة كشوفات الفصول والمعلمين'];

    if (metaRes.ok) {
      const metaData = await metaRes.json();
      if (metaData.sheets && metaData.sheets.length > 0) {
        sheetNames = metaData.sheets.map((s: any) => s.properties.title);
      }
    }

    const firstTab = sheetNames[0] || 'Sheet1';
    const secondTab = sheetNames[1] || sheetNames[0] || 'Sheet1';
    const thirdTab = sheetNames[2] || sheetNames[0] || 'Sheet1';

    // Prepare data payload for batch update
    const updatePayload = {
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: `'${firstTab}'!A1:Z50`,
          values: tab1Values
        },
        ...(sheetNames.length > 1
          ? [
              {
                range: `'${secondTab}'!A1:Z150`,
                values: tab2Values
              }
            ]
          : []),
        ...(sheetNames.length > 2
          ? [
              {
                range: `'${thirdTab}'!A1:Z60`,
                values: tab3Values
              }
            ]
          : [])
      ]
    };

    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!updateRes.ok) {
      const err = await updateRes.json().catch(() => ({}));
      const msg = err.error?.message || 'فشل تحديث البيانات في جدول Google Sheets';
      this.saveCloudSyncConfig({
        syncStatus: 'error',
        lastSyncMessage: msg
      });
      throw new Error(msg);
    }

    const totalRows = tab1Values.length + tab2Values.length + tab3Values.length;
    const nowIso = new Date().toISOString();
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    this.saveCloudSyncConfig({
      linkedSpreadsheetId: spreadsheetId,
      linkedSpreadsheetUrl: sheetUrl,
      lastSyncedAt: nowIso,
      syncStatus: 'success',
      totalSyncedRows: totalRows,
      lastSyncMessage: `تمت المزامنة بنجاح في ${syncTimeStr} (${totalRows} سطر تم تحديثه)`
    });

    AttendanceService.logAudit({
      userId: 'admin-1',
      userName: 'إدارة المدرسة',
      role: 'admin',
      action: 'مزامنة سحابية لحظية مع Google Sheets',
      details: `تمت المزامنة السحابية المباشرة لسجلات وتفاصيل غياب الحصة الثانية (${totalRows} سطر بيانات)`,
      type: 'settings_change'
    });

    return {
      success: true,
      timestamp: nowIso,
      rowsUpdated: totalRows,
      url: sheetUrl
    };
  }
}

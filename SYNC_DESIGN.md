# SYNC_DESIGN — خطة مزامنة نظام غياب مدرسة زيد بن ثابت

**الإصدار:** 1.1  
**التاريخ:** 2026-09-02  
**الحالة:** وثيقة تصميم فقط — لا تُنفَّذ في هذا المستند

---

## 0. الحالة الراهنة (مُتحقَّق من الكود)

| البند | الواقع في الكود | المرجع |
|-------|-----------------|--------|
| تخزين الحضور | `localStorage` فقط عبر `AttendanceService` — **لا استيراد لـ Firebase/Firestore** | `services/attendanceService.ts` (لا يوجد `firebase`) |
| Firebase | `firebase/app` + `firebase/auth` **فقط** لتسجيل Google OAuth | `googleSheetsService.ts`, `googleContactsService.ts` |
| مفاتيح التخزين الحالية | **`zbt_*_prod_v3`** (+ `zbt_student_referrals_prod_v1`) — **14** مفتاحاً في `STORAGE_KEYS` | `attendanceService.ts` سطور 17–32 |
| الكاش الداخلي | **12** كاشاً في الذاكرة | `attendanceService.ts` سطور 60–71 |
| Excel | مكتبة `xlsx` في `StudentImportModal.tsx`, `TimetableImportModal.tsx`, `timetableImportService.ts` | `import * as XLSX from 'xlsx'` |
| PII في الحزمة | `nationalId`, `phone`, `email` لـ **20** معلماً مضمّنة في الباندل | `services/teachersData.ts` → `INITIAL_USERS` |
| تسجيل الدخول | مطابقة رقم الجوال/الهوية/اسم المستخدم مع `getUsers()` المحلي — بدون خادم | `components/LoginModal.tsx` سطور 111–120 |
| الحصة الثانية | **07:45–08:30** (قيد ثابت) | `INITIAL_PERIODS` في `initialData.ts` |
| القاعدة الرسمية | **364** طالباً، **11** فصلاً، **20** معلماً (+ 2 مدير) | `officialStudentsData.ts`, `officialClassesData.ts`, `teachersData.ts` |
| ghiyabi | **غير موجود** في `/workspace` — بحث `find` عن `ghiyabi` و`schema.sql` و`artifacts/ghiyabi` أعاد صفر نتائج | — |

### الـ 12 كاش داخل `AttendanceService`

| # | المتغير | مفتاح localStorage المقابل |
|---|---------|---------------------------|
| 1 | `_cacheUsers` | `zbt_users_prod_v3` |
| 2 | `_cacheClasses` | `zbt_classes_prod_v3` |
| 3 | `_cacheStudents` | `zbt_students_prod_v3` |
| 4 | `_cacheSubmissions` | `zbt_submissions_prod_v3` |
| 5 | `_cacheSettings` | `zbt_settings_prod_v3` |
| 6 | `_cacheAuditLogs` | `zbt_logs_prod_v3` |
| 7 | `_cacheExcuses` | `zbt_excuses_prod_v3` |
| 8 | `_cacheReferrals` | `zbt_student_referrals_prod_v1` |
| 9 | `_cachePeriodAssignments` | `zbt_period_assignments_prod_v3` |
| 10 | `_cacheNotifications` | `zbt_notifications_prod_v3` |
| 11 | `_cacheTeacherReminders` | `zbt_teacher_reminders_prod_v3` |
| 12 | `_cacheCurrentUser` | `zbt_current_user_prod_v3` |

**ملاحظة:** مفاتيح إضافية خارج الكاش: `zbt_simulated_time_prod_v3`, `zbt_attendance_archives_prod_v3`, `zbt_last_activity_prod_v3`.

---

## 1. اختيار الخلفية (Backend)

### 1.1 الخيار المُختار: **Supabase Pro — مشروع PostgreSQL جديد مخصّص لـ ZBT**

**التبرير (سطران):**
1. نموذج البيانات علاقي (7 حصص × 5 أيام × 11 فصل × 20 معلم ≈ 770 خانة جدول أسبوعية + 55 كشف حضور أسبوعي للحصة 2) يتطلب SQL وقيود `UNIQUE` واضحة على `(class_id, date, period_number)` — PostgreSQL أنسب من مستندات NoSQL.
2. Supabase يوفّر Auth (OTP بالجوال)، Realtime (<3 ثوانٍ وفق قيد المشروع)، RLS، وREST تلقائي — يُكمّل `AttendanceService` كطبقة كاش دون إعادة كتابة `validatePeriodAttendance` أو منطق الحصة الثانية.

### 1.2 مقارنة الخيارات (تكلفة شهرية تقريبية — 20 معلم، 11 فصل، 364 طالب)

| الخيار | التكلفة (ر.س/شهر) | المزايا | العيوب | الحكم |
|--------|-------------------|---------|--------|-------|
| **A — Supabase Pro (مشروع ZBT جديد)** | **~94 ر.س** ($25) + **~33–83 ر.س** OTP SMS | SQL، RLS، Realtime، Edge Functions | تكلفة ثابتة؛ إعداد أولي | **✅ مُختار** |
| **B — إعادة استخدام ghiyabi Supabase** | **~0–38 ر.س** هامشي (مشترك) أو **~94 ر.س** إن فُصل | بنية جاهزة إن وُجدت | **لا يوجد `schema.sql` في المستودع**؛ خطر تداخل مدارس؛ المخطط قد لا يطابق `DayPeriodAssignment`/`ClassAttendanceSubmission`/`TimetableEntry` | ❌ غير مُوصى به دون مراجعة المصدر |
| **C — Firebase Firestore (Blaze)** | **~19–75 ر.س** (50K قراءة + 5K كتابة/يوم) | مذكور في AGENTS.md؛ Firebase Auth موجود للـ Google | **غير مُنفَّذ** في `attendanceService`؛ استعلامات الجدول معقّدة؛ تعارضات الحضور أصعب | ⚠️ بديل ثانٍ |
| **D — JSON يدوي (REMEDIATION 2-B)** | **0 ر.س** | بلا خادم | لا مزامنة تلقائية بين الأجهزة | ❌ مؤقت فقط — **لا يُنفَّذ للإنتاج** |

**تفصيل التكلفة لـ Supabase Pro:**
- الخطة: $25/شهر ≈ **94 ر.س** (سعر صرف 3.75)
- 20 معلم × ~22 يوم دراسي × 1 OTP صباحي ≈ **440 رسالة/شهر**
- Twilio/MessageBird: ~$0.02–0.05/رسالة → **33–83 ر.س** إضافية (أو Supabase Auth المدمج إن توفّر لمزود سعودي)
- **الإجمالي المتوقع: 94–175 ر.س/شهر**

### 1.3 تقييم ghiyabi

تم البحث في `/workspace` عن:
- مجلد `ghiyabi` — غير موجود
- `artifacts/ghiyabi/supabase/schema.sql` — غير موجود
- أي `schema.sql` أو مراجع `supabase` — تظهر فقط في هذه الوثيقة

**الاستنتاج:** لا يمكن تقييم إعادة الاستخدام دون الوصول إلى مستودع ghiyabi. إن وُجد لاحقاً، يجب التحقق من: (1) عزل `school_id`، (2) جداول `timetable_entries` للحصص 1–7، (3) RLS يمنع كشف PII، (4) توافق `attendance_submissions` مع `ClassAttendanceSubmission`. **حتى ذلك الحين: مشروع ZBT منفصل.**

### 1.4 ما لا يُنفَّذ (مع التبرير)

| الميزة | القرار | السبب |
|--------|--------|-------|
| مزامنة `contacts` | مؤجّل | `contactsService` منفصل (`zbt_contacts_prod_v2`) — أولوية الجدول والحضور |
| WebSocket مخصص | لا | Supabase Realtime كافٍ لـ <3 ثوانٍ |
| تغيير نافذة الحصة الثانية | ممنوع | قيد المشروع **07:45–08:30** |
| Face/NFC | لا | خارج نطاق المزامنة |

---

## 2. مخطط الجداول (PostgreSQL / Supabase)

**اتفاقيات:** `school_id` ثابت `'zbt-primary'`؛ المعرفات النصية تطابق الكود (`class-4-2`, `teacher-14`).

```sql
-- ============================================================
-- CORE ENTITIES
-- ============================================================

CREATE TABLE schools (
  id            TEXT PRIMARY KEY,              -- 'zbt-primary'
  name          TEXT NOT NULL,
  academic_year TEXT NOT NULL,                 -- '1447 - 1448 هـ'
  timezone      TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE teachers (
  id              TEXT PRIMARY KEY,            -- 'teacher-14'
  school_id       TEXT NOT NULL REFERENCES schools(id),
  sequence_number SMALLINT,
  username        TEXT NOT NULL,
  display_name    TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('teacher','admin')),
  subject         TEXT,
  assigned_class_id TEXT,
  avatar          TEXT,
  phone_hash      TEXT NOT NULL,               -- SHA-256(normalized_phone); never returned to client
  national_id_hash TEXT,                       -- SHA-256; admin-only via RLS
  email           TEXT,                        -- admin-only
  is_active       BOOLEAN NOT NULL DEFAULT true,
  auth_user_id    UUID UNIQUE,                 -- links to auth.users
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, username)
);

CREATE TABLE classes (
  id              TEXT PRIMARY KEY,            -- 'class-4-2'
  school_id       TEXT NOT NULL REFERENCES schools(id),
  name            TEXT NOT NULL,
  short_name      TEXT NOT NULL,               -- 'رابع 2'
  grade_level     TEXT NOT NULL,
  section         TEXT NOT NULL,
  room_number     TEXT,
  capacity        SMALLINT DEFAULT 35,
  color           TEXT,
  attendance_period SMALLINT NOT NULL DEFAULT 2,
  academic_year   TEXT,
  homeroom_teacher_id TEXT REFERENCES teachers(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE students (
  id              TEXT PRIMARY KEY,
  school_id       TEXT NOT NULL REFERENCES schools(id),
  class_id        TEXT NOT NULL REFERENCES classes(id),
  national_id     TEXT NOT NULL,
  student_number  TEXT,
  name            TEXT NOT NULL,
  grade_level     TEXT NOT NULL,
  class_name      TEXT NOT NULL,
  parent_name     TEXT,
  parent_phone    TEXT,                        -- admin + assigned teacher only (RLS)
  gender          TEXT CHECK (gender IN ('male','female')),
  nationality     TEXT DEFAULT 'سعودي',
  birth_date      DATE,
  home_phone      TEXT,
  chronic_condition BOOLEAN DEFAULT false,
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, national_id)
);

-- ============================================================
-- TIMETABLE (periods 1-7, full week)
-- ============================================================

CREATE TABLE period_schedules (
  id              SERIAL PRIMARY KEY,
  school_id       TEXT NOT NULL REFERENCES schools(id),
  period_number   SMALLINT NOT NULL CHECK (period_number BETWEEN 1 AND 7),
  name            TEXT NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  is_attendance_period BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (school_id, period_number)
);

CREATE TABLE timetable_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       TEXT NOT NULL REFERENCES schools(id),
  label           TEXT NOT NULL,               -- '1447-T1-v3'
  status          TEXT NOT NULL CHECK (status IN ('draft','pending_review','published','archived')),
  source          TEXT,                        -- 'excel_import' | 'manual' | 'migration'
  imported_by     TEXT REFERENCES teachers(id),
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Full timetable: every teacher slot periods 1-7
CREATE TABLE timetable_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       TEXT NOT NULL REFERENCES schools(id),
  teacher_id      TEXT NOT NULL REFERENCES teachers(id),
  class_id        TEXT NOT NULL REFERENCES classes(id),
  day_of_week     TEXT NOT NULL CHECK (day_of_week IN ('sunday','monday','tuesday','wednesday','thursday')),
  day_arabic      TEXT NOT NULL,
  period_number   SMALLINT NOT NULL CHECK (period_number BETWEEN 1 AND 7),
  subject         TEXT NOT NULL,
  version_id      UUID NOT NULL REFERENCES timetable_versions(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, version_id, teacher_id, day_of_week, period_number),
  UNIQUE (school_id, version_id, class_id, day_of_week, period_number)
);

-- Denormalized Period-2 assignments (mirrors DayPeriodAssignment)
CREATE TABLE daily_period_assignments (
  id              TEXT PRIMARY KEY,
  school_id       TEXT NOT NULL REFERENCES schools(id),
  class_id        TEXT NOT NULL REFERENCES classes(id),
  class_name      TEXT NOT NULL,
  day_of_week     TEXT NOT NULL,
  day_arabic      TEXT NOT NULL,
  teacher_id      TEXT NOT NULL REFERENCES teachers(id),
  teacher_name    TEXT NOT NULL,
  period_number   SMALLINT NOT NULL DEFAULT 2,
  subject         TEXT,
  notes           TEXT,
  version_id      UUID NOT NULL REFERENCES timetable_versions(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, version_id, class_id, day_of_week, period_number)
);

-- ============================================================
-- ATTENDANCE
-- ============================================================

CREATE TABLE attendance_submissions (
  id              TEXT PRIMARY KEY,
  school_id       TEXT NOT NULL REFERENCES schools(id),
  date            DATE NOT NULL,
  class_id        TEXT NOT NULL REFERENCES classes(id),
  class_name      TEXT NOT NULL,
  grade_level     TEXT NOT NULL,
  teacher_id      TEXT NOT NULL REFERENCES teachers(id),
  teacher_name    TEXT NOT NULL,
  period_number   SMALLINT NOT NULL DEFAULT 2,
  submitted_at    TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL,
  total_students  SMALLINT NOT NULL,
  present_count   SMALLINT NOT NULL,
  absent_count    SMALLINT NOT NULL,
  late_count      SMALLINT NOT NULL,
  excused_count   SMALLINT NOT NULL,
  verified_by_admin BOOLEAN DEFAULT false,
  notes           TEXT,
  client_device_id TEXT,
  client_op_id    UUID,
  UNIQUE (school_id, class_id, date, period_number)
);

CREATE TABLE attendance_student_items (
  id              BIGSERIAL PRIMARY KEY,
  submission_id   TEXT NOT NULL REFERENCES attendance_submissions(id) ON DELETE CASCADE,
  student_id      TEXT NOT NULL REFERENCES students(id),
  student_name    TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('present','absent','late','excused')),
  reason          TEXT,
  notes           TEXT,
  behavioral_note TEXT,
  minutes_late    SMALLINT,
  contacted_parent BOOLEAN DEFAULT false,
  UNIQUE (submission_id, student_id)
);

-- ============================================================
-- IMPORT / PUBLISH PIPELINE
-- ============================================================

CREATE TABLE import_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       TEXT NOT NULL REFERENCES schools(id),
  batch_type      TEXT NOT NULL CHECK (batch_type IN ('students','timetable','settings')),
  file_name       TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('uploaded','validated','approved','published','rejected')),
  row_count       INT NOT NULL DEFAULT 0,
  error_count     INT NOT NULL DEFAULT 0,
  preview_json    JSONB NOT NULL,
  validation_json JSONB,
  created_by      TEXT NOT NULL REFERENCES teachers(id),
  approved_by     TEXT REFERENCES teachers(id),
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SYNC METADATA
-- ============================================================

CREATE TABLE sync_cursors (
  device_id       TEXT NOT NULL,
  school_id       TEXT NOT NULL REFERENCES schools(id),
  entity          TEXT NOT NULL,
  last_synced_at  TIMESTAMPTZ NOT NULL,
  last_version    UUID,
  PRIMARY KEY (device_id, school_id, entity)
);

CREATE TABLE school_settings (
  school_id       TEXT PRIMARY KEY REFERENCES schools(id),
  settings_json   JSONB NOT NULL,
  version         INT NOT NULL DEFAULT 1,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**بذور `period_schedules` (من `INITIAL_PERIODS` في `initialData.ts`):**

| period_number | start_time | end_time | is_attendance_period |
|---------------|------------|----------|----------------------|
| 1 | 07:00 | 07:45 | false |
| 2 | 07:45 | 08:30 | **true** |
| 3 | 08:35 | 09:20 | false |
| 4 | 09:20 | 09:50 | false |
| 5 | 09:50 | 10:35 | false |
| 6 | 10:40 | 11:25 | false |
| 7 | 11:30 | 12:15 | false |

---

## 3. المصادقة (Authentication)

### 3.1 الوضع الحالي

في `LoginModal.tsx`، المعلم يُدخل رقم جواله؛ التطبيق يطابقه محلياً ضد `AttendanceService.getUsers()` الذي يُحمّل من `zbt_users_prod_v3` ← `INITIAL_USERS` ← `OFFICIAL_TEACHERS_LIST` في `teachersData.ts`. المصدر يتضمن `nationalId`, `phone`, `email` لكل معلم — **مرئي في DevTools وباندل JavaScript**.

المدير يستخدم `username` + `password` محلياً (بدون خادم).

### 3.2 المصادقة المقترحة

| الدور | الآلية | تكرار الدخول |
|-------|--------|--------------|
| **معلم (تابلت)** | Supabase Auth **Phone OTP** مرة واحدة صباحاً → جلسة **8 ساعات** (`refresh_token` في `httpOnly` cookie عبر Edge Function) | لا حاجة لحفظ كلمة مرور |
| **معلم (جلسة طويلة)** | بعد OTP أول مرة: **Device Trust Token** (`device_id` + `trusted_until`) في `localStorage` — 30 يوماً على نفس الجهاز | فتح التطبيق = دخول تلقائي |
| **مدير** | Email/password أو Google OAuth (موجود) + MFA اختياري | كل جلسة |

**سير صباح المعلم (بدون حفظ كلمة مرور):**
1. المعلم يفتح التطبيق على التابلت المدرسي (~07:30).
2. إن وُجد `zbt_device_trust_v1` صالح → دخول فوري.
3. وإلا: يُدخل رقم جواله (05xxxxxxxx) → OTP 6 أرقام (صالح 5 دقائق) → يُخزَّن الثقة على الجهاز.
4. `AttendanceService.setCurrentUser()` يستقبل ملفاً من API **بدون** `nationalId`/`phone`/`email`.

### 3.3 إزالة PII من الباندل الأمامي

| قبل | بعد |
|-----|-----|
| `teachersData.ts` كامل في الباندل (~20 معلم × PII) | `teachersPublic.ts`: `{ id, display_name, subject, avatar }` فقط (~3 KB) |
| `INITIAL_USERS` يدمج PII | `GET /api/teachers?role=teacher` للمدير فقط (RLS) |
| مطابقة الهاتف محلياً | `POST /auth/otp` على الخادم يطابق `phone_hash` |
| `students.parentPhone` للجميع | RLS: المعلم يرى طلاب فصله؛ `parent_phone` عند الغياب فقط |

```sql
-- server-side only (Edge Function)
phone_hash = encode(sha256(convert_to(normalize_saudi_phone(phone), 'UTF8')), 'hex')
-- normalize: strip non-digits, map 9665→05
```

**ما لا يُنفَّذ:** الاحتفاظ بمطابقة الهاتف المحلية كآلية احتياطية — يُبقي ثغرة PII في الباندل.

---

## 4. القراءة من الخادم + localStorage ككاش دون اتصال

### 4.1 طبقة SyncAdapter (مكوّن جديد — خارج نطاق التنفيذ هنا)

```
┌─────────────┐     read/write      ┌──────────────────┐
│  React UI   │ ◄─────────────────► │ AttendanceService │  (API عامة دون تغيير)
└─────────────┘                     │  12 caches        │
                                    │  zbt_*_prod_v4    │  ← ترقية عند التفعيل
                                    └────────┬─────────┘
                                             │
                                    ┌────────▼─────────┐
                                    │   SyncAdapter    │
                                    │ pull / push / RT │
                                    └────────┬─────────┘
                                             │
                                    ┌────────▼─────────┐
                                    │ Supabase REST/RT │
                                    └──────────────────┘
```

### 4.2 تفاعل SyncAdapter مع الـ 12 كاش

| الكاش | مفتاح v4 | اتجاه المزامنة | إبطال الكاش |
|-------|----------|----------------|-------------|
| `_cacheUsers` | `zbt_users_prod_v4` | سحب عند الدخول؛ المدير يدفع | `reloadScheduleCaches(['USERS'])` |
| `_cacheClasses` | `zbt_classes_prod_v4` | سحب + Realtime | `SCHEDULE_CHANGE_EVENT` |
| `_cacheStudents` | `zbt_students_prod_v4` | سحب كامل (364)؛ دفع عبر `import_batches` | بعد `published` |
| `_cacheSubmissions` | `zbt_submissions_prod_v4` | **دفع فوري** + سحب لليوم الحالي | دمج تدريجي — لا إبطال كامل |
| `_cacheSettings` | `zbt_settings_prod_v4` | سحب + Realtime | `SCHEDULE_CHANGE_EVENT` |
| `_cachePeriodAssignments` | `zbt_period_assignments_prod_v4` | سحب عند `timetable_versions.published` | `SCHEDULE_CHANGE_EVENT` |
| `_cacheAuditLogs` | `zbt_logs_prod_v4` | دفع فقط (append) | لا إعادة تحميل كاملة |
| `_cacheExcuses` | `zbt_excuses_prod_v4` | ثنائي الاتجاه | عند التحديث |
| `_cacheReferrals` | `zbt_student_referrals_prod_v1` | ثنائي | أولوية منخفضة |
| `_cacheNotifications` | `zbt_notifications_prod_v4` | سحب للمدير | Realtime |
| `_cacheTeacherReminders` | `zbt_teacher_reminders_prod_v4` | محلي + دفع | — |
| `_cacheCurrentUser` | `zbt_current_user_prod_v4` | **محلي فقط** | عند الخروج |

**قاعدة ذهبية:** `AttendanceService` يبقى مصدر الحقيقة للواجهة؛ SyncAdapter يكتب `localStorage` ثم يُبطّل الكاش أو يستدعي `reloadScheduleCaches()` — **لا تكرار منطق الأعمال**.

### 4.3 انقطاع الإنترنت أثناء الحصة الثانية

**السيناريو:** معلم يسجّل 08:10، الإنترنت ينقطع 08:15، يُكمل التعديلات ويضغط «رفع» 08:25.

| المرحلة | السلوك |
|---------|--------|
| 08:10–08:15 | كل تعديل → `_cacheSubmissions` + `localStorage` + `SyncAdapter.push()` ناجح |
| 08:15–08:25 | `push()` يفشل → يُضاف إلى `zbt_offline_queue_v1` (IndexedDB) مع `client_op_id` UUID |
| 08:25 Submit | `saveAttendanceSubmission()` يعمل محلياً (كما اليوم) + عنصر في الطابور |
| عودة الشبكة | `SyncAdapter.flushQueue()` — FIFO، idempotent عبر `client_op_id` |
| بعد 08:30 | التعديلات مقبولة إن كانت `submitted_at` ≤ 08:30 (وقت الجهاز + `server_received_at`) |

**مؤشر UI:** شريط «وضع دون اتصال — سيتم الرفع تلقائياً».

### 4.4 قاعدة التعارض — جهازان يرسلان لنفس الفصل

**المفتاح الفريد:** `(school_id, class_id, date, period_number)` — يطابق `ClassAttendanceSubmission`.

| الحالة | القاعدة |
|--------|---------|
| نفس `teacher_id`، أوقات مختلفة | **Last-Write-Wins** حسب `updated_at` الأكبر |
| `teacher_id` مختلف | **رفض** الثاني + إشعار للمدير — يطابق `validatePeriodAttendance` (المسند له فقط) |
| نفس `client_op_id` | **تجاهل** (idempotent retry) |
| دمج جزئي للطلاب | **لا يُنفَّذ** — الكشف وحدة ذرية (11 كشف/يوم للحصة 2) |

**لماذا لا CRDT؟** 11 فصلاً × كشف واحد/حصة = 55 كشف أسبوعياً كحد أقصى؛ التعارض نادر مع قيد المعلم المسند.

---

## 5. مسار رفع Excel للجدول المدرسي

### 5.1 المكوّنات الحالية (إعادة استخدام — لا مكتبة جديدة)

| النوع | المكوّن | الخدمة |
|-------|---------|--------|
| طلاب | `StudentImportModal.tsx` (3 خطوات: رفع → معاينة → اعتماد) | `XLSX.read` + `AttendanceService.saveStudentsBatch` |
| جدول | `TimetableImportModal.tsx` | `timetableImportService.ts` → `parseTimetableFile` |

### 5.2 المسار المقترح

```
Excel (.xlsx)
    │
    ▼
[1] Upload — نفس file input + XLSX.read (نمط StudentImportModal سطر 180)
    │
    ▼
[2] Preview — جدول معاينة + إحصائيات (نمط step 3 في StudentImportModal)
    │
    ▼
[3] Validate — timetableImportService
    │           • unmatchedTeachers[], unmatchedClasses[]
    │           • تعارضات: فصلان لنفس المعلم/اليوم/حصة
    ▼
[4] Admin Approve — «اعتماد للمراجعة» → import_batches.status = 'validated'
    │                diff قبل/بعد للإسنادات
    ▼
[5] Publish — POST /import-batches/:id/publish
    │         • INSERT timetable_versions + timetable_entries + daily_period_assignments
    │         • status = 'published'
    │         • Realtime → كل الأجهزة تسحب PERIOD_ASSIGNMENTS
    ▼
[6] All Devices — SyncAdapter يسمع published
                  → zbt_period_assignments_prod_v4
                  → dispatchScheduleChange('assignments')
```

**فرق عن الوضع الحالي:** `TimetableImportModal.handleApply()` يكتب `localStorage` على جهاز المدير فقط. بعد المزامنة: `handleApply` → `POST publish` → الخادم → جميع الأجهزة.

### 5.3 أعمدة Excel للجدول (من `timetableImportService.ts`)

| Column (Arabic) | Column (English alias) | Required |
|-----------------|------------------------|----------|
| اسم المعلم | teacher_name | yes |
| اليوم | day / dayArabic | yes |
| رقم الحصة | period / periodNumber | yes (1–7) |
| الفصل | class / className | yes |
| المادة | subject | yes |

---

## 6. الترحيل من أجهزة localStorage (`zbt_*_prod_v3`)

### 6.1 مبدأ: صفر فقدان لسجلات الحضور

**الأولوية:** `zbt_submissions_prod_v3` > `zbt_attendance_archives_prod_v3` > باقي المفاتيح.

### 6.2 أداة التصدير (مرة واحدة لكل جهاز)

```javascript
// MigrationExport — من لوحة المدير
const EXPORT_KEYS = [
  'zbt_submissions_prod_v3',
  'zbt_attendance_archives_prod_v3',
  'zbt_period_assignments_prod_v3',
  'zbt_students_prod_v3',
  'zbt_excuses_prod_v3',
  'zbt_logs_prod_v3',
  'zbt_student_referrals_prod_v1'
];
// Output: zbt_migration_bundle_<deviceId>_<date>.json
```

### 6.3 دمج على الخادم (Edge Function `merge-migration`)

| الكيان | قاعدة الدمج |
|--------|-------------|
| `attendance_submissions` | اتحاد حسب `id`؛ تعارض `(class_id, date, period_number)` → `updated_at` الأحدث؛ **لا حذف** |
| `attendance_archives` | إلحاق كامل — immutable |
| `students` | `national_id` فريد؛ دمج حقول غير فارغة |
| `daily_period_assignments` | الخادم (المنشور) يتفوّق على المحلي |
| `audit_logs` | إلحاق فقط |

### 6.4 خطوات الترحيل

1. **T-7:** نشر مفاتيح `v4` بجانب `v3` (قراءة مزدوجة، كتابة `v4` فقط).
2. **T-3:** جمع حزم JSON من كل جهاز (1 مدير + 20 معلم = 21 جهازاً).
3. **T-1:** `merge-migration` + تقرير تعارضات.
4. **T-0:** تفعيل المزامنة؛ الأجهزة تسحب الحالة الموحّدة.
5. **T+1:** التحقق: `COUNT(attendance_submissions)` على الخادم ≥ مجموع الأجهزة بعد إزالة التكرار.

### 6.5 ترقية المفاتيح

```
zbt_*_prod_v3  →  zbt_*_prod_v4  (+ zbt_sync_meta_v1, zbt_offline_queue_v1)
```

`initStorage()` يقرأ `v4` إن وُجد، وإلا يُرحّل من `v3` تلقائياً (نسخة واحدة).

---

## 7. خطة الانتقال

### 7.1 ما الذي يتعطّل أثناء الترحيل؟

| العنصر | التأثير | التخفيف |
|--------|---------|---------|
| تسجيل دخول المعلم | يتغير إلى OTP أول مرة | تدريب 15 دقيقة يوم T-3؛ Device Trust بعدها |
| مزامنة الجدول | تأخير 1–5 دقائق أثناء `publish` | لا تُنشر تغييرات جدول يوم T-0 |
| أجهزة لم تُصدّر | تفقد كاش محلي قديم | إجبار تصدير قبل T-0؛ الخادم يحتوي الحقيقة |
| Google Sheets/Contacts | **لا يتأثر** | Firebase Auth منفصل |
| الحصة الثانية | **يجب ألا تُرحَّل في يوم دراسي** | انظر النافذة |

### 7.2 النافذة الزمنية المقترحة

| البند | القيمة |
|-------|--------|
| **اليوم** | **الخميس** بعد انتهاء الحصة 7 (بعد **12:15**) |
| **المدة** | الخميس 12:30 → السبت 23:59 (لا دراسة الجمعة/السبت) |
| **التجميد** | من الخميس 12:00: لا تعديلات جدول؛ المعلمون يُكملون يومهم على `v3` |
| **القطع** | الأحد 06:00: جميع الأجهزة على `v4` + Sync إلزامي |
| **الرجوع** | نسخة احتياطية `v3` JSON على Google Drive للمدير |

### 7.3 قائمة تحقق يوم الترحيل

- [ ] تصدير من 21 جهازاً (1 مدير + 20 معلم)
- [ ] `merge-migration` بدون تعارضات حرجة
- [ ] `npm run build` للإصدار الجديد
- [ ] اختبار OTP لـ 3 معلمين
- [ ] اختبار: مدير يعدّل إسناد الأحد → يظهر عند معلم خلال 3 ثوانٍ
- [ ] اختبار: قطع شبكة أثناء رصد وهمي → استئناف الرفع

---

## 8. خارطة تنفيذ (مرجع — ليس نطاق التنفيذ الآن)

```
Phase Sync-1: Supabase schema + RLS + seed from officialStudentsData (364)
Phase Sync-2: SyncAdapter + v4 keys + offline queue (IndexedDB)
Phase Sync-3: Phone OTP + teachersPublic.ts (remove PII bundle)
Phase Sync-4: import_batches publish pipeline (reuse xlsx + StudentImportModal pattern)
Phase Sync-5: Migration tool + Thursday window cutover
```

---

## 9. ملخص القرارات

| # | القرار |
|---|--------|
| 1 | Supabase Pro مشروع ZBT جديد (~94–175 ر.س/شهر)؛ ghiyabi غير متاح للإعادة |
| 2 | 13 جدول SQL أعلاه؛ الحصة 2 مقيدة 07:45–08:30 |
| 3 | OTP صباحي + Device Trust 30 يوماً؛ إزالة PII من `teachersData.ts` |
| 4 | Server read → localStorage v4 → 12 caches؛ LWW للتعارض؛ طابور offline |
| 5 | Excel: Upload→Preview→Validate→Approve→Publish عبر `import_batches` |
| 6 | ترحيل `zbt_*_prod_v3` بحزم JSON + دمج بلا فقدان للحضور |
| 7 | نافذة ترحيل: **الخميس 12:30 – السبت 23:59**؛ تفعيل الأحد 06:00 |

---

*نهاية SYNC_DESIGN.md*

# SYNC_DESIGN — خطة مزامنة نظام غياب مدرسة زيد بن ثابت

**الإصدار:** 1.0  
**التاريخ:** 2026-09-02  
**الفرع المرجعي:** `cursor/timetable-excel-import-4f1e`  
**الحالة:** وثيقة تصميم فقط — لا تُنفَّذ في هذا المستند

---

## 0. الحالة الراهنة (مُتحقَّق من الكود)

| البند | الواقع في الكود |
|-------|-----------------|
| تخزين الحضور | `localStorage` فقط عبر `AttendanceService` — **لا يوجد Firestore** في `attendanceService.ts` |
| Firebase | `firebase/auth` فقط في `googleSheetsService.ts` و`googleContactsService.ts` (تصدير Google) |
| مفاتيح التخزين | `zbt_*_prod_v3` (+ `zbt_student_referrals_prod_v1`) — 15 مفتاحاً في `STORAGE_KEYS` |
| الكاش الداخلي | **12** كاشاً في الذاكرة: `_cacheUsers`, `_cacheClasses`, `_cacheStudents`, `_cacheSubmissions`, `_cacheSettings`, `_cacheAuditLogs`, `_cacheExcuses`, `_cacheReferrals`, `_cachePeriodAssignments`, `_cacheNotifications`, `_cacheTeacherReminders`, `_cacheCurrentUser` |
| Excel | مكتبة `xlsx` ^0.18.5 في `StudentImportModal`, `TimetableImportModal`, `timetableImportService` |
| PII في الحزمة | `teachersData.ts` يُضمَّن في الباندل: `nationalId`, `phone`, `email` لـ **20** معلماً |
| تسجيل الدخول | المعلم: مطابقة رقم الجوال/الهوية/اسم المستخدم مع `getUsers()` المحلي — بدون خادم |
| الحصة الثانية | **07:45–08:30** في `INITIAL_PERIODS` و`validatePeriodAttendance` |
| القاعدة | 364 طالباً، 11 فصلاً، ~20 معلماً |
| ghiyabi | **غير متوفر** على بيئة التطوير الحالية — لم يُعثر على `schema.sql` أو مجلد ghiyabi |

---

## 1. اختيار الخلفية (Backend)

### 1.1 الخيار المُختار: **Supabase (مشروع جديد مخصّص لـ ZBT)**

**التبرير (سطران):**
1. نموذج البيانات علاقي (جدول مدرسي 7 حصص × 5 أيام × 11 فصل × 20 معلم) يتطلب SQL وقيود فريدة واضحة لتعارضات الحضور — PostgreSQL أنسب من مستندات Firestore.
2. Supabase يوفّر Auth (OTP بالجوال)، Realtime (<3 ثوانٍ)، RLS، وREST تلقائي — يُكمّل `AttendanceService` كطبقة كاش دون إعادة كتابة منطق الأعمال.

### 1.2 مقارنة الخيارات

| الخيار | التكلفة الشهرية التقريبية (ريال سعودي) | المزايا | العيوب | الحكم |
|--------|------------------------------------------|---------|--------|-------|
| **A — Supabase Pro (مشروع ZBT جديد)** | **~94 ر.س** ($25/شهر) + ~0–19 ر.س SMS OTP | SQL، RLS، Realtime، Edge Functions للاستيراد | تكلفة ثابتة؛ يحتاج إعداد أولي | **✅ مُختار** |
| **B — إعادة استخدام ghiyabi Supabase** | **~0–38 ر.س** هامشي (مشترك على Pro) أو **~94 ر.س** إن فُصل | بنية جاهزة إن وُجدت | **غير قابل للتحقق** على VM؛ خطر تداخل بيانات مدارس؛ مخطط ghiyabi قد لا يطابق `DayPeriodAssignment`/`ClassAttendanceSubmission` | ❌ غير مُوصى به دون مراجعة `schema.sql` |
| **C — Firebase Firestore** | **~19–75 ر.س** (Blaze، تقدير 50K قراءة + 5K كتابة/يوم) | مذكور في AGENTS.md؛ Firebase Auth موجود | **غير مُنفَّذ** في `attendanceService`؛ استعلامات الجدول معقّدة؛ تعارضات الحضور أصعب | ⚠️ بديل ثانٍ فقط |
| **D — JSON يدوي (REMEDIATION 2-B)** | **0 ر.س** | بلا خادم | لا يحقق مزامنة تلقائية؛ غير مقبول للإنتاج | ❌ مؤقت فقط |

**تفصيل التكلفة لـ Supabase Pro (~94 ر.س/شهر):**
- الخطة: $25/شهر ≈ 94 ر.س (سعر صرف 3.75)
- 20 معلم × ~22 يوم دراسي × 1 OTP صباحي ≈ 440 رسالة/شهر
- Twilio/MessageBird OTP: ~$0.02–0.05/رسالة → **~33–83 ر.س** إضافية إن لم تُستخدم Supabase Auth المدمج
- **الإجمالي المتوقع: 94–175 ر.س/شهر** لمدرسة واحدة (20 معلم، 11 فصل، 364 طالب)

**ملاحظة ghiyabi:** بما أن المستودع غير متاح، يُفترض أن ghiyabi نظام حضور عام على Supabase. إعادة الاستخدام تتطلب: (1) عزل `school_id`، (2) جداول `timetable_entries` متوافقة، (3) عدم كشف PII عبر RLS. **بدون schema.sql لا يُنصح بالدمج** — أنشئ مشروع ZBT منفصلاً.

### 1.3 ما لا يُنفَّذ (مع التبرير)

| الميزة | القرار | السبب |
|--------|--------|-------|
| مزامنة `contacts` عبر الخادم | مؤجّل | `contactsService` منفصل (`zbt_contacts_prod_v2`) — أولوية الجدول والحضور |
| WebSocket مخصص | لا | Supabase Realtime كافٍ |
| Face/NFC | لا | خارج نطاق المزامنة |
| تغيير نافذة الحصة الثانية | ممنوع | قيد المشروع 07:45–08:30 |

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
  assigned_class_id TEXT,                      -- homeroom hint only
  avatar          TEXT,
  phone_hash      TEXT NOT NULL,               -- SHA-256(phone_normalized); NEVER store plain phone in API responses to teachers
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
  section         TEXT NOT NULL,               -- '1'..'3'
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
  id              TEXT PRIMARY KEY,            -- 's_...' or stable uuid
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
  name            TEXT NOT NULL,               -- 'الحصة الثانية (فترة الرصد المعتمدة)'
  start_time      TIME NOT NULL,               -- '07:45:00'
  end_time        TIME NOT NULL,               -- '08:30:00'
  is_attendance_period BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (school_id, period_number)
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
  version_id      UUID NOT NULL,               -- FK to published timetable version
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, version_id, teacher_id, day_of_week, period_number),
  UNIQUE (school_id, version_id, class_id, day_of_week, period_number) -- one teacher per class/period/day
);

-- Denormalized Period-2 assignments (mirrors DayPeriodAssignment + fast lookup)
CREATE TABLE daily_period_assignments (
  id              TEXT PRIMARY KEY,            -- matches local 'id' field
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
  version_id      UUID NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, version_id, class_id, day_of_week, period_number)
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

-- ============================================================
-- ATTENDANCE
-- ============================================================

CREATE TABLE attendance_submissions (
  id              TEXT PRIMARY KEY,            -- preserve local ids during migration
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
  client_op_id    UUID,                        -- idempotency key from offline queue
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
  preview_json    JSONB NOT NULL,              -- parsed rows before commit
  validation_json JSONB,                       -- unmatchedTeachers, warnings, etc.
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
  entity          TEXT NOT NULL,               -- 'submissions' | 'timetable' | 'students' ...
  last_synced_at  TIMESTAMPTZ NOT NULL,
  last_version    UUID,
  PRIMARY KEY (device_id, school_id, entity)
);

CREATE TABLE school_settings (
  school_id       TEXT PRIMARY KEY REFERENCES schools(id),
  settings_json   JSONB NOT NULL,              -- mirrors SchoolSettings
  version         INT NOT NULL DEFAULT 1,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**بذور `period_schedules` (من `INITIAL_PERIODS`):**

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

```typescript
// LoginModal.tsx — teacher login
// Match: phone digits, nationalId, username against AttendanceService.getUsers()
// Source: teachersData.ts bundled → INITIAL_USERS → zbt_users_prod_v3
```

**مخاطر:** أي شخص يفتح DevTools يرى أرقام الجوال والهويات في الباندل (`teachersData.ts`).

### 3.2 المصادقة المقترحة

| الدور | الآلية | تكرار الدخول |
|-------|--------|--------------|
| **معلم (تابلت)** | Supabase Auth **Phone OTP** مرة واحدة صباحاً → جلسة **8 ساعات** (`refresh_token` في `httpOnly` cookie عبر Edge Function) | لا حاجة لحفظ كلمة مرور |
| **معلم (جلسة طويلة)** | بعد OTP أول مرة: **Device Trust Token** (`device_id` + `trusted_until`) في `localStorage` — 30 يوماً على نفس الجهاز | فتح التطبيق = دخول تلقائي |
| **مدير** | Email/password أو Google OAuth (موجود) + MFA اختياري | كل جلسة |

**سير صباح المعلم (بدون حفظ كلمة مرور):**
1. المعلم يفتح التطبيق على التابلت المدرسي (07:30).
2. إن وُجد `zbt_device_trust_v1` صالح → دخول فوري.
3. وإلا: يُدخل رقم جواله (05xxxxxxxx) → OTP 6 أرقام (صالح 5 دقائق) → يُخزَّن الثقة على الجهاز.
4. `AttendanceService.setCurrentUser()` يستقبل ملفاً من API **بدون** `nationalId`/`phone`/`email`.

### 3.3 إزالة PII من الباندل الأمامي

| قبل | بعد |
|-----|-----|
| `teachersData.ts` كامل في الباندل | `teachersPublic.ts`: `{ id, display_name, subject, avatar }` فقط (~3 KB) |
| `INITIAL_USERS` يدمج PII | `GET /api/teachers?role=teacher` للمدير فقط (RLS) |
| مطابقة الهاتف محلياً | `POST /auth/otp` على الخادم يطابق `phone_hash` |
| `students.parentPhone` للجميع | RLS: المعلم يرى طلاب فصله فقط؛ ولي الأمر مخفي في قائمة المعلم إلا عند الغياب |

**تنفيذ `phone_hash`:**
```sql
-- server-side only
phone_hash = encode(sha256(normalize_saudi_phone(phone)::bytea), 'hex')
-- normalize: strip non-digits, map 9665→05
```

---

## 4. القراءة من الخادم + localStorage ككاش دون اتصال

### 4.1 طبقة SyncAdapter (جديدة — خارج نطاق هذا المستند)

```
┌─────────────┐     read/write      ┌──────────────────┐
│  React UI   │ ◄─────────────────► │ AttendanceService │  (unchanged public API)
└─────────────┘                     │  12 caches        │
                                    │  zbt_*_prod_v4    │  ← version bump on sync
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

| الكاش | مفتاح localStorage | اتجاه المزامنة | إبطال الكاش |
|-------|-------------------|----------------|-------------|
| `_cacheUsers` | `zbt_users_prod_v4` | سحب عند الدخول؛ المدير فقط يدفع | `null` + `reloadScheduleCaches(['USERS'])` |
| `_cacheClasses` | `zbt_classes_prod_v4` | سحب + Realtime | نفس النمط |
| `_cacheStudents` | `zbt_students_prod_v4` | سحب كامل (~364)؛ دفع عبر `import_batches` | بعد `published` |
| `_cacheSubmissions` | `zbt_submissions_prod_v4` | **دفع فوري** + سحب لليوم الحالي | لا تُبطَل كاملة — دمج تدريجي |
| `_cacheSettings` | `zbt_settings_prod_v4` | سحب + Realtime | `SCHEDULE_CHANGE_EVENT` |
| `_cachePeriodAssignments` | `zbt_period_assignments_prod_v4` | سحب عند `timetable_versions.published` | `SCHEDULE_CHANGE_EVENT` |
| `_cacheAuditLogs` | `zbt_logs_prod_v4` | دفع فقط (append) | لا يُعاد تحميله كاملاً |
| `_cacheExcuses` | `zbt_excuses_prod_v4` | ثنائي الاتجاه | عند التحديث |
| `_cacheReferrals` | `zbt_student_referrals_prod_v1` | ثنائي | منخفض الأولوية |
| `_cacheNotifications` | `zbt_notifications_prod_v4` | سحب للمدير | Realtime |
| `_cacheTeacherReminders` | `zbt_teacher_reminders_prod_v4` | محلي + دفع | — |
| `_cacheCurrentUser` | `zbt_current_user_prod_v4` | **محلي فقط** — لا يُزامَن | عند الخروج |

**قاعدة ذهبية:** `AttendanceService` يبقى مصدر الحقيقة للواجهة؛ SyncAdapter يكتب `localStorage` ثم يستدعي `reloadScheduleCaches()` أو يُعيّن الكاش مباشرة — **لا تكرار منطق الأعمال**.

### 4.3 انقطاع الإنترنت أثناء الحصة الثانية

**السيناريو:** معلم يسجّل 08:10، الإنترنت ينقطع 08:15، يُكمل التعديلات ويضغط «رفع» 08:25.

| المرحلة | السلوك |
|---------|--------|
| 08:10–08:15 | كل تعديل → `_cacheSubmissions` + `localStorage` + `SyncAdapter.push()` ناجح |
| 08:15–08:25 | `push()` يفشل → يُضاف إلى `zbt_offline_queue_v1` (IndexedDB) مع `client_op_id` UUID |
| 08:25 Submit | `saveAttendanceSubmission()` يعمل محلياً (كما اليوم) + عنصر في الطابور |
| عودة الشبكة | `SyncAdapter.flushQueue()` — FIFO، idempotent عبر `client_op_id` |
| بعد 08:30 | التعديلات مقبولة إن كانت `submitted_at` ≤ 08:30 (وقت الجهاز موثّق + `server_received_at`) |

**مؤشر UI:** شريط «وضع دون اتصال — سيتم الرفع تلقائياً» (موجود نمط مشابه لـ offline draft).

### 4.4 قاعدة التعارض — جهازان يرسلان لنفس الفصل

**المفتاح الفريد:** `(school_id, class_id, date, period_number)`

| الحالة | القاعدة |
|--------|---------|
| نفس `teacher_id`، أوقات مختلفة | **Last-Write-Wins** حسب `updated_at` الأكبر |
| `teacher_id` مختلف | **رفض** الثاني + إشعار للمدير (`attendance_conflict`) — يطابق `validatePeriodAttendance` (المسند له فقط) |
| نفس `client_op_id` | **تجاهل** (idempotent retry) |
| دمج جزئي للطلاب | **لا يُنفَّذ** — كشف الحضور وحدة ذرية (11 كشف/يوم/فصل)؛ التعقيد لا يستحقه لـ 11 فصل |

**لماذا لا CRDT؟** 11 فصلاً × كشف واحد/حصة = 55 كشف أسبوعياً كحد أقصى للحصة 2؛ التعارض نادر إن قُيّد المعلم المسند.

---

## 5. مسار رفع Excel

### 5.1 أنواع الاستيراد

| النوع | المكوّن الحالي | الخدمة |
|-------|---------------|--------|
| طلاب | `StudentImportModal` (3 خطوات) | `AttendanceService.saveStudentsBatch` |
| جدول | `TimetableImportModal` | `timetableImportService.parseTimetableFile` |

### 5.2 المسار المقترح (جدول + طلاب)

```
Excel (.xlsx)
    │
    ▼
[1] Upload — نفس file input + XLSX.read (لا مكتبات جديدة)
    │
    ▼
[2] Preview — جدول معاينة + إحصائيات (نمط StudentImportModal step 3)
    │
    ▼
[3] Validate — timetableImportService / منطق StudentImportModal
    │           • unmatchedTeachers[], unmatchedClasses[]
    │           • تعارضات الحصة 2 (فصلان لنفس المعلم/اليوم/حصة)
    ▼
[4] Admin Approve — زر «اعتماد للمراجعة» → import_batches.status = 'validated'
    │                المدير يراجع diff: قبل/بعد للإسنادات
    ▼
[5] Publish — POST /import-batches/:id/publish
    │         • INSERT timetable_versions + timetable_entries + daily_period_assignments
    │         • status = 'published'
    │         • Realtime broadcast → كل الأجهزة تسحب PERIOD_ASSIGNMENTS
    ▼
[6] All Devices — SyncAdapter يسمع `timetable_versions` WHERE status='published'
                  → يحدّث zbt_period_assignments_prod_v4
                  → dispatchScheduleChange('assignments')
```

**فرق عن الوضع الحالي:** `TimetableImportModal.handleApply()` يكتب `localStorage` مباشرة على جهاز المدير فقط. بعد المزامنة: `handleApply` → `POST publish` → الخادم → جميع الأجهزة.

### 5.3 أعمدة Excel للجدول (موثّقة في `timetableImportService`)

| Column (Arabic) | Column (English alias) | Required |
|-----------------|------------------------|----------|
| اسم المعلم | teacher_name | yes |
| اليوم | day / dayArabic | yes |
| رقم الحصة | period / periodNumber | yes (1–7) |
| الفصل | class / className | yes |
| المادة | subject | yes |

---

## 6. الترحيل من أجهزة localStorage (`zbt_*`)

### 6.1 مبدأ: صفر فقدان لسجلات الحضور

**الأولوية:** `zbt_submissions_prod_v3` > `zbt_attendance_archives_prod_v3` > باقي المفاتيح.

### 6.2 أداة التصدير (مرة واحدة لكل جهاز)

```javascript
// MigrationExport — يُشغَّل من وحدة تحكم المدير
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
| `attendance_submissions` | اتحاد حسب `id`؛ إن تعارض `(class_id, date, period_number)` → احتفظ بـ `updated_at` الأحدث؛ **لا حذف** — سجل قديم في `attendance_submissions_audit` |
| `attendance_archives` | إلحاق كامل — immutable |
| `students` | `national_id` فريد؛ دمج حقول غير فارغة |
| `period_assignments` | بعد الدمج: تطبيق `timetable_versions` المنشور من المدير (الخادم يتفوّق) |
| `audit_logs` | إلحاق فقط |

### 6.4 خطوات الترحيل

1. **T-7 أيام:** نشر `v4` keys بجانب `v3` (قراءة مزدوجة، كتابة `v4` فقط).
2. **T-3:** جمع حزم JSON من كل جهاز (مدير + 20 معلم).
3. **T-1:** `merge-migration` على Supabase + تقرير تعارضات.
4. **T-0 (نافذة الترحيل):** تفعيل المزامنة؛ الأجهزة تسحب الحالة الموحّدة.
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
Phase Sync-1: Supabase schema + RLS + seed from officialStudentsData
Phase Sync-2: SyncAdapter + v4 keys + offline queue
Phase Sync-3: Phone OTP + teachersPublic.ts (remove PII bundle)
Phase Sync-4: import_batches publish pipeline
Phase Sync-5: Migration tool + Thursday window cutover
```

---

## 9. ملخص القرارات

| # | القرار |
|---|--------|
| 1 | Supabase Pro مشروع ZBT جديد (~94–175 ر.س/شهر) |
| 2 | 15 جدول SQL أعلاه؛ الحصة 2 مقيدة 07:45–08:30 |
| 3 | OTP صباحي + Device Trust؛ إزالة `teachersData` PII من الباندل |
| 4 | Server read → localStorage v4 → 12 caches؛ LWW للتعارض |
| 5 | Excel: Upload→Preview→Validate→Approve→Publish عبر `import_batches` |
| 6 | ترحيل `zbt_*_v3` بحزم JSON + دمج بلا فقدان للحضور |
| 7 | نافذة ترحيل: **الخميس 12:30 – السبت 23:59** |

---

*نهاية SYNC_DESIGN.md*

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

-- A phone number or national id must identify exactly one active teacher
-- (admin-manage also checks, this is the database backstop). Admin rows are
-- excluded: they never log in by phone and currently share a placeholder hash.

CREATE UNIQUE INDEX IF NOT EXISTS teachers_phone_hash_teacher_uq
  ON public.teachers (school_id, phone_hash)
  WHERE role = 'teacher' AND is_active;

CREATE UNIQUE INDEX IF NOT EXISTS teachers_national_id_hash_teacher_uq
  ON public.teachers (school_id, national_id_hash)
  WHERE role = 'teacher' AND is_active AND national_id_hash IS NOT NULL;

-- Student national / iqama ids are no longer collected, shown or used by the app.
-- Step 1 (this migration, additive and backward compatible): stop requiring the
-- column and drop its per-school uniqueness, so students can be created and
-- edited without one. Existing values are left in place; purging them is a
-- separate, deliberate step (see the PR description).
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_school_id_national_id_key;
ALTER TABLE public.students ALTER COLUMN national_id DROP NOT NULL;

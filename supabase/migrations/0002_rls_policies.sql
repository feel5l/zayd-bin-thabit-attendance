-- ============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER to avoid recursive RLS lookups)
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_teacher_id()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM teachers WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM teachers
    WHERE auth_user_id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;

-- Current weekday key in Asia/Riyadh, matching WeekDayKey ('sunday'..'thursday')
CREATE OR REPLACE FUNCTION public.current_school_day()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT lower(to_char(now() AT TIME ZONE 'Asia/Riyadh', 'FMDay'));
$$;

REVOKE EXECUTE ON FUNCTION public.current_teacher_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

-- ============================================================
-- TEACHERS
-- ============================================================

CREATE POLICY "teachers_select_own" ON teachers
  FOR SELECT TO authenticated
  USING (id = current_teacher_id() OR is_admin());

CREATE POLICY "teachers_admin_write" ON teachers
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Non-PII directory every signed-in teacher can read (names/avatars only)
CREATE VIEW public.teachers_directory
WITH (security_invoker = true) AS
  SELECT id, school_id, display_name, subject, assigned_class_id, avatar, role, is_active
  FROM teachers;

GRANT SELECT ON public.teachers_directory TO authenticated;

-- ============================================================
-- SCHOOLS / CLASSES / PERIOD SCHEDULES / SCHOOL SETTINGS
-- (non-sensitive shared reference data — readable by any signed-in teacher)
-- ============================================================

CREATE POLICY "schools_read" ON schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "schools_admin_write" ON schools FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "classes_read" ON classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "classes_admin_write" ON classes FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "period_schedules_read" ON period_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "period_schedules_admin_write" ON period_schedules FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "school_settings_read" ON school_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "school_settings_admin_write" ON school_settings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- STUDENTS — a teacher sees only students in a class they teach today
-- (homeroom OR today's period-2 assignment); admin sees everyone
-- ============================================================

CREATE POLICY "students_teacher_scoped" ON students
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR class_id IN (SELECT assigned_class_id FROM teachers WHERE id = current_teacher_id())
    OR class_id IN (
      SELECT class_id FROM daily_period_assignments
      WHERE teacher_id = current_teacher_id() AND day_of_week = current_school_day()
    )
  );

CREATE POLICY "students_admin_write" ON students
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- TIMETABLE
-- ============================================================

CREATE POLICY "timetable_entries_own_or_admin" ON timetable_entries
  FOR SELECT TO authenticated
  USING (is_admin() OR teacher_id = current_teacher_id());

CREATE POLICY "timetable_entries_admin_write" ON timetable_entries
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Every teacher needs the full daily period-2 roster to know who is
-- covering which class today (matches today's client-side behaviour).
CREATE POLICY "daily_period_assignments_read" ON daily_period_assignments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "daily_period_assignments_admin_write" ON daily_period_assignments
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "timetable_versions_published_or_admin" ON timetable_versions
  FOR SELECT TO authenticated
  USING (is_admin() OR status = 'published');

CREATE POLICY "timetable_versions_admin_write" ON timetable_versions
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- ATTENDANCE — a teacher may only read/write their own submissions
-- ============================================================

CREATE POLICY "attendance_submissions_own_or_admin_select" ON attendance_submissions
  FOR SELECT TO authenticated
  USING (is_admin() OR teacher_id = current_teacher_id());

CREATE POLICY "attendance_submissions_own_insert" ON attendance_submissions
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR teacher_id = current_teacher_id());

CREATE POLICY "attendance_submissions_own_update" ON attendance_submissions
  FOR UPDATE TO authenticated
  USING (is_admin() OR teacher_id = current_teacher_id())
  WITH CHECK (is_admin() OR teacher_id = current_teacher_id());

CREATE POLICY "attendance_submissions_admin_delete" ON attendance_submissions
  FOR DELETE TO authenticated USING (is_admin());

CREATE POLICY "attendance_student_items_scoped_select" ON attendance_student_items
  FOR SELECT TO authenticated
  USING (
    is_admin() OR submission_id IN (
      SELECT id FROM attendance_submissions WHERE teacher_id = current_teacher_id()
    )
  );

CREATE POLICY "attendance_student_items_scoped_write" ON attendance_student_items
  FOR ALL TO authenticated
  USING (
    is_admin() OR submission_id IN (
      SELECT id FROM attendance_submissions WHERE teacher_id = current_teacher_id()
    )
  )
  WITH CHECK (
    is_admin() OR submission_id IN (
      SELECT id FROM attendance_submissions WHERE teacher_id = current_teacher_id()
    )
  );

-- ============================================================
-- IMPORT PIPELINE — admin only, teachers never touch this table
-- ============================================================

CREATE POLICY "import_batches_admin_only" ON import_batches
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- SYNC METADATA — low-sensitivity bookkeeping, any signed-in device
-- ============================================================

CREATE POLICY "sync_cursors_own_device" ON sync_cursors
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

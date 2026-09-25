-- Remove every row the QA scripts create. Run with apply_migration
-- (execute_sql is read-only). Safe to run repeatedly.
--
-- FIRST (read-only, execute_sql): no Period-2 assignment may still point at a
-- test teacher (a run that stopped after step 11). Must return 0 rows;
-- otherwise restore it with admin-manage assignment.setMany using the
-- RESTORE-INFO line admin_api.mjs printed, then run this file.
--   SELECT class_id, day_of_week FROM daily_period_assignments WHERE teacher_id LIKE 'e2e_%';

DELETE FROM attendance_student_items WHERE submission_id IN
  (SELECT id FROM attendance_submissions WHERE teacher_id LIKE 'e2e_%');
DELETE FROM attendance_submissions WHERE teacher_id LIKE 'e2e_%';
DELETE FROM attendance_student_items WHERE student_id LIKE 's_e2e_%';
DELETE FROM students WHERE id LIKE 's_e2e_%';
DELETE FROM device_tokens WHERE teacher_id LIKE 'e2e_%' OR label IN ('e2e-admin-api', 'prod-qa');
DELETE FROM teachers WHERE id LIKE 'e2e_%';

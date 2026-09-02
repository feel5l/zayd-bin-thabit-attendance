-- The source timetable (OFFICIAL_TIMETABLE_RECORDS) has real overlaps where
-- two teachers are both recorded against the same class/day/period outside
-- period 2 (e.g. co-taught or historical data-entry artifacts). Only period 2
-- is operationally enforced single-teacher (via daily_period_assignments,
-- which keeps its own UNIQUE constraint). Drop the class-side uniqueness here
-- so the full raw timetable can be stored as-is; keep the teacher-side one
-- (a teacher physically cannot teach two classes at once).
ALTER TABLE timetable_entries DROP CONSTRAINT timetable_entries_school_id_version_id_class_id_day_of_week_key;

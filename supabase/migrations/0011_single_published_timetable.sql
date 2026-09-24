-- Timetable publishing: exactly one published version per school, switched
-- atomically. Used by the publish-import-batch Edge Function (service_role).
-- submit-attendance and get-schedule read daily_period_assignments for the
-- published version only, so a second version can no longer make their
-- maybeSingle() lookups fail.

CREATE UNIQUE INDEX IF NOT EXISTS timetable_versions_one_published
  ON public.timetable_versions (school_id)
  WHERE status = 'published';

CREATE OR REPLACE FUNCTION public.publish_timetable_version(p_school_id text, p_version_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM timetable_versions
    WHERE id = p_version_id AND school_id = p_school_id AND status = 'draft'
  ) THEN
    RAISE EXCEPTION 'version % is not a draft of school %', p_version_id, p_school_id;
  END IF;

  UPDATE timetable_versions SET status = 'archived'
  WHERE school_id = p_school_id AND status = 'published';

  UPDATE timetable_versions SET status = 'published', published_at = now()
  WHERE id = p_version_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.publish_timetable_version(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_timetable_version(text, uuid) TO service_role;

-- Fix mutable search_path on current_school_day
CREATE OR REPLACE FUNCTION public.current_school_day()
RETURNS TEXT
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT lower(to_char(now() AT TIME ZONE 'Asia/Riyadh', 'FMDay'));
$$;

-- REVOKE EXECUTE FROM anon only left a PUBLIC grant in place, which anon
-- and authenticated both inherit. Lock these down properly: no anonymous
-- access at all; authenticated keeps access because the RLS policies that
-- reference these functions must be able to call them for signed-in users.
REVOKE EXECUTE ON FUNCTION public.current_teacher_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_teacher_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

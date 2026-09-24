-- Security review S4/S5/S6: throttle failed logins and give device tokens a
-- lifetime. All objects are service_role only (Edge Functions).

-- ── Failed-login throttle ────────────────────────────────────────────────
-- Only FAILURES are recorded, so a whole school behind one NAT IP can still
-- sign in at 07:45; guessing phone numbers / the admin password cannot.
CREATE TABLE IF NOT EXISTS public.login_failures (
  id           BIGSERIAL PRIMARY KEY,
  bucket       TEXT NOT NULL,          -- e.g. 'admin:ip:1.2.3.4', 'teacher:ip:1.2.3.4', 'admin:global'
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_failures_bucket_time_idx
  ON public.login_failures (bucket, attempted_at DESC);
ALTER TABLE public.login_failures ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.login_is_throttled(p_bucket text, p_max integer, p_window_seconds integer)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT count(*) >= p_max
  FROM login_failures
  WHERE bucket = p_bucket
    AND attempted_at > now() - make_interval(secs => p_window_seconds);
$function$;

CREATE OR REPLACE FUNCTION public.record_login_failure(p_buckets text[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  DELETE FROM login_failures WHERE attempted_at < now() - interval '1 day';
  INSERT INTO login_failures (bucket) SELECT unnest(p_buckets);
$function$;

REVOKE EXECUTE ON FUNCTION public.login_is_throttled(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_login_failure(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login_is_throttled(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_login_failure(text[]) TO service_role;

-- ── Device token lifetime ────────────────────────────────────────────────
-- Teachers: 120 days (a school term); admin-login sets 30 days explicitly.
ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '120 days');

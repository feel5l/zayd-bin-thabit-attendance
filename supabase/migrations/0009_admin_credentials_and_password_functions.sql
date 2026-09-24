-- Admin password storage + helpers used by the admin-login Edge Function.
-- Mirrors what was applied remotely on 2026-09-02 (remote migrations
-- `device_tokens_and_admin_credentials` + `admin_password_functions`), which
-- had never been committed. Idempotent so it is safe on the live project.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.admin_credentials (
  school_id     TEXT PRIMARY KEY REFERENCES public.schools(id),
  password_hash TEXT NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Service-role only: RLS on, no policies.
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_admin_password(p_school_id text, p_password text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  INSERT INTO admin_credentials (school_id, password_hash, updated_at)
  VALUES (p_school_id, extensions.crypt(p_password, extensions.gen_salt('bf', 12)), now())
  ON CONFLICT (school_id)
  DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = now();
$function$;

CREATE OR REPLACE FUNCTION public.verify_admin_password(p_school_id text, p_password text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM admin_credentials
    WHERE school_id = p_school_id
      AND password_hash = extensions.crypt(p_password, password_hash)
  );
$function$;

-- Close public RPC access to admin password functions (security review S1).
-- These SECURITY DEFINER functions were executable by anon/authenticated via
-- /rest/v1/rpc/*, so anyone holding the public anon key could reset the admin
-- password. Only the admin-login Edge Function (service_role) needs them.
-- rls_auto_enable is an event-trigger helper and never needs API access.
-- is_admin()/current_teacher_id() are left as-is: RLS policies call them.

REVOKE EXECUTE ON FUNCTION public.set_admin_password(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_admin_password(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.set_admin_password(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_admin_password(text, text) TO service_role;

-- sync_cursors had a policy named "sync_cursors_own_device" whose predicate was
-- USING (true) WITH CHECK (true): any signed-in (authenticated) JWT could read
-- and write every device's cursor. Nothing in the app or the edge functions
-- reads or writes this table (edge functions use service_role, which bypasses
-- RLS), so the safest fix is to remove the policy: with RLS enabled and no
-- policy, only service_role can access the table.
--
-- NOT APPLIED to any hosted database by the author of this patch. Review, then
-- run `npm run supabase:migrate` yourself.
DROP POLICY IF EXISTS "sync_cursors_own_device" ON public.sync_cursors;

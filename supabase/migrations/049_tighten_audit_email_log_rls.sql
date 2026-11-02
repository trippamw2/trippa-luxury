-- 049: Tighten audit_log and email_log RLS policies.
-- Previously both tables had `USING (true) WITH CHECK (true)`, which with RLS
-- enabled leaves them readable/writable by any anon/authenticated client. Restrict
-- reads to active staff and writes to the service role (which bypasses RLS).

DROP POLICY IF EXISTS "Admin full access to audit_log" ON audit_log;
CREATE POLICY "Staff can read audit_log"
  ON audit_log FOR SELECT
  USING (public.is_staff_user());
-- No INSERT/UPDATE/DELETE policies: writes happen via service role only.

DROP POLICY IF EXISTS "Admin full access to email_log" ON email_log;
CREATE POLICY "Staff can read email_log"
  ON email_log FOR SELECT
  USING (public.is_staff_user());
-- No INSERT/UPDATE/DELETE policies: writes happen via service role only.
-- 033_rate_limit_table_grants.sql
--
-- Closes the access-control gap left open by 032.
--
-- Supabase configures ALTER DEFAULT PRIVILEGES so that every table created in the
-- public schema automatically receives all seven table privileges (SELECT, INSERT,
-- UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER) for anon and authenticated. That
-- is convenient for tables that back a public API, but 032 is a service-role-only
-- table and never intended to be reachable from a browser.
--
-- 032 documented this and leaned on RLS-with-no-policies as the single control:
-- with RLS on and no policies, anon and authenticated match zero rows, so the
-- privileges they hold are inert today. That is correct but thin — it is one
-- control, and it fails open if row level security is ever disabled while
-- debugging, restored from a dump, or dropped by an unrelated migration.
--
-- This migration adds the second layer by withdrawing the privileges themselves,
-- so the table is closed by grants *and* by RLS. Revoking the grants does not
-- weaken RLS; the two are independent and both must fail before the table is
-- readable.
--
-- The SECURITY DEFINER functions are unaffected: they execute as the table owner
-- (postgres), which bypasses RLS and holds its own privileges.
--
-- Idempotent.

-- ── Grants ─────────────────────────────────────────────────────────────────
REVOKE ALL ON TABLE public.rate_limit_buckets FROM PUBLIC;
REVOKE ALL ON TABLE public.rate_limit_buckets FROM anon;
REVOKE ALL ON TABLE public.rate_limit_buckets FROM authenticated;

-- service_role keeps full access: it is the only role the rate-limit store uses,
-- and it is what makes the sweep in the prune cron possible.
GRANT ALL ON TABLE public.rate_limit_buckets TO service_role;

-- ── Assert the invariant ───────────────────────────────────────────────────
-- A migration that fails loudly is better than one that silently leaves the
-- table reachable. This raises at apply time if the grants above ever stop
-- producing the closed state, or if RLS has been turned off by something else.
DO $$
DECLARE
  v_leaked_grants TEXT;
  v_rls_enabled   BOOLEAN;
BEGIN
  SELECT string_agg(DISTINCT grantee, ', ')
    INTO v_leaked_grants
    FROM information_schema.role_table_grants
   WHERE table_schema = 'public'
     AND table_name   = 'rate_limit_buckets'
     AND grantee IN ('anon', 'authenticated');

  SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class
   WHERE relname = 'rate_limit_buckets'
     AND relnamespace = 'public'::regnamespace;

  IF v_leaked_grants IS NOT NULL THEN
    RAISE EXCEPTION
      'rate_limit_buckets is still reachable by % — grants were not fully revoked',
      v_leaked_grants;
  END IF;

  IF v_rls_enabled IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION
      'rate_limit_buckets has row level security disabled — the table would be readable with the grants revoked';
  END IF;
END;
$$;

COMMENT ON TABLE public.rate_limit_buckets IS
  'Shared fixed-window rate limit counters. Bounded by active callers, not by total requests. Service-role-only: RLS is enabled with no policies (033) and grants are revoked from anon/authenticated.';
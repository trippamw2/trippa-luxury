-- 038_email_suppressions.sql
--
-- The single source of truth for "do not email this address".
--
-- Before this table, marketing consent lived in two disconnected places:
-- `newsletter_subscribers.is_active` (the newsletter list) and
-- `guest_profiles.email_opt_in` (the CRM). Unsubscribing flipped one and left
-- the other untouched, so the same address could be suppressed on one list and
-- live on the other. A guest who opted out of the newsletter was still a valid
-- recipient for any query that read the other table, and recurring reminders
-- read neither.
--
-- This table unifies the answer, and it distinguishes WHY an address is
-- suppressed because the two reasons mean different things:
--
--   scope 'marketing' — an unsubscribe. The address may still receive mail that
--                       is part of a service it asked for (receipts,
--                       confirmations, reminders for a booked trip), but must
--                       never be marketed to.
--   scope 'all'       — a hard stop (spam complaint, hard bounce, operator
--                       block). No outbound mail of any kind.
--
-- `email` is stored normalized (lowercased, trimmed) so the unique index and
-- the `.in()` lookups the senders use agree on identity. Addresses are matched
-- case-insensitively everywhere.
--
-- Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS email_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  email  TEXT NOT NULL,
  scope  TEXT NOT NULL DEFAULT 'all' CHECK (scope IN ('marketing', 'all')),
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint', 'manual')),
  source TEXT,
  note   TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL
);

-- One row per address. The conflict target every writer uses.
CREATE UNIQUE INDEX IF NOT EXISTS email_suppressions_email_key
  ON email_suppressions (email);

CREATE INDEX IF NOT EXISTS idx_email_suppressions_scope ON email_suppressions (scope);

-- Backfill: every currently-unsubscribed newsletter subscriber becomes a
-- marketing-scope suppression, so the new check is truthful from the first
-- send rather than only for people who unsubscribe after this migration.
-- A pre-existing hard suppression is never downgraded by this backfill.
INSERT INTO email_suppressions (email, scope, reason, source)
SELECT LOWER(TRIM(email)), 'marketing', 'unsubscribe', 'newsletter_backfill'
FROM newsletter_subscribers
WHERE is_active = false AND email IS NOT NULL AND TRIM(email) <> ''
ON CONFLICT (email) DO NOTHING;

-- Service-role only, exactly like `staged_reminders` (034) and
-- `rate_limit_buckets` (032/033): RLS enabled with no policies, and the grants
-- Supabase's default privileges would have handed to anon/authenticated
-- withdrawn. Both layers must fail before the list of who has opted out — which
-- is itself personal data — is readable from a browser.
ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE email_suppressions FROM PUBLIC;
REVOKE ALL ON TABLE email_suppressions FROM anon;
REVOKE ALL ON TABLE email_suppressions FROM authenticated;
GRANT ALL ON TABLE email_suppressions TO service_role;

COMMENT ON TABLE email_suppressions IS
  'Global do-not-email list. scope=marketing blocks marketing only; scope=all blocks all outbound. Service-role-only: RLS enabled with no policies and grants revoked from anon/authenticated.';

COMMIT;

-- 039_notifications.sql
--
-- In-app notification feed for the admin panel.
--
-- Before this table the platform had no in-app surface at all: a new inquiry,
-- a booking and a received payment each produced an email and an audit/event
-- row, but an operator signed into the admin panel saw nothing change unless
-- they opened a mail client or the audit log. The funnel's busiest signals were
-- invisible at the place the team actually works.
--
-- This is a small, append-mostly feed. Rows are written by server code with the
-- service role and read/marked-read by the admin UI over
-- /api/admin/notifications. Each row names the entity it is about so the bell
-- can deep-link to it, and it carries no guest PII beyond a title/body an
-- operator is already entitled to see.
--
-- Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event shape, e.g. 'inquiry_created', 'booking_created', 'payment_received'.
  type    TEXT NOT NULL,
  title   TEXT NOT NULL,
  body    TEXT,
  -- Admin-relative deep link, e.g. '/admin/inquiries'.
  link    TEXT,

  -- What this is about, for deep-linking and de-duplication.
  entity_type TEXT,
  entity_id   TEXT,

  -- NULL = unread. Set once, never cleared (the feed is not a task list).
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The bell's two queries: newest-first page, and the unread count.
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications (read_at)
  WHERE read_at IS NULL;

-- Service-role only, matching `staged_reminders` (034), `rate_limit_buckets`
-- (032/033) and `email_suppressions` (038): RLS enabled with no policies and
-- the anon/authenticated grants withdrawn. A notification can name a guest and
-- a booking, so it must not be readable from a browser session without the
-- admin guard.
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE notifications FROM PUBLIC;
REVOKE ALL ON TABLE notifications FROM anon;
REVOKE ALL ON TABLE notifications FROM authenticated;
GRANT ALL ON TABLE notifications TO service_role;

COMMENT ON TABLE notifications IS
  'Admin in-app notification feed. Written by server code; read and marked read via /api/admin/notifications. Service-role-only: RLS enabled with no policies and grants revoked from anon/authenticated.';

COMMIT;

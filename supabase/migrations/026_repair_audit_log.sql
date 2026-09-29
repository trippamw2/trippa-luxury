-- Migration 026: Repair and correct audit_log
--
-- Why this migration exists
-- -------------------------
-- `supabase_migrations.schema_migrations` records 013_audit_log as applied, but
-- the `audit_log` table does not exist in the live database. Because the ledger
-- marks 013 as complete, `supabase db push` will never re-run it, so the table is
-- (re)created here. Every statement is idempotent, so this migration is safe
-- whether the table is absent or already present.
--
-- Constraint correction
-- ---------------------
-- 013 declared `action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE','UPDATE','DELETE'))`.
-- The application writes two further actions that the constraint rejected:
--   - src/app/api/admin/auth/login/route.ts      -> LOGIN_SUCCESS, LOGIN_FAILED
--   - src/app/api/admin/marketing/newsletter/    -> CAMPAIGN_SEND
-- Combined with supabase-js returning (not throwing) PostgREST errors, those
-- rejections were discarded silently, so login and campaign events were never
-- recorded. The CHECK below is widened to every action the app actually writes.
--
-- This table is a prerequisite for CADC section XV (self-audit) and is the
-- natural sink for the section XIV event log.

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID,
  action VARCHAR(20) NOT NULL
    CHECK (action IN (
      'CREATE', 'UPDATE', 'DELETE',
      'CAMPAIGN_SEND', 'LOGIN_SUCCESS', 'LOGIN_FAILED'
    )),
  old_data JSONB,
  new_data JSONB,
  performed_by UUID REFERENCES admin_profiles(id),
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop 013's narrower three-value CHECK (if this table already existed with it)
-- and re-add the corrected one. DROP-then-ADD is safe in both cases.
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_action_check
  CHECK (action IN (
    'CREATE', 'UPDATE', 'DELETE',
    'CAMPAIGN_SEND', 'LOGIN_SUCCESS', 'LOGIN_FAILED'
  ));

CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access to audit_log" ON audit_log;
CREATE POLICY "Admin full access to audit_log"
  ON audit_log
  USING (true)
  WITH CHECK (true);

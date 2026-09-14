-- Migration 023: Email delivery log.
-- Records every Brevo send attempt so failures are observable instead of
-- silent. The service-role key bypasses RLS; the policy exists so an admin
-- session can read/reconcile the log from the admin panel.

CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed')),
  provider VARCHAR(20) NOT NULL DEFAULT 'brevo',
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  message_id TEXT,
  error TEXT,
  meta JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_email_log_created_at ON email_log(created_at DESC);
CREATE INDEX idx_email_log_status ON email_log(status);
CREATE INDEX idx_email_log_to_email ON email_log(to_email);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to email_log"
  ON email_log
  USING (true)
  WITH CHECK (true);
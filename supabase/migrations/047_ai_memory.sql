-- 047: Durable agent evaluation store.
CREATE TABLE IF NOT EXISTS agent_evaluation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL,
  type TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_evaluation_events_agent_created
  ON agent_evaluation_events (agent, created_at DESC);

ALTER TABLE agent_evaluation_events ENABLE ROW LEVEL SECURITY;
-- Service-role only: no policies for anon/authenticated.

-- insights columns for agent reports.
ALTER TABLE insights ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'kora';
ALTER TABLE insights ADD COLUMN IF NOT EXISTS agent TEXT;
ALTER TABLE insights ADD COLUMN IF NOT EXISTS report JSONB;
-- 035_llm_usage.sql
--
-- Automatic accounting for model spend.
--
-- The problem this solves: `callLlm` normalizes token counts for every provider,
-- but nothing persisted them. Spend only reached the database when a call site
-- chose to POST its own `meta.promptTokens` to /api/admin/agent-evaluation, so the
-- total was whatever the routes remembered to report rather than what was actually
-- spent. A route that forgot was invisible, and there was no way to tell an
-- unreported call from a call that never happened.
--
-- Recording happens inside `callLlm` instead, at the single choke point every
-- model call already passes through for the governance kill switch. A route now
-- cannot spend money without that spend being recorded, because the code that
-- spends it is the code that reports it.
--
-- This is deliberately a raw measurement, not a verdict. It records what the
-- provider said it was billed, and nothing decides whether a call was allowed.

BEGIN;

-- ── Table ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS llm_call_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- When the call was made. Indexed because spend questions are always a time
  -- range question ("what did we spend last month").
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Which model actually ran, not which was requested. `callLlm` tries providers
  -- in order, so the requested provider and the answering one can differ, and
  -- only the answerer was billed.
  provider TEXT NOT NULL,
  model    TEXT NOT NULL,

  -- As reported by the provider. Kept as three columns rather than a total alone
  -- because prompt and completion are priced differently, so a single number
  -- would hide a runaway completion length behind a healthy-looking total.
  prompt_tokens     INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens      INTEGER NOT NULL DEFAULT 0,

  -- An estimate computed from the published per-model rates in
  -- `src/lib/ai/llm-usage.ts`. Named `estimated` because provider invoices are
  -- the authority on billing: this is a figure for comparing periods, not a
  -- reconciliation against an invoice.
  estimated_cost_usd NUMERIC(14,8) NOT NULL DEFAULT 0,

  -- Wall-clock duration, which is the only signal available for a call that
  -- succeeded but degraded into nonsense. No error column is kept: failures are
  -- not billed the same way and are recorded by the existing audit trail.
  latency_ms INTEGER
);

-- Spend is almost always queried over a window.
CREATE INDEX IF NOT EXISTS idx_llm_call_usage_recorded_at
  ON llm_call_usage (recorded_at DESC);

-- Per-model rollups ("what is DeepSeek costing us").
CREATE INDEX IF NOT EXISTS idx_llm_call_usage_model
  ON llm_call_usage (model, recorded_at DESC);

-- ── Access control ────────────────────────────────────────────────────────
-- Service-role only, like `staged_reminders` (034) and `rate_limit_buckets`
-- (032/033): RLS enabled with no policies, and the default privileges Supabase
-- would have granted to anon/authenticated withdrawn. Spend figures are commercial
-- data and nothing here should be readable from a browser.
ALTER TABLE llm_call_usage ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE llm_call_usage FROM PUBLIC;
REVOKE ALL ON TABLE llm_call_usage FROM anon;
REVOKE ALL ON TABLE llm_call_usage FROM authenticated;
GRANT ALL ON TABLE llm_call_usage TO service_role;

-- Append-only by convention and by access: only the service role can write, and
-- nothing in the codebase updates or deletes these rows. Restating it here so the
-- next person adding a "clean up old usage" job has to read why they shouldn't.
COMMENT ON TABLE llm_call_usage IS
  'One row per successful model call, written by callLlm. Automatic measurement of spend; not an authorization record. Append-only: never updated or deleted, including by retention jobs.';

COMMIT;
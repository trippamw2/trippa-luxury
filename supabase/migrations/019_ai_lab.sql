-- Kivara Luxury Travel Platform - AI Lab Persistence
-- Moves the AI Lab experiment ledger (Master OS §26) out of an in-memory array
-- into a Postgres table so experiments survive restarts and are shared across
-- processes. Additive and safe to apply against a populated production database.
--
-- The table stores the experiment `id` as TEXT because existing module ids use
-- the `exp_...` format (not UUIDs); keeping TEXT preserves the API contract.

-- ─── 1. ai_lab_experiments table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_lab_experiments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN (
      'model',
      'automation',
      'agent-architecture',
      'customer-experience',
      'business-model',
      'distribution',
      'revenue-stream'
    )
  ),
  hypothesis TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idea' CHECK (
    status IN ('idea', 'running', 'won', 'failed', 'paused')
  ),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_lab_category ON ai_lab_experiments(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_lab_status ON ai_lab_experiments(status);

-- ─── 2. RLS (defence-in-depth; admin API uses service-role client) ────────
-- is_staff_user() is created in migration 016 and accepts every active staff
-- role (admin / editor / agent).
ALTER TABLE ai_lab_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage AI lab experiments"
  ON ai_lab_experiments FOR ALL USING (public.is_staff_user());

-- ─── 3. Seed: the starting experiment catalogue (previously SUGGESTED_EXPERIMENTS) ─
-- Stable TEXT ids so re-running the migration is idempotent.
INSERT INTO ai_lab_experiments (id, title, category, hypothesis, status) VALUES
  ('exp_model_fallback_ladder', 'Model-agnostic fallback ladder', 'model',
   'Routing each agent to the cheapest model that still passes its quality gate lowers cost without degrading output.', 'idea'),
  ('exp_nightly_market_brief', 'Automated nightly market brief', 'automation',
   'A scheduled Strategist brief each morning reduces founder decision latency.', 'idea'),
  ('exp_self_healing_supplier', 'Self-healing supplier matching', 'agent-architecture',
   'Letting the booking-coordinator re-plan a leg when a supplier becomes unavailable improves ops resilience.', 'idea'),
  ('exp_romance_gated_proposal', 'Romance-gated proposal A/B', 'customer-experience',
   'Proposals framed by an emotional arc convert higher than standard quotes.', 'idea'),
  ('exp_owned_lodge_pilot', 'Owned-lodge pilot business model', 'business-model',
   'Scoring demand signals can identify which destination justifies an owned/operated asset first.', 'idea'),
  ('exp_advisor_channel', 'Luxury travel advisor channel', 'distribution',
   'A small, high-fit advisor network yields higher quality leads than broad platforms.', 'idea'),
  ('exp_design_fee_revenue', 'Design-fee revenue stream', 'revenue-stream',
   'An optional curated-itinerary design fee monetises non-booked discovery traffic.', 'idea')
ON CONFLICT (id) DO NOTHING;

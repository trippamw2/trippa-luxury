-- KIVARA — 028: AI-Native Company Foundation (Memory Graph + Autonomy Ledger)
--
-- Closes the gap identified in the system analysis: Kivara has ~40 AI
-- capabilities (agents) but no compounding institutional memory and no
-- machine-enforced autonomy governance. This migration adds the substrate
-- that turns stateless capability calls into a learning, gated company.
--
-- Adds (all additive, IF NOT EXISTS — safe on a populated production database):
--   system_events        append-only event stream (state reconstructability)
--   client_dna           persistent Client Preference DNA (Constantine)
--   supplier_performance append-only supplier observation ledger (moat)
--   system_gaps          KORA findings ledger (dedup across runs)
--   insights             validated patterns (the compounding asset)
--   decisions            autonomous recommendations + human outcomes
--   journey_feedback     post-trip outcomes, referrals, repeat intent
--
-- Plus two human-gate booking statuses required by the autonomy policy:
--   staged_unsent, pending_human_review
--
-- Design notes:
--  - system_events.supplier_performance are APPEND-ONLY, enforced by trigger.
--    Institutional memory must not be rewritable; you cannot retroactively
--    improve a supplier's record or delete an inconvenient event.
--  - system_gaps.fingerprint is UNIQUE so a re-running scheduled KORA audit
--    upserts and bumps last_seen_at instead of creating duplicate findings.
--  - event_type carries no CHECK constraint on purpose: an append-only event
--    log that rejects new event types is a brittle log. The canonical 15 are
--    enforced as a TypeScript union at the write path (src/lib/ai/event-bus.ts).
--  - is_staff_user() is defined in migration 016; verified present live.

-- ═══════════════════════════════════════════════════════════════
-- GUARD: append-only enforcement
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.forbid_append_only_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'Table "%" is append-only. Kivara institutional memory cannot be mutated — record a correcting entry instead.',
    TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- 1. SYSTEM EVENTS (immutable event stream)
-- ═══════════════════════════════════════════════════════════════
--
-- Canonical event types (enforced in TypeScript, not here):
--   ENQUIRY_CREATED, CLIENT_PROFILED, JOURNEY_DESIGNED, SUPPLIERS_MATCHED,
--   PRICE_CALCULATED, PROPOSAL_GENERATED, HUMAN_REVIEW_REQUESTED,
--   ADMIN_APPROVED, CLIENT_ACCEPTED, SUPPLIER_REQUESTED, SUPPLIER_CONFIRMED,
--   PAYMENT_RECEIVED, JOURNEY_COMPLETED, CLIENT_FEEDBACK_RECEIVED,
--   JOURNEY_LEARNED

CREATE TABLE IF NOT EXISTS system_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What happened
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,

  -- Who did it. KORA is a first-class actor: the self-auditor emits its own
  -- events (gap detected, insight validated) and must be distinguishable from
  -- a generic system process.
  actor_type TEXT NOT NULL DEFAULT 'system'
    CHECK (actor_type IN ('human', 'agent', 'system', 'cron', 'kora')),
  actor_id TEXT,

  -- Event-stream stitching: every event for one business flow shares a
  -- correlation_id, so a proposal can be traced back to its enquiry.
  correlation_id UUID,

  -- The facts
  payload JSONB NOT NULL DEFAULT '{}',

  -- Governance: at which autonomy level was this emitted, and has a human
  -- cleared anything that needed clearing.
  autonomy_level SMALLINT NOT NULL DEFAULT 0
    CHECK (autonomy_level BETWEEN 0 AND 4),
  human_reviewed BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convergence fix: CREATE TABLE IF NOT EXISTS is a no-op on an already-created
-- table, so the actor_type constraint is re-asserted explicitly to make this
-- migration idempotent AND convergent for databases that ran an earlier draft.
ALTER TABLE system_events DROP CONSTRAINT IF EXISTS system_events_actor_type_check;
ALTER TABLE system_events
  ADD CONSTRAINT system_events_actor_type_check
  CHECK (actor_type IN ('human', 'agent', 'system', 'cron', 'kora'));

CREATE INDEX IF NOT EXISTS idx_system_events_type_created
  ON system_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_entity
  ON system_events(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_correlation
  ON system_events(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_system_events_created
  ON system_events(created_at DESC);
-- The human review queue: everything still awaiting a human decision.
CREATE INDEX IF NOT EXISTS idx_system_events_awaiting_review
  ON system_events(created_at DESC) WHERE human_reviewed = false;
CREATE INDEX IF NOT EXISTS idx_system_events_actor
  ON system_events(actor_type, actor_id);

DROP TRIGGER IF EXISTS system_events_append_only ON system_events;
CREATE TRIGGER system_events_append_only
  BEFORE UPDATE OR DELETE ON system_events
  FOR EACH ROW EXECUTE FUNCTION public.forbid_append_only_mutation();

ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read system events" ON system_events;
CREATE POLICY "Staff read system events"
  ON system_events FOR SELECT USING (public.is_staff_user());
-- No INSERT policy: the event bus writes with the service-role client only.

-- ═══════════════════════════════════════════════════════════════
-- 2. CLIENT DNA (Constantine — Client Preference DNA)
-- ═══════════════════════════════════════════════════════════════
--
-- Internal psychographic classification. NEVER surfaced to the client.
-- One active row per subject; history lives in system_events.

CREATE TABLE IF NOT EXISTS client_dna (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Exactly one subject is required.
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  guest_profile_id UUID REFERENCES guest_profiles(id) ON DELETE CASCADE,
  CONSTRAINT client_dna_subject_required
    CHECK (lead_id IS NOT NULL OR guest_profile_id IS NOT NULL),

  -- Psychographics
  romance_archetype VARCHAR(100),
  emotional_drivers JSONB NOT NULL DEFAULT '[]',
  emotional_triggers JSONB NOT NULL DEFAULT '[]',

  -- Travel-shape profiles
  pacing_profile JSONB NOT NULL DEFAULT '{}',
  luxury_profile JSONB NOT NULL DEFAULT '{}',
  privacy_profile JSONB NOT NULL DEFAULT '{}',
  adventure_profile JSONB NOT NULL DEFAULT '{}',
  destination_affinity JSONB NOT NULL DEFAULT '[]',
  accommodation_affinity JSONB NOT NULL DEFAULT '[]',
  communication_profile JSONB NOT NULL DEFAULT '{}',

  -- Commercial signal
  purchase_intent_score SMALLINT
    CHECK (purchase_intent_score BETWEEN 0 AND 100),
  estimated_lifetime_value DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Raw material for future personalisation
  personalization_signals JSONB NOT NULL DEFAULT '[]',

  -- Confidence discipline: never fabricate confidence (constitution §XI)
  confidence_score SMALLINT CHECK (confidence_score BETWEEN 0 AND 100),
  evidence_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'agent'
    CHECK (source IN ('agent', 'human', 'system')),
  version INTEGER NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_dna_lead_unique
  ON client_dna(lead_id) WHERE lead_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_dna_guest_unique
  ON client_dna(guest_profile_id) WHERE guest_profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_dna_intent
  ON client_dna(purchase_intent_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_client_dna_archetype
  ON client_dna(romance_archetype) WHERE romance_archetype IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_dna_updated
  ON client_dna(updated_at DESC);

DROP TRIGGER IF EXISTS update_client_dna_updated_at ON client_dna;
CREATE TRIGGER update_client_dna_updated_at
  BEFORE UPDATE ON client_dna
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE client_dna ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage client dna" ON client_dna;
CREATE POLICY "Staff manage client dna"
  ON client_dna FOR ALL USING (public.is_staff_user());

-- ═══════════════════════════════════════════════════════════════
-- 3. SUPPLIER PERFORMANCE (append-only observation ledger)
-- ═══════════════════════════════════════════════════════════════
--
-- This is the compounding moat for supplier selection. Without persistence,
-- supplier-intelligence.ts recomputes from live rows on every call and Kivara
-- never learns. One row = one observation, forever.

CREATE TABLE IF NOT EXISTS supplier_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES journeys(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  observation_type TEXT NOT NULL
    CHECK (observation_type IN (
      'booking', 'issue', 'complaint', 'praise', 'delay', 'cancellation',
      'cost_variance', 'satisfaction', 'manual_review'
    )),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Scores (0-100 where present; NULL = not observed, never guessed)
  responsiveness_score SMALLINT CHECK (responsiveness_score BETWEEN 0 AND 100),
  reliability_score SMALLINT CHECK (reliability_score BETWEEN 0 AND 100),
  quality_score SMALLINT CHECK (quality_score BETWEEN 0 AND 100),
  on_time_score SMALLINT CHECK (on_time_score BETWEEN 0 AND 100),
  client_satisfaction SMALLINT CHECK (client_satisfaction BETWEEN 0 AND 100),

  -- Operational facts
  issue_type VARCHAR(100),
  issue_severity SMALLINT NOT NULL DEFAULT 0
    CHECK (issue_severity BETWEEN 0 AND 5),
  resolution_hours NUMERIC(10,2),
  cost_variance_pct NUMERIC(7,2),

  notes TEXT,
  source TEXT NOT NULL DEFAULT 'system'
    CHECK (source IN ('system', 'agent', 'human')),
  recorded_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_perf_supplier_time
  ON supplier_performance(supplier_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_perf_booking
  ON supplier_performance(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_perf_type
  ON supplier_performance(observation_type, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_perf_issues
  ON supplier_performance(supplier_id, observed_at DESC)
  WHERE issue_severity > 0;

DROP TRIGGER IF EXISTS supplier_performance_append_only ON supplier_performance;
CREATE TRIGGER supplier_performance_append_only
  BEFORE UPDATE OR DELETE ON supplier_performance
  FOR EACH ROW EXECUTE FUNCTION public.forbid_append_only_mutation();

ALTER TABLE supplier_performance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read supplier performance" ON supplier_performance;
CREATE POLICY "Staff read supplier performance"
  ON supplier_performance FOR SELECT USING (public.is_staff_user());

-- ═══════════════════════════════════════════════════════════════
-- 4. SYSTEM GAPS (KORA findings ledger)
-- ═══════════════════════════════════════════════════════════════
--
-- KORA is a permanent auditor, not a one-off review. It must therefore be able
-- to re-run cheaply: `fingerprint` is the natural identity of a finding, so a
-- repeat detection upserts and refreshes last_seen_at rather than spamming.

CREATE TABLE IF NOT EXISTS system_gaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- The constitution's gap taxonomy
  category TEXT NOT NULL
    CHECK (category IN (
      'product', 'destination', 'supplier', 'pricing', 'conversion',
      'experience', 'operational', 'data', 'automation', 'risk', 'moat',
      'bottleneck', 'technology', 'security'
    )),
  title TEXT NOT NULL,
  description TEXT,

  -- Evidence discipline: a gap without evidence is an opinion.
  evidence JSONB NOT NULL DEFAULT '[]',
  evidence_count INTEGER NOT NULL DEFAULT 0,

  -- Business framing
  business_impact TEXT,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  priority_score NUMERIC(6,2) NOT NULL DEFAULT 0,

  -- The proposal
  recommendation TEXT,
  implementation_plan TEXT,
  expected_roi TEXT,
  risk TEXT,
  requires_human_approval BOOLEAN NOT NULL DEFAULT true,

  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN (
      'open', 'proposed', 'approved', 'rejected',
      'in_progress', 'resolved', 'dismissed'
    )),

  -- Stable identity for scheduled re-detection
  fingerprint TEXT NOT NULL UNIQUE,

  detected_by TEXT NOT NULL DEFAULT 'kora',
  first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_gaps_status_priority
  ON system_gaps(status, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_system_gaps_category
  ON system_gaps(category, severity);
CREATE INDEX IF NOT EXISTS idx_system_gaps_open
  ON system_gaps(priority_score DESC) WHERE status IN ('open', 'proposed');

DROP TRIGGER IF EXISTS update_system_gaps_updated_at ON system_gaps;
CREATE TRIGGER update_system_gaps_updated_at
  BEFORE UPDATE ON system_gaps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE system_gaps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage system gaps" ON system_gaps;
CREATE POLICY "Staff manage system gaps"
  ON system_gaps FOR ALL USING (public.is_staff_user());

-- ═══════════════════════════════════════════════════════════════
-- 5. INSIGHTS (validated patterns — the compounding asset)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  title TEXT NOT NULL,
  statement TEXT NOT NULL,
  scope TEXT NOT NULL
    CHECK (scope IN (
      'client', 'journey', 'supplier', 'destination',
      'commercial', 'operational', 'brand', 'moat'
    )),

  -- The pattern, machine-readable
  pattern JSONB NOT NULL DEFAULT '{}',

  -- Why we believe it
  evidence JSONB NOT NULL DEFAULT '[]',
  evidence_count INTEGER NOT NULL DEFAULT 0,
  reasoning_basis TEXT,
  confidence_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  confidence_level TEXT NOT NULL DEFAULT 'low'
    CHECK (confidence_level IN ('low', 'medium', 'high')),

  -- Epistemic lifecycle: an insight must earn its way to "validated"
  status TEXT NOT NULL DEFAULT 'hypothesis'
    CHECK (status IN (
      'hypothesis', 'validated', 'falsified', 'superseded', 'actioned'
    )),
  validated_at TIMESTAMPTZ,
  actioned_at TIMESTAMPTZ,

  related_gap_id UUID REFERENCES system_gaps(id) ON DELETE SET NULL,
  created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insights_status_confidence
  ON insights(status, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_insights_scope
  ON insights(scope, status);
CREATE INDEX IF NOT EXISTS idx_insights_validated
  ON insights(validated_at DESC NULLS LAST)
  WHERE status = 'validated';

DROP TRIGGER IF EXISTS update_insights_updated_at ON insights;
CREATE TRIGGER update_insights_updated_at
  BEFORE UPDATE ON insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage insights" ON insights;
CREATE POLICY "Staff manage insights"
  ON insights FOR ALL USING (public.is_staff_user());

-- ═══════════════════════════════════════════════════════════════
-- 6. DECISIONS (autonomous recommendations + human outcomes)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  decision_type TEXT NOT NULL,
  title TEXT NOT NULL,
  rationale TEXT,
  recommendation TEXT,

  -- Provenance
  agent_name TEXT,
  entity_type TEXT,
  entity_id UUID,

  -- Confidence discipline (constitution §XI)
  confidence_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  evidence_count INTEGER NOT NULL DEFAULT 0,
  evidence_quality TEXT NOT NULL DEFAULT 'unknown'
    CHECK (evidence_quality IN ('unknown', 'weak', 'moderate', 'strong')),

  -- Governance
  autonomy_level SMALLINT NOT NULL DEFAULT 0
    CHECK (autonomy_level BETWEEN 0 AND 4),
  risk_level TEXT NOT NULL DEFAULT 'low'
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  human_review_required BOOLEAN NOT NULL DEFAULT true,

  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN (
      'proposed', 'approved', 'rejected', 'executed', 'failed', 'overridden'
    )),
  outcome TEXT,

  decided_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_decisions_status
  ON decisions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_awaiting
  ON decisions(created_at DESC)
  WHERE status = 'proposed' AND human_review_required = true;
CREATE INDEX IF NOT EXISTS idx_decisions_agent
  ON decisions(agent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_entity
  ON decisions(entity_type, entity_id);

DROP TRIGGER IF EXISTS update_decisions_updated_at ON decisions;
CREATE TRIGGER update_decisions_updated_at
  BEFORE UPDATE ON decisions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage decisions" ON decisions;
CREATE POLICY "Staff manage decisions"
  ON decisions FOR ALL USING (public.is_staff_user());

-- ═══════════════════════════════════════════════════════════════
-- 7. JOURNEY FEEDBACK (post-trip outcomes)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS journey_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  guest_profile_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Overall
  overall_satisfaction SMALLINT CHECK (overall_satisfaction BETWEEN 1 AND 10),
  nps_score SMALLINT CHECK (nps_score BETWEEN 0 AND 10),
  sentiment TEXT
    CHECK (sentiment IN ('delighted', 'satisfied', 'neutral',
                         'disappointed', 'angry')),
  would_recommend BOOLEAN,
  would_return BOOLEAN,
  repeat_intent BOOLEAN,

  -- Dimension scores — where exactly the romance standard is won or lost
  romance_experience_score SMALLINT CHECK (romance_experience_score BETWEEN 1 AND 10),
  accommodation_score SMALLINT CHECK (accommodation_score BETWEEN 1 AND 10),
  transfers_score SMALLINT CHECK (transfers_score BETWEEN 1 AND 10),
  food_score SMALLINT CHECK (food_score BETWEEN 1 AND 10),
  activities_score SMALLINT CHECK (activities_score BETWEEN 1 AND 10),

  -- Commercial reality
  actual_spend DECIMAL(12,2) NOT NULL DEFAULT 0,
  upsell_value DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Compounding loop inputs
  referred BOOLEAN NOT NULL DEFAULT false,
  referral_details TEXT,

  -- Verbatim
  complaints TEXT,
  compliments TEXT,

  response_source TEXT
    CHECK (response_source IN ('email', 'portal', 'phone', 'whatsapp',
                               'interview', 'in_person')),
  collected_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journey_feedback_journey
  ON journey_feedback(journey_id) WHERE journey_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journey_feedback_booking
  ON journey_feedback(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journey_feedback_guest
  ON journey_feedback(guest_profile_id) WHERE guest_profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journey_feedback_sentiment
  ON journey_feedback(sentiment, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journey_feedback_referrals
  ON journey_feedback(created_at DESC) WHERE referred = true;

DROP TRIGGER IF EXISTS update_journey_feedback_updated_at ON journey_feedback;
CREATE TRIGGER update_journey_feedback_updated_at
  BEFORE UPDATE ON journey_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE journey_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage journey feedback" ON journey_feedback;
CREATE POLICY "Staff manage journey feedback"
  ON journey_feedback FOR ALL USING (public.is_staff_user());

-- ═══════════════════════════════════════════════════════════════
-- 8. HUMAN-GATE BOOKING STATUSES
-- ═══════════════════════════════════════════════════════════════
--
-- The constitution requires all outbound communication to stage before it
-- sends, and forbids any external action while a record is pending human
-- review. Migration 021 added the workflow slugs but not these two gate
-- states, so the gate had nowhere to live. Sort order continues from
-- 'archived' = 19.

INSERT INTO booking_statuses (slug, name, color, sort_order) VALUES
  ('staged_unsent',        'Staged — Awaiting Send',  'amber',  20),
  ('pending_human_review', 'Pending Human Review',    'orange', 21)
ON CONFLICT (slug) DO NOTHING;

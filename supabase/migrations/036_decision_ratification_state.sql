-- 036_decision_ratification_state.sql
--
-- Making the unratified status of the charter visible in the ledger it governs.
--
-- The problem this solves: `isRatified()` was computed, stored and exposed by the
-- admin API, and read by nothing. The charter's own STATUS line says UNRATIFIED,
-- so every decision in `decisions` was in fact taken under a document that no
-- owner has adopted — but the ledger could not show that. An auditor reading the
-- decision trail had no way to distinguish "approved under an adopted charter"
-- from "approved under a draft nobody has signed", and the answer was the second.
--
-- What this does NOT do: refuse anything. The enforcement question was decided
-- explicitly — an unratified charter records itself rather than blocking
-- production outbound. Every outbound AI action (quotes, receipts, payment links,
-- reminders) would stop on deploy until an owner typed the ratification phrase,
-- which is a product decision for the owners rather than a security fix.
--
-- Instead the state travels with the decision, so the gap is auditable rather
-- than invisible, and the admin panel surfaces it where an operator will see it.

BEGIN;

-- ── Column ────────────────────────────────────────────────────────────────
-- NULLABLE, deliberately.
--
-- `false` would mean "we checked and it is unratified". `true` would mean "we
-- checked and it is ratified". Neither can be claimed about rows written before
-- this column existed, because nothing recorded the answer at the time. NULL
-- says exactly that: unknown, because nobody was looking. Defaulting the
-- backfill to `false` would stamp a fabricated measurement onto history and make
-- the ledger look more trustworthy than it is.
ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS charter_ratified BOOLEAN;

COMMENT ON COLUMN decisions.charter_ratified IS
  'Whether the AI governance charter was ratified when this decision was taken. NULL = not recorded (pre-036 rows). Recorded for transparency; it does not gate the action.';

-- ── Index ─────────────────────────────────────────────────────────────────
-- Only useful for one question: "show me everything decided while unratified".
-- That is a scan over a status column, so a partial index on the unratified rows
-- is the whole index rather than a leading column nothing queries.
CREATE INDEX IF NOT EXISTS idx_decisions_unratified
  ON decisions (created_at DESC)
  WHERE charter_ratified IS FALSE;

COMMENT ON INDEX idx_decisions_unratified IS
  'Decisions taken while the charter was unratified. Supports auditing the pre-ratification period.';

COMMIT;
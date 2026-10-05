-- 034_staged_reminders.sql
--
-- The staging step that lets booking reminders exist without the constitution
-- being violated.
--
-- The problem this solves: `trigger-reminders` composes and sends in one step,
-- from an unattended cron, with nothing composed for anyone to read first. The
-- constitution treats unstaged unattended outbound as a structural refusal
-- rather than a dial the operator can raise past, so that route was blocked at
-- every autonomy level and reminders could not run at all.
--
-- The fix is not to relax that rule, it is to satisfy it. Composition becomes an
-- internal write — reversible, contacting nobody — and the actual send moves
-- behind a human who has read the message. That is the same shape the dispatch
-- routes already use, where `humanAuthorized` is true because a person really
-- did press the button on the record in front of them.
--
-- One row per (booking, message type). The row IS the reviewable artifact: the
-- exact recipient, subject and HTML a guest would receive, held until approved.
-- Dispatch reads these rows rather than re-deriving them, so what a human
-- approved is provably what was sent.
--
-- Idempotent.

BEGIN;

-- ── Table ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staged_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- The booking and the message owed to it. `kind` distinguishes a pre-trip
  -- reminder from a post-trip follow-up: they are written to different columns
  -- on `bookings` and a booking can be in both flows across its lifetime.
  booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  booking_reference VARCHAR(20),
  kind              TEXT NOT NULL CHECK (kind IN ('reminder', 'followup')),
  message_type      TEXT NOT NULL,

  -- Exactly what the guest would receive. Stored rather than regenerated so the
  -- reviewed artifact and the delivered artifact cannot drift apart.
  recipient_email TEXT NOT NULL,
  recipient_name  TEXT,
  subject         TEXT NOT NULL,
  body_html       TEXT NOT NULL,

  -- `pending` is the review queue. `failed` is the only state a re-stage may
  -- overwrite (see the partial unique index below); everything else is a record
  -- of a decision a human already made and must not be silently replaced.
  --
  -- `dispatching` is the send window: dispatch claims a row with it BEFORE
  -- handing the message to the provider, so two admins clicking "send" at the
  -- same moment cannot both send. It is not terminal — a claim left behind by a
  -- crashed process is reclaimed to `failed` once it goes stale, so a crash costs
  -- a delayed reminder rather than a permanently undeliverable row.
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'dispatching', 'rejected', 'dispatched', 'failed')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Review trail. `reviewed_by` is who took responsibility, which is what makes
  -- a later dispatch a truthful `humanAuthorized` claim.
  reviewed_by  UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ,
  review_note  TEXT,

  -- Delivery outcome. `dispatch_error` is kept on the row rather than only in
  -- logs so a failed send is visible to an operator and retryable.
  --
  -- `dispatching_at` is set when dispatch claims the row and cleared on both
  -- terminal outcomes. It exists so an abandoned claim is findable: it is what
  -- the stale-reclaim sweep and its partial index read.
  dispatched_at  TIMESTAMPTZ,
  dispatching_at TIMESTAMPTZ,
  dispatch_error TEXT,
  message_id     TEXT
);

COMMENT ON TABLE staged_reminders IS
  'Booking reminders composed for review. Dispatch requires a human to approve the exact rendered message first.';

-- An earlier draft shipped the `dispatching` state without `dispatching_at`, and
-- CREATE TABLE IF NOT EXISTS is a no-op on an already-created table. This runs
-- before the indexes below because one of them reads this column: without it,
-- re-running this migration against that draft would fail at CREATE INDEX.
ALTER TABLE staged_reminders
  ADD COLUMN IF NOT EXISTS dispatching_at TIMESTAMPTZ;

-- One open row per (booking, kind, message type).
--
-- A partial unique index rather than a plain UNIQUE because `failed` rows must
-- be re-stageable: a Brevo outage should not permanently mark a reminder as
-- "handled". Rejected rows are deliberately NOT re-stageable, or the nightly
-- cron would re-queue something a human deliberately declined, every night,
-- forever. `dispatching` IS included: a row being sent must still hold the slot,
-- or a concurrent staging run could queue a second copy of the same message.
CREATE UNIQUE INDEX IF NOT EXISTS staged_reminders_open_key
  ON staged_reminders (booking_id, kind, message_type)
  WHERE status IN ('pending', 'approved', 'dispatching', 'dispatched', 'rejected');

-- The review queue: what is waiting for a human, oldest first.
CREATE INDEX IF NOT EXISTS idx_staged_reminders_pending
  ON staged_reminders (created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_staged_reminders_status
  ON staged_reminders (status, created_at DESC);

-- Per-booking history, for the booking detail view.
CREATE INDEX IF NOT EXISTS idx_staged_reminders_booking
  ON staged_reminders (booking_id, created_at DESC);

-- Stale-claim recovery: finds rows abandoned mid-send by a crashed process.
CREATE INDEX IF NOT EXISTS idx_staged_reminders_dispatching
  ON staged_reminders (dispatching_at)
  WHERE status = 'dispatching';

-- Convergence fix: CREATE TABLE IF NOT EXISTS is a no-op on an already-created
-- table, so the constraints are re-asserted explicitly to make this migration
-- idempotent AND convergent for databases that ran an earlier draft.
ALTER TABLE staged_reminders DROP CONSTRAINT IF EXISTS staged_reminders_kind_check;
ALTER TABLE staged_reminders
  ADD CONSTRAINT staged_reminders_kind_check
  CHECK (kind IN ('reminder', 'followup'));

ALTER TABLE staged_reminders DROP CONSTRAINT IF EXISTS staged_reminders_status_check;
ALTER TABLE staged_reminders
  ADD CONSTRAINT staged_reminders_status_check
  CHECK (status IN ('pending', 'approved', 'dispatching', 'rejected', 'dispatched', 'failed'));

-- ── Access control ────────────────────────────────────────────────────────
-- Service-role only, exactly like `rate_limit_buckets` (032/033): RLS enabled
-- with no policies, and the grants Supabase's default privileges would have
-- handed to anon/authenticated withdrawn. Both layers must fail before a guest's
-- email address and rendered message are readable from a browser.
ALTER TABLE staged_reminders ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE staged_reminders FROM PUBLIC;
REVOKE ALL ON TABLE staged_reminders FROM anon;
REVOKE ALL ON TABLE staged_reminders FROM authenticated;
GRANT ALL ON TABLE staged_reminders TO service_role;

COMMENT ON TABLE staged_reminders IS
  'Booking reminders composed for review. Dispatch requires a human to approve the exact rendered message first. Service-role-only: RLS enabled with no policies and grants revoked from anon/authenticated.';

COMMIT;
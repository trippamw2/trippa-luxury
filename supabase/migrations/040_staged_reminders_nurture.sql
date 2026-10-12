-- 040_staged_reminders_nurture.sql
--
-- Extends the reviewable staging pipeline (034) to carry the one outbound
-- message that had no staging arm at all: lead nurture.
--
-- The gap this closes: every booking-adjacent message (pre-trip reminder,
-- post-trip follow-up, balance reminder) is composed into `staged_reminders`
-- for a human to read before a guest sees it. A lead who asked about a journey
-- and then went quiet got nothing — there was no mechanism to re-engage them
-- that still honoured the "no unattended outbound" rule, so the top of the
-- funnel simply leaked.
--
-- Nurture reuses the same shape rather than inventing a second one. A row is a
-- message owed to a lead: the exact recipient, subject and HTML held until an
-- operator approves it, then sent by the same dispatch route that sends
-- reminders. Nothing about that is relaxed here.
--
-- What is relaxed is exactly one column: `booking_id` was NOT NULL because
-- every row until now belonged to a booking. A nurtured lead has no booking —
-- that is the whole point of nurturing them — so it becomes nullable and a
-- `lead_id` is added in its place. A row is expected to carry exactly one of
-- the two; the check below enforces that rather than leaving "belongs to
-- neither" representable.
--
-- `kind` gains 'nurture' so dispatch can tell a re-engagement message from a
-- booked-guest message: nurture is marketing mail (a plain unsubscribe stops
-- it) while reminders are service mail (only a hard stop stops them). That is
-- the single behavioural difference and it is readable off the row.
--
-- Idempotent and convergent.

BEGIN;

-- A lead has no booking to hang a nurture message off.
ALTER TABLE staged_reminders
  ALTER COLUMN booking_id DROP NOT NULL;

-- The lead a nurture row is owed to. `NULL` for every booking reminder.
ALTER TABLE staged_reminders
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE CASCADE;

-- Per-lead history, mirroring idx_staged_reminders_booking.
CREATE INDEX IF NOT EXISTS idx_staged_reminders_lead
  ON staged_reminders (lead_id, created_at DESC)
  WHERE lead_id IS NOT NULL;

-- `kind` now includes the nurture arm. Dropped and re-added so a database that
-- ran the 034 CHECK converges instead of silently rejecting the new kind.
ALTER TABLE staged_reminders DROP CONSTRAINT IF EXISTS staged_reminders_kind_check;
ALTER TABLE staged_reminders
  ADD CONSTRAINT staged_reminders_kind_check
  CHECK (kind IN ('reminder', 'followup', 'nurture'));

-- A row must belong to something. `booking_id` nullable is what lets a nurture
-- row exist; this check is what stops that nullability from also allowing a
-- row that belongs to nothing, which dispatch could not attribute to anyone.
ALTER TABLE staged_reminders DROP CONSTRAINT IF EXISTS staged_reminders_target_check;
ALTER TABLE staged_reminders
  ADD CONSTRAINT staged_reminders_target_check
  CHECK (booking_id IS NOT NULL OR lead_id IS NOT NULL);

-- The open-row uniqueness index (034) keys on booking_id, and Postgres treats
-- NULLs as distinct in a unique index — so it can never dedupe nurture rows.
-- Lead dedup is therefore enforced in the stager (it skips a lead that already
-- has a non-failed nurture row), and this partial index gives that lookup teeth:
-- it is what a future unique-by-lead index would need, and what makes "open
-- nurture rows for this lead" a cheap read.
CREATE INDEX IF NOT EXISTS idx_staged_reminders_open_nurture
  ON staged_reminders (lead_id, message_type)
  WHERE lead_id IS NOT NULL AND status <> 'failed';

COMMIT;

-- ─── 024_journey_reminder_tracking.sql ─────────────────────────────────
-- The AI trigger-reminders cron job (src/app/api/ai/trigger-reminders) must
-- be idempotent: a reminder / follow-up that has already been emailed must
-- never be sent again on a later run. These columns persist the per-booking
-- sent-state as JSONB arrays of { type, sentAt }.
--
-- Mirrors 017 (balance_reminder_sent_at) but stores one record per
-- reminder/follow-up type so the 5 pre-trip reminders and 3 post-trip
-- follow-ups are each marked independently.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS reminders_sent JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS followups_sent JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN bookings.reminders_sent IS
  'Journey pre-trip reminders already emailed: [{"type":"n30","sentAt":"..."}]';
COMMENT ON COLUMN bookings.followups_sent IS
  'Post-trip follow-ups already emailed: [{"type":"d1","sentAt":"..."}]';
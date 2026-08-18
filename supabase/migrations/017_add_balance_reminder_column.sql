-- Migration 017: Add balance_reminder_sent_at column to bookings
-- Used by the automated balance reminder cron job to track which bookings
-- have already received a balance payment reminder.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS balance_reminder_sent_at TIMESTAMPTZ;

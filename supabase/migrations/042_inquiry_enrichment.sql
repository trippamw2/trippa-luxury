-- KIVARA AFRICA — Inquiry Enrichment (guest origin + consent)
-- Captures the three fields the public forms now collect alongside the core
-- identity block: the guest's home country, how they heard about Kivara,
-- and their explicit email consent. The guest_profiles table already carries
-- country / referral_source / email_opt_in (migration 009); this keeps the
-- raw inquiry row self-contained so the admin inquiries queue and the CRM
-- write share the same source of truth.
--
-- All changes additive (IF NOT EXISTS) — safe for existing databases.

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS country VARCHAR(100);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS referral_source VARCHAR(255);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS email_opt_in BOOLEAN NOT NULL DEFAULT true;

-- Referral source is a first-class lead-quality dim for the admin queue.
CREATE INDEX IF NOT EXISTS idx_inquiries_referral_source ON inquiries(referral_source) WHERE referral_source IS NOT NULL;
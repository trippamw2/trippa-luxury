-- 022_kivara_africa_rebrand.sql
-- Rebrand: contact identity moves to kivara.africa.
-- Applied as a data-fix migration because 005/001 already ran on live DBs.

-- Contact email → kivara.africa
UPDATE platform_settings
SET value = 'concierge@kivara.africa'
WHERE key = 'contact_email';

-- Journal author default → Kivara Concierge (was 'Trippa Concierge' from 001)
ALTER TABLE journal_posts
ALTER COLUMN author SET DEFAULT 'Kivara Concierge';
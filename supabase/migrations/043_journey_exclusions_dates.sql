-- KIVARA AFRICA — Journey Exclusions & Travel Dates
-- The AI Journey Studio now lets the operator enter the guest's travel dates
-- (arrival → departure) and the curated journey carries an explicit
-- "not included" list. Both need to round-trip through the saved_journeys row
-- so a saved proposal renders the same document every time it is reopened.
--
-- All changes additive (IF NOT EXISTS) — safe for existing databases.

ALTER TABLE saved_journeys ADD COLUMN IF NOT EXISTS exclusions JSONB NOT NULL DEFAULT '[]';
ALTER TABLE saved_journeys ADD COLUMN IF NOT EXISTS travel_dates JSONB;

COMMENT ON COLUMN saved_journeys.exclusions IS 'Items explicitly NOT included in the journey (flights, visas, insurance, gratuities…).';
COMMENT ON COLUMN saved_journeys.travel_dates IS 'Guest travel window: { start, end, flexible }. Nullable when the guest is flexible.';

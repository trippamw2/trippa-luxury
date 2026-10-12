-- KIVARA AFRICA — Pipeline Registration (AI-native company automation)
-- Closes the registration chain between back-office modules:
--   enquiries → leads → journeys → proposals → itineraries → bookings → finance
--
-- All changes additive (IF NOT EXISTS) — safe for existing databases.

-- ─── 1. BOOKINGS ← PROPOSALS / JOURNEYS ───────────────────────────────────
-- A booking created from a sent proposal must point back at the proposal and
-- the operational journey that produced it, so the admin UI and the event
-- stream can walk enquiry → journey → proposal → booking in one direction.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS journey_id UUID REFERENCES journeys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_proposal ON bookings(proposal_id) WHERE proposal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_journey ON bookings(journey_id) WHERE journey_id IS NOT NULL;

-- ─── 2. SAVED_JOURNEYS ← OPERATIONAL JOURNEYS ─────────────────────────────
-- The AI-curated document (saved_journeys) and the operational journey row
-- (journeys) are two faces of the same thing. The pipeline registers an
-- operational journey for every curated one and links them here so the link
-- survives and is idempotent.

ALTER TABLE saved_journeys ADD COLUMN IF NOT EXISTS journey_id UUID REFERENCES journeys(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_saved_journeys_journey ON saved_journeys(journey_id) WHERE journey_id IS NOT NULL;

-- ─── 3. ITINERARY ITEMS: DATE MAY BE NULL ─────────────────────────────────
-- The admin itinerary form and the AI curation engine produce day-level
-- itinerary rows before travel dates are fixed (a curated journey carries
-- `itinerary[].day` but often no calendar date). Keep `itinerary_day` NOT
-- NULL but relax `date` so an itinerary can be registered the moment a
-- journey is designed, not only once dates exist.

ALTER TABLE itinerary_items ALTER COLUMN date DROP NOT NULL;
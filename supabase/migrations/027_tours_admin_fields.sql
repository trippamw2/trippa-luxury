-- Tours admin form fields with no backing columns.
--
-- The tours admin page (src/app/admin/tours) has inputs for meeting point,
-- group size and a day-by-day itinerary, and mapTourToApi sends them, but
-- `tours` had no such columns: every save silently failed/dropped them and
-- every read rendered empty defaults.
--
-- Follows the established pattern of 003 (image), 015 (excludes/collection)
-- and 016 (bank_details): add the columns the admin UI already writes.
--
-- NOTE: migration 027 was recorded in supabase_migrations.schema_migrations
-- only after its SQL was executed directly - the 012/015 incident showed the
-- ledger can claim a migration that never ran.

ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS meeting_point TEXT,
  ADD COLUMN IF NOT EXISTS group_size VARCHAR(120),
  ADD COLUMN IF NOT EXISTS itinerary JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN tours.meeting_point IS 'Admin-form meeting point, e.g. "Mfuwe Airport or Hotel lobby"';
COMMENT ON COLUMN tours.group_size IS 'Free-text group size as shown in the admin form, e.g. "2-8 guests"';
COMMENT ON COLUMN tours.itinerary IS 'Day-by-day plan edited in the admin form: [{day, title, description}]';

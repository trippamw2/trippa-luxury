-- tours.rating and tours.languages: declared in the admin UI, absent in the DB.
--
-- Same class of defect that migration 027 fixed for meeting_point / group_size /
-- itinerary. src/app/admin/tours/page.tsx declares both on its `Tour` and
-- `ApiTour` interfaces and `mapTour` reads them, but `tours` has neither
-- column. Confirmed against the live schema via PostgREST: selecting `rating`
-- or `languages` returns HTTP 400 (column does not exist), while
-- meeting_point / group_size / itinerary / slug all return 200.
--
-- Consequence before this migration: `mapTour` coerced a missing rating to 0 on
-- every row, so the admin card rendered a confident "0" for every tour instead
-- of admitting it had no rating, and `languages` was permanently undefined.
-- That is the "silent default" failure mode 027 was written to eliminate.
--
-- rating is NUMERIC(3,2) not SMALLINT: tour ratings elsewhere in the platform
-- (suppliers) are 0-10 with fractional values, and a 0-100 scale here would
-- silently reject those. NULL is meaningful here and means "not yet rated" -
-- it must stay distinguishable from a real score of 0.

ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2)
    CHECK (rating IS NULL OR (rating >= 0 AND rating <= 10)),
  ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT NULL;

COMMENT ON COLUMN tours.rating IS
  'Average guest rating 0-10, fractional. NULL = not yet rated (never guess a 0).';
COMMENT ON COLUMN tours.languages IS
  'Languages spoken by the guide/operator, e.g. {en,fr}. NULL = not recorded.';

-- Guard the array shape: an empty array and NULL mean different things here
-- (recorded as "none" vs "not recorded"), so only reject non-string entries.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tours_languages_array_of_text'
  ) THEN
    ALTER TABLE tours
      ADD CONSTRAINT tours_languages_array_of_text
      CHECK (languages IS NULL OR array_ndims(languages) = 1);
  END IF;
END $$;

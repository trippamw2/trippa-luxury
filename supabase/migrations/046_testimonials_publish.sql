-- 046: Testimonials publish columns.
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS source_feedback_id UUID UNIQUE REFERENCES journey_feedback(id) ON DELETE SET NULL;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS trip_summary TEXT;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Backfill published from the legacy is_active flag where present.
UPDATE testimonials SET published = COALESCE(is_active, true) WHERE published IS NULL;

CREATE INDEX IF NOT EXISTS idx_testimonials_published ON testimonials (published, published_at DESC);
-- Trippa Luxury Travel Platform - Expand Content Management
-- Adds missing columns to properties table and creates experiences table

-- ─── 1. Add missing columns to properties ───────────────────────────────

ALTER TABLE properties ADD COLUMN IF NOT EXISTS awards JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS reviews JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rooms JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS long_description TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS activities JSONB DEFAULT '[]';

-- Make sure all JSONB columns exist (some may have been added earlier)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS room_types JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS romantic_highlights JSONB DEFAULT '[]';

-- ─── 2. Expand destinations table ──────────────────────────────────────

ALTER TABLE destinations ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS positioning TEXT;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS experiences JSONB DEFAULT '[]';
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]';
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS hero_image TEXT;

-- ─── 3. Create experiences table ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS experiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image TEXT,
  category VARCHAR(100),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default experiences from the hardcoded data
INSERT INTO experiences (slug, title, description, image, category, sort_order) VALUES
  ('private-beach-dining', 'Private Beach Dining', 'An intimate dinner beneath the stars with your toes in the sand. A table for two, candlelight, and the rhythm of waves as your soundtrack. The ultimate expression of romance.', '/images/dining.jpg', 'Romance', 1),
  ('walking-safari', 'Walking Safaris', 'Follow in the footsteps of explorers on a guided walking safari. Feel the earth beneath your feet and connect with Africa on its own terms. There is no more intimate way to experience the wild.', '/images/lrc-walking.jpg', 'Safari', 2),
  ('sunset-dhow', 'Sunset Dhow Cruises', 'Sail into the golden hour on a traditional dhow. Champagne in hand, the sky painted in amber and rose. A moment you will carry in your heart forever.', '/images/dhow.jpg', 'Romance', 3),
  ('couples-spa', 'Couples Spa Rituals', 'Side by side treatments in open air pavilions overlooking the ocean or bush. Ancient techniques meet modern wellness. Connection deepens with every breath.', '/images/spa.jpg', 'Wellness', 4),
  ('star-bed', 'Star Bed Safaris', 'Sleep beneath a canopy of African stars on a raised platform in the wilderness. The ultimate romantic safari experience. You and the universe. Nothing between.', '/images/starbed.jpg', 'Romance', 5),
  ('bush-dining', 'Bush Dining', 'A table set in the wilderness, surrounded by lanterns and the sounds of the African night. Fine dining meets raw nature. An evening you will never forget.', '/images/bush-dining.jpg', 'Dining', 6)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'experiences' AND policyname = 'Public can view active experiences'
  ) THEN
    CREATE POLICY "Public can view active experiences"
      ON experiences FOR SELECT
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'experiences' AND policyname = 'Admins have full access to experiences'
  ) THEN
    CREATE POLICY "Admins have full access to experiences"
      ON experiences FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM admin_profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'editor')
        )
      );
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS update_experiences_updated_at ON experiences;
CREATE TRIGGER update_experiences_updated_at
  BEFORE UPDATE ON experiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 4. Create testimonials table (for property reviews) ───────────────

CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  location VARCHAR(255),
  rating DECIMAL(2,1) DEFAULT 5.0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'testimonials' AND policyname = 'Public can view active testimonials'
  ) THEN
    CREATE POLICY "Public can view active testimonials"
      ON testimonials FOR SELECT
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'testimonials' AND policyname = 'Admins have full access to testimonials'
  ) THEN
    CREATE POLICY "Admins have full access to testimonials"
      ON testimonials FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM admin_profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'editor')
        )
      );
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS update_testimonials_updated_at ON testimonials;
CREATE TRIGGER update_testimonials_updated_at
  BEFORE UPDATE ON testimonials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

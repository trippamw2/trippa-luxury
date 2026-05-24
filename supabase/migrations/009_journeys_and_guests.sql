-- Trippa Luxury Travel Platform - Journeys & Guest Profiles
-- Persists AI-generated journeys and centralized guest records

-- ─── 1. Guest Profiles ──────────────────────────────────────────────
-- Centralized guest record linked to inquiries and bookings

CREATE TABLE IF NOT EXISTS guest_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  country VARCHAR(100),
  is_couple BOOLEAN DEFAULT true,

  -- Preferences
  travel_style VARCHAR(50),        -- romantic, adventure, relaxation, cultural, mixed
  accommodation_style VARCHAR(50), -- intimate-boutique, luxury-resort, eco-camp, private-villa
  activity_level VARCHAR(20),      -- low, moderate, high
  budget_range VARCHAR(20),        -- premium, ultra-luxury
  dietary_restrictions JSONB DEFAULT '[]',
  interests JSONB DEFAULT '[]',

  -- Relationship tracking
  special_occasion VARCHAR(100),       -- honeymoon, anniversary, birthday
  special_occasion_date DATE,
  anniversary_date DATE,
  past_destinations JSONB DEFAULT '[]',
  wishlist JSONB DEFAULT '[]',

  -- Stats
  total_bookings INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  last_trip_date DATE,
  last_contacted_at TIMESTAMPTZ,

  -- Source
  source VARCHAR(50) DEFAULT 'website',  -- website, whatsapp, email, referral, repeat
  referral_source VARCHAR(255),
  notes TEXT,

  -- Engagement
  is_vip BOOLEAN DEFAULT false,
  email_opt_in BOOLEAN DEFAULT true,
  tags JSONB DEFAULT '[]',              -- e.g. ["honeymoon", "lake-malawi-lover", "returning"]

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_profiles_email ON guest_profiles(email);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_special_occasion ON guest_profiles(special_occasion);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_is_vip ON guest_profiles(is_vip);

-- ─── 2. Saved Journeys ──────────────────────────────────────────────
-- Persists AI-curated and manually created itineraries

CREATE TABLE IF NOT EXISTS saved_journeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  quote_ref VARCHAR(20) UNIQUE,       -- e.g. "QTE-0001"

  -- Guest association
  guest_profile_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL,
  guest_name VARCHAR(255) NOT NULL,
  guest_email VARCHAR(255) NOT NULL,
  guest_phone VARCHAR(50),
  is_couple BOOLEAN DEFAULT true,
  special_occasion VARCHAR(100),

  -- Journey data
  destinations JSONB DEFAULT '[]',        -- ["lake-malawi", "south-luangwa", ...]
  duration INTEGER DEFAULT 0,             -- total nights
  itinerary JSONB DEFAULT '[]',           -- JourneyDay[] as JSON array
  pricing JSONB DEFAULT '{}',             -- JourneyPricing as JSON
  highlights JSONB DEFAULT '[]',
  included_extras JSONB DEFAULT '[]',

  -- Preferences snapshot (what was used to generate this)
  preferences JSONB DEFAULT '{}',

  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'modified', 'accepted', 'booked', 'archived')),
  version INTEGER DEFAULT 1,

  -- Linked records
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Audit
  created_by UUID REFERENCES admin_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_saved_journeys_guest_email ON saved_journeys(guest_email);
CREATE INDEX IF NOT EXISTS idx_saved_journeys_status ON saved_journeys(status);
CREATE INDEX IF NOT EXISTS idx_saved_journeys_created_at ON saved_journeys(created_at DESC);

-- ─── 3. RLS Policies ───────────────────────────────────────────────

ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_journeys ENABLE ROW LEVEL SECURITY;

-- Guest profiles: staff read/write
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'guest_profiles' AND policyname = 'Staff full access to guest profiles') THEN
    CREATE POLICY "Staff full access to guest profiles"
      ON guest_profiles FOR ALL
      USING (
        EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor', 'agent'))
      );
  END IF;
END;
$$;

-- Saved journeys: staff read/write
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'saved_journeys' AND policyname = 'Staff full access to saved journeys') THEN
    CREATE POLICY "Staff full access to saved journeys"
      ON saved_journeys FOR ALL
      USING (
        EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor', 'agent'))
      );
  END IF;
END;
$$;

-- ─── 4. Triggers ───────────────────────────────────────────────────

DROP TRIGGER IF EXISTS update_guest_profiles_updated_at ON guest_profiles;
CREATE TRIGGER update_guest_profiles_updated_at
  BEFORE UPDATE ON guest_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_saved_journeys_updated_at ON saved_journeys;
CREATE TRIGGER update_saved_journeys_updated_at
  BEFORE UPDATE ON saved_journeys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

// Apply migration 009 via Supabase Management API
// Usage: node scripts/apply-migration-009.mjs

const SUPABASE_PROJECT_REF = "lgpdnmtauvkpkgmyyjcr";
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_ACCESS_TOKEN) {
  console.error("Missing SUPABASE_ACCESS_TOKEN env var");
  process.exit(1);
}

const sql = `
-- Trippa Luxury Travel Platform - Journeys & Guest Profiles
-- Persists AI-generated journeys and centralized guest records

-- ─── 1. Guest Profiles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guest_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  country VARCHAR(100),
  is_couple BOOLEAN DEFAULT true,
  travel_style VARCHAR(50),
  accommodation_style VARCHAR(50),
  activity_level VARCHAR(20),
  budget_range VARCHAR(20),
  dietary_restrictions JSONB DEFAULT '[]',
  interests JSONB DEFAULT '[]',
  special_occasion VARCHAR(100),
  special_occasion_date DATE,
  anniversary_date DATE,
  past_destinations JSONB DEFAULT '[]',
  wishlist JSONB DEFAULT '[]',
  total_bookings INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  last_trip_date DATE,
  last_contacted_at TIMESTAMPTZ,
  source VARCHAR(50) DEFAULT 'website',
  referral_source VARCHAR(255),
  notes TEXT,
  is_vip BOOLEAN DEFAULT false,
  email_opt_in BOOLEAN DEFAULT true,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Saved Journeys ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_journeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  quote_ref VARCHAR(20) UNIQUE,
  guest_profile_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL,
  guest_name VARCHAR(255) NOT NULL,
  guest_email VARCHAR(255) NOT NULL,
  guest_phone VARCHAR(50),
  is_couple BOOLEAN DEFAULT true,
  special_occasion VARCHAR(100),
  destinations JSONB DEFAULT '[]',
  duration INTEGER DEFAULT 0,
  itinerary JSONB DEFAULT '[]',
  pricing JSONB DEFAULT '{}',
  highlights JSONB DEFAULT '[]',
  included_extras JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','modified','accepted','booked','archived')),
  version INTEGER DEFAULT 1,
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_by UUID REFERENCES admin_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
);

-- ─── 3. RLS ─────────────────────────────────────────────────────────
ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_journeys ENABLE ROW LEVEL SECURITY;

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

-- ─── 5. Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_guest_profiles_email ON guest_profiles(email);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_special_occasion ON guest_profiles(special_occasion);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_is_vip ON guest_profiles(is_vip);
CREATE INDEX IF NOT EXISTS idx_saved_journeys_guest_email ON saved_journeys(guest_email);
CREATE INDEX IF NOT EXISTS idx_saved_journeys_status ON saved_journeys(status);
CREATE INDEX IF NOT EXISTS idx_saved_journeys_created_at ON saved_journeys(created_at DESC);
`;

async function applyMigration() {
  console.log("Applying migration 009...");
  
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(`Migration failed (${response.status}):`, text);
    process.exit(1);
  }

  console.log("Migration 009 applied successfully!");
}

applyMigration().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});

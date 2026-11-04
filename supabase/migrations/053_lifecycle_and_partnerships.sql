-- 053: Lifecycle hygiene — booking archive, applied amendments, partnerships, staff invites.

-- 1. Bookings are archived, not deleted. Financial records must survive.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_bookings_archived_at ON bookings (archived_at) WHERE archived_at IS NOT NULL;

-- 2. An amendment now records whether it was actually applied to the booking.
ALTER TABLE booking_amendments ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;
ALTER TABLE booking_amendments ADD COLUMN IF NOT EXISTS applied_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL;

-- 3. Partnerships were a scoring endpoint with nowhere to store the result.
CREATE TABLE IF NOT EXISTS partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'hotel'
    CHECK (category IN ('hotel', 'dmc', 'brand', 'airline', 'media', 'other')),
  contact_name TEXT,
  contact_email TEXT,
  country TEXT,
  status TEXT NOT NULL DEFAULT 'prospect'
    CHECK (status IN ('prospect', 'active', 'paused', 'declined')),
  fit_score NUMERIC,
  notes TEXT,
  source TEXT,
  created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (partner_name, category)
);

CREATE INDEX IF NOT EXISTS idx_partnerships_status ON partnerships (status, created_at DESC);

ALTER TABLE partnerships ENABLE ROW LEVEL SECURITY;
-- Service-role only: no policies for anon/authenticated.

-- 4. Staff invites are tracked so the Users screen can show who is pending.
ALTER TABLE admin_profiles ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ;

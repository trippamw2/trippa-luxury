-- KIVARA AFRICA — Phase 2: Data Foundation
-- Adds: leads, proposals, itinerary_items, services
-- All tables additive (IF NOT EXISTS) — safe for existing databases

-- ═══════════════════════════════════════════════════════════════
-- LEADS (CRM Pipeline)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  country VARCHAR(100),

  -- Traveller details
  traveller_type VARCHAR(50) CHECK (traveller_type IN ('couple', 'family', 'friends', 'solo', 'corporate', 'private_group')),
  number_of_travellers INTEGER DEFAULT 2,
  is_couple BOOLEAN DEFAULT true,

  -- Travel dates
  preferred_start_date DATE,
  preferred_end_date DATE,
  flexible_dates BOOLEAN DEFAULT false,

  -- Budget
  estimated_budget DECIMAL(12,2),
  budget_range VARCHAR(50),
  currency VARCHAR(10) DEFAULT 'USD',

  -- Occasion / motivation
  occasion VARCHAR(100) CHECK (occasion IN ('honeymoon', 'anniversary', 'proposal', 'birthday', 'romance', 'escape', 'adventure', 'celebration', 'other')),
  is_honeymoon BOOLEAN DEFAULT false,
  is_anniversary BOOLEAN DEFAULT false,
  is_proposal BOOLEAN DEFAULT false,
  is_birthday BOOLEAN DEFAULT false,
  is_escape BOOLEAN DEFAULT false,
  is_adventure BOOLEAN DEFAULT false,

  -- Interests (multi-select)
  interest_safari BOOLEAN DEFAULT false,
  interest_beach BOOLEAN DEFAULT false,
  interest_lake BOOLEAN DEFAULT false,
  interest_island BOOLEAN DEFAULT false,
  interest_bush_beach BOOLEAN DEFAULT false,
  interest_romance BOOLEAN DEFAULT false,
  interest_honeymoon BOOLEAN DEFAULT false,
  interest_bespoke BOOLEAN DEFAULT false,

  -- Preferences
  preferred_destinations JSONB DEFAULT '[]',
  preferred_accommodation VARCHAR(100),
  privacy_preference VARCHAR(50),
  activity_level VARCHAR(50),
  preferred_transport VARCHAR(100),
  dietary_requirements TEXT,
  special_requests TEXT,

  -- Journey story
  story TEXT,

  -- Source / marketing
  source VARCHAR(50) DEFAULT 'website' CHECK (source IN ('website', 'whatsapp', 'email', 'referral', 'social', 'advertising', 'other')),
  campaign VARCHAR(255),
  referral_partner VARCHAR(255),
  landing_page VARCHAR(500),

  -- Assignment & pipeline
  assigned_to UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  lead_status VARCHAR(50) DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'qualified', 'discovery', 'journey_design', 'proposal_sent', 'negotiation', 'booking', 'lost')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Contact tracking
  last_contacted_at TIMESTAMPTZ,
  next_follow_up DATE,
  follow_up_task TEXT,
  follow_up_assigned_to UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,
  admin_notes TEXT,

  -- Links to existing records
  inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  guest_profile_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL,

  -- Audit
  created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up ON leads(next_follow_up) WHERE next_follow_up IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_inquiry_id ON leads(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_leads_guest_profile_id ON leads(guest_profile_id);

-- ═══════════════════════════════════════════════════════════════
-- LEAD ACTIVITY TIMELINE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('call', 'email', 'whatsapp', 'sms', 'meeting', 'note', 'proposal', 'payment', 'status_change', 'follow_up', 'other')),
  subject TEXT,
  body TEXT,
  performed_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  related_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  related_issue_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_performed ON lead_activities(performed_by);

-- ═══════════════════════════════════════════════════════════════
-- JOURNEYS (Journey Management)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS journeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  journey_name VARCHAR(255) NOT NULL,
  internal_reference VARCHAR(50) UNIQUE,
  slug VARCHAR(255) UNIQUE,

  -- Association
  customer_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Travellers
  travellers JSONB DEFAULT '[]',
  number_of_travellers INTEGER DEFAULT 2,

  -- Dates
  start_date DATE,
  end_date DATE,
  duration_days INTEGER,

  -- Classification
  journey_type VARCHAR(100),
  category VARCHAR(100),
  destinations JSONB DEFAULT '[]',

  -- Status workflow
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'designing', 'proposal_ready', 'proposal_sent', 'customer_review', 'confirmed', 'in_operation', 'completed', 'cancelled')),

  -- Financial
  total_selling_price DECIMAL(12,2) DEFAULT 0,
  total_supplier_cost DECIMAL(12,2) DEFAULT 0,
  gross_profit DECIMAL(12,2) DEFAULT 0,
  gross_margin DECIMAL(5,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',

  -- Assignment
  assigned_designer UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,
  internal_notes TEXT,
  customer_notes TEXT,

  -- Audit
  created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journeys_customer ON journeys(customer_id);
CREATE INDEX IF NOT EXISTS idx_journeys_lead ON journeys(lead_id);
CREATE INDEX IF NOT EXISTS idx_journeys_status ON journeys(status);
CREATE INDEX IF NOT EXISTS idx_journeys_designer ON journeys(assigned_designer);
CREATE INDEX IF NOT EXISTS idx_journeys_start_date ON journeys(start_date);
CREATE INDEX IF NOT EXISTS idx_journeys_reference ON journeys(internal_reference);

-- ═══════════════════════════════════════════════════════════════
-- ITINERARY ITEMS (Day-by-day builder)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS itinerary_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,

  -- Scheduling
  itinerary_day INTEGER NOT NULL,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,

  -- Location
  location VARCHAR(500),
  destination VARCHAR(100),
  region VARCHAR(100),

  -- Content
  category VARCHAR(100),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES supplier_services(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  customer_facing_description TEXT,
  internal_notes TEXT,

  -- Pricing (per item)
  cost DECIMAL(12,2) DEFAULT 0,
  selling_price DECIMAL(12,2) DEFAULT 0,
  commission DECIMAL(12,2) DEFAULT 0,
  margin DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',

  -- Booking reference
  booking_status VARCHAR(50) DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'cancelled')),
  confirmation_number VARCHAR(100),
  supplier_reference VARCHAR(255),

  -- Attachments
  attachments JSONB DEFAULT '[]',

  -- Ordering & audit
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itinerary_items_journey ON itinerary_items(journey_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_day ON itinerary_items(journey_id, itinerary_day);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_supplier ON itinerary_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_service ON itinerary_items(service_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_sort ON itinerary_items(journey_id, sort_order);

-- ═══════════════════════════════════════════════════════════════
-- SERVICES (Standalone catalog — decoupled from suppliers)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT,
  internal_description TEXT,
  customer_description TEXT,

  -- Classification
  category VARCHAR(100) CHECK (category IN ('accommodation', 'transport', 'experience', 'dining', 'wellness', 'photography', 'concierge', 'other')),
  subcategory VARCHAR(100),
  destination VARCHAR(100),

  -- Supplier link (optional)
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,

  -- Pricing
  net_cost DECIMAL(12,2) DEFAULT 0,
  public_price DECIMAL(12,2),
  pricing_rules JSONB DEFAULT '{}',
  currency VARCHAR(10) DEFAULT 'USD',
  commission_rate DECIMAL(5,2) DEFAULT 0,
  commission_amount DECIMAL(12,2) DEFAULT 0,

  -- Availability
  availability_model VARCHAR(50) CHECK (availability_model IN ('per_night', 'per_person', 'per_room', 'per_service', 'per_group', 'fixed', 'on_request')),
  min_pax INTEGER DEFAULT 1,
  max_pax INTEGER DEFAULT 20,
  cancellation_policy TEXT,
  seasonality JSONB DEFAULT '{}',

  -- Status & media
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  media JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',

  -- Kivara classification (internal)
  kivara_classification VARCHAR(50) CHECK (kivara_classification IN ('kivara_approved', 'kivara_preferred', 'kivara_signature', null)),

  -- Audit
  created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_destination ON services(destination);
CREATE INDEX IF NOT EXISTS idx_services_supplier ON services(supplier_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_public ON services(is_public);

-- ═══════════════════════════════════════════════════════════════
-- PROPOSALS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  proposal_reference VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,

  -- Association
  journey_id UUID REFERENCES journeys(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Content
  journey_summary TEXT,
  itinerary_description TEXT,
  accommodation JSONB DEFAULT '[]',
  experiences JSONB DEFAULT '[]',
  inclusions JSONB DEFAULT '[]',
  exclusions JSONB DEFAULT '[]',
  important_notes TEXT,
  terms_and_conditions TEXT,
  kivara_contact_details JSONB DEFAULT '{}',

  -- Customer-facing investment
  total_investment DECIMAL(12,2) DEFAULT 0,
  deposit_amount DECIMAL(12,2) DEFAULT 0,
  balance_amount DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  payment_terms TEXT,
  cancellation_terms TEXT,

  -- Internal financial (NOT customer-facing)
  supplier_cost DECIMAL(12,2) DEFAULT 0,
  gross_profit DECIMAL(12,2) DEFAULT 0,
  gross_margin DECIMAL(5,2) DEFAULT 0,
  commission DECIMAL(12,2) DEFAULT 0,

  -- Status workflow
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'sent', 'viewed', 'accepted', 'declined', 'expired')),

  -- Tracking
  sent_date TIMESTAMPTZ,
  viewed_date TIMESTAMPTZ,
  accepted_date TIMESTAMPTZ,
  expiry_date DATE,
  sent_to_email VARCHAR(255),

  -- Design
  branding JSONB DEFAULT '{}',
  cover_image TEXT,

  -- Audit
  created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_journey ON proposals(journey_id);
CREATE INDEX IF NOT EXISTS idx_proposals_customer ON proposals(customer_id);
CREATE INDEX IF NOT EXISTS idx_proposals_lead ON proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_reference ON proposals(proposal_reference);
CREATE INDEX IF NOT EXISTS idx_proposals_expiry ON proposals(expiry_date);

-- ═══════════════════════════════════════════════════════════════
-- SUPPLIER RESERVATIONS (per booking, per supplier)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE booking_suppliers ADD COLUMN IF NOT EXISTS confirmation_number VARCHAR(100);
ALTER TABLE booking_suppliers ADD COLUMN IF NOT EXISTS supplier_status VARCHAR(50) DEFAULT 'pending' CHECK (supplier_status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled'));
ALTER TABLE booking_suppliers ADD COLUMN IF NOT EXISTS payment_deadline DATE;
ALTER TABLE booking_suppliers ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'refunded'));
ALTER TABLE booking_suppliers ADD COLUMN IF NOT EXISTS cancellation_deadline DATE;
ALTER TABLE booking_suppliers ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;
ALTER TABLE booking_suppliers ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]';
ALTER TABLE booking_suppliers ADD COLUMN IF NOT EXISTS supplier_reference VARCHAR(255);
ALTER TABLE booking_suppliers ADD COLUMN IF NOT EXISTS passenger_information JSONB DEFAULT '[]';

-- ═══════════════════════════════════════════════════════════════
-- CONCIERGE REQUESTS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS concierge_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Association
  customer_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL,
  journey_id UUID REFERENCES journeys(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Request details
  category VARCHAR(100) CHECK (category IN ('airport_vip', 'flowers', 'private_dinner', 'photographer', 'proposal', 'birthday', 'anniversary', 'vehicle', 'dietary', 'spa', 'experience', 'other')),
  request TEXT NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Assignment
  assigned_staff UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,

  -- Financial
  cost DECIMAL(12,2) DEFAULT 0,
  selling_price DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',

  -- Status & timing
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'in_progress', 'supplier_confirmed', 'completed', 'cancelled')),
  due_date DATE,
  completed_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,

  -- Audit
  created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_concierge_customer ON concierge_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_concierge_journey ON concierge_requests(journey_id);
CREATE INDEX IF NOT EXISTS idx_concierge_status ON concierge_requests(status);
CREATE INDEX IF NOT EXISTS idx_concierge_priority ON concierge_requests(priority);
CREATE INDEX IF NOT EXISTS idx_concierge_assigned ON concierge_requests(assigned_staff);
CREATE INDEX IF NOT EXISTS idx_concierge_due ON concierge_requests(due_date) WHERE due_date IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- CATEGORY MANAGEMENT (CMS-manageable categories for public site)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image TEXT,
  destination VARCHAR(100),
  journey_id UUID REFERENCES journeys(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_destination ON categories(destination);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);

-- ═══════════════════════════════════════════════════════════════
-- LEAD PIPELINE STATUS HISTORY
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lead_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead ON lead_status_history(lead_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_journeys_updated_at BEFORE UPDATE ON journeys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_itinerary_items_updated_at BEFORE UPDATE ON itinerary_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_concierge_requests_updated_at BEFORE UPDATE ON concierge_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate proposal reference
CREATE OR REPLACE FUNCTION generate_proposal_reference()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  ref TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(proposal_reference, '-', 2) AS INTEGER)), 0) + 1
  INTO next_num FROM proposals;
  ref := 'PRP-' || LPAD(next_num::TEXT, 4, '0');
  NEW.proposal_reference := ref;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_proposal_reference BEFORE INSERT ON proposals FOR EACH ROW EXECUTE FUNCTION generate_proposal_reference();

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access to leads" ON leads FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor', 'agent'))
);
CREATE POLICY "Staff read access to leads" ON leads FOR SELECT USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor', 'agent'))
);

-- Lead Activities
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access to lead activities" ON lead_activities FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor', 'agent'))
);

-- Journeys
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access to journeys" ON journeys FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor', 'agent'))
);

-- Itinerary Items
ALTER TABLE itinerary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access to itinerary items" ON itinerary_items FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor', 'agent'))
);

-- Services
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access to services" ON services FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor', 'agent'))
);
CREATE POLICY "Public can view active public services" ON services FOR SELECT USING (is_active = true AND is_public = true);

-- Proposals
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access to proposals" ON proposals FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor', 'agent'))
);

-- Concierge Requests
ALTER TABLE concierge_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access to concierge requests" ON concierge_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor', 'agent'))
);

-- Categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access to categories" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor', 'agent'))
);
CREATE POLICY "Public can view active categories" ON categories FOR SELECT USING (is_active = true AND is_public = true);

-- Lead Status History
ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff full access to lead status history" ON lead_status_history FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor', 'agent'))
);

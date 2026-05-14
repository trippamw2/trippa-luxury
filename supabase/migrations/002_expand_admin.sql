-- Trippa Luxury Travel Platform - Expansion Schema
-- Adds: bookings, tours, finance, suppliers for full travel company admin

-- ─── SUPPLIERS ──────────────────────────────────────────────────────────
-- Lodges, airlines, car rentals, transfer services, activity providers

CREATE TABLE supplier_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO supplier_categories (slug, name, description) VALUES
  ('lodge', 'Lodges & Camps', 'Hotels, lodges, camps, and villas'),
  ('airline', 'Airlines', 'Commercial and charter airlines'),
  ('car-rental', 'Car Rentals', 'Vehicle rental and chauffeur services'),
  ('transfer', 'Transfers', 'Airport transfers and ground transport'),
  ('activity', 'Activity Providers', 'Tour operators, guides, and experience providers'),
  ('spa', 'Spa & Wellness', 'Spa and wellness partners'),
  ('catering', 'Catering & Dining', 'Private chefs and dining experiences');

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES supplier_categories(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(100),
  alternate_phone VARCHAR(100),
  website TEXT,
  address TEXT,
  country VARCHAR(100),
  city VARCHAR(100),
  commission_rate DECIMAL(5,2) DEFAULT 0, -- e.g. 15.00 = 15%
  payment_terms VARCHAR(255), -- e.g. "Net 30", "50% deposit"
  contract_on_file BOOLEAN DEFAULT false,
  insurance_on_file BOOLEAN DEFAULT false,
  certifications JSONB DEFAULT '[]',
  notes TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
  rating DECIMAL(2,1) DEFAULT 0.0,
  logo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE supplier_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(12,2),
  currency VARCHAR(10) DEFAULT 'USD',
  pricing_model VARCHAR(50) CHECK (pricing_model IN ('per_night', 'per_person', 'per_vehicle', 'per_hour', 'flat_fee', 'on_request')),
  destination VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TOURS (Experiences / Tour Products) ────────────────────────────────

CREATE TABLE tours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  subtitle TEXT,
  description TEXT,
  highlights JSONB DEFAULT '[]',
  destination VARCHAR(50),
  category VARCHAR(100), -- e.g. "Safari", "Beach", "Cultural", "Adventure", "Honeymoon"
  duration_days INTEGER DEFAULT 1,
  duration_hours VARCHAR(50),
  difficulty VARCHAR(50) CHECK (difficulty IN ('easy', 'moderate', 'strenuous')),
  included JSONB DEFAULT '[]',
  excluded JSONB DEFAULT '[]',
  what_to_bring JSONB DEFAULT '[]',
  pricing_from DECIMAL(12,2),
  currency VARCHAR(10) DEFAULT 'USD',
  pricing_type VARCHAR(50) CHECK (pricing_type IN ('per_person', 'per_couple', 'private_group', 'on_request')),
  min_pax INTEGER DEFAULT 1,
  max_pax INTEGER DEFAULT 20,
  images JSONB DEFAULT '[]',
  hero_image TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tour_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID REFERENCES tours(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  available_slots INTEGER DEFAULT 10,
  booked_slots INTEGER DEFAULT 0,
  price_adjustment DECIMAL(12,2) DEFAULT 0, -- seasonal adjustment
  is_available BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BOOKINGS ───────────────────────────────────────────────────────────

CREATE TABLE booking_statuses (
  slug VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(50) DEFAULT 'gray',
  sort_order INTEGER DEFAULT 0
);

INSERT INTO booking_statuses (slug, name, color, sort_order) VALUES
  ('provisional', 'Provisional', 'yellow', 1),
  ('confirmed', 'Confirmed', 'green', 2),
  ('deposit_paid', 'Deposit Paid', 'blue', 3),
  ('balance_due', 'Balance Due', 'orange', 4),
  ('paid', 'Paid in Full', 'emerald', 5),
  ('in_progress', 'In Progress', 'indigo', 6),
  ('completed', 'Completed', 'gray', 7),
  ('cancelled', 'Cancelled', 'red', 8),
  ('refunded', 'Refunded', 'pink', 9);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_reference VARCHAR(20) UNIQUE NOT NULL, -- e.g. "TRP-0001"
  inquiry_id UUID REFERENCES inquiries(id),
  status VARCHAR(50) DEFAULT 'provisional' REFERENCES booking_statuses(slug),

  -- Client info (denormalized from inquiry for historical record)
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50),
  client_country VARCHAR(100),
  guests_count INTEGER DEFAULT 2,

  -- Booking details
  package_id UUID REFERENCES packages(id),
  tour_id UUID REFERENCES tours(id),
  property_id UUID REFERENCES properties(id),
  destination VARCHAR(50),
  start_date DATE,
  end_date DATE,
  duration_nights INTEGER,
  room_type VARCHAR(255),

  -- Pricing
  total_amount DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  deposit_amount DECIMAL(12,2) DEFAULT 0,
  deposit_due_date DATE,
  balance_amount DECIMAL(12,2) DEFAULT 0,
  balance_due_date DATE,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_reason TEXT,
  final_amount DECIMAL(12,2) DEFAULT 0,

  -- Special requests
  special_requests TEXT,
  dietary_requirements TEXT,
  room_preferences TEXT,

  -- Admin
  assigned_to UUID REFERENCES admin_profiles(id),
  internal_notes TEXT,
  source VARCHAR(50) DEFAULT 'website',

  -- Timestamps
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking suppliers (which suppliers are used in this booking)
CREATE TABLE booking_suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  service_id UUID REFERENCES supplier_services(id),
  service_name VARCHAR(255),
  cost DECIMAL(12,2),
  currency VARCHAR(10) DEFAULT 'USD',
  start_date DATE,
  end_date DATE,
  notes TEXT,
  UNIQUE(booking_id, supplier_id, service_id)
);

-- ─── FINANCE ────────────────────────────────────────────────────────────

CREATE TABLE payment_methods (
  slug VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

INSERT INTO payment_methods (slug, name) VALUES
  ('stripe', 'Stripe (Card)'),
  ('paypal', 'PayPal'),
  ('bank_transfer', 'Bank Transfer'),
  ('cash', 'Cash'),
  ('credit_note', 'Credit Note'),
  ('other', 'Other');

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) CHECK (transaction_type IN ('deposit', 'balance', 'full_payment', 'refund', 'partial_refund', 'credit_note')),
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  payment_method VARCHAR(50) REFERENCES payment_methods(slug),
  payment_reference VARCHAR(255), -- external payment reference
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  notes TEXT,
  receipt_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. "INV-2026-0001"
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  invoice_type VARCHAR(50) CHECK (invoice_type IN ('deposit', 'balance', 'final', 'credit_note', 'proforma')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  line_items JSONB DEFAULT '[]', -- [{description, quantity, unit_price, total}]
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded')),
  notes TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── FINANCE TRACKING (P&L, Revenue) ────────────────────────────────────

CREATE TABLE expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT
);

INSERT INTO expense_categories (name, slug, description) VALUES
  ('Accommodation', 'accommodation', 'Lodge and hotel costs'),
  ('Transport', 'transport', 'Flights, transfers, car rentals'),
  ('Activities', 'activities', 'Tour and activity costs'),
  ('Staff', 'staff', 'Guide and staff payments'),
  ('Marketing', 'marketing', 'Advertising and promotion'),
  ('Operations', 'operations', 'Office and operational expenses'),
  ('Commission', 'commission', 'Agent and partner commissions'),
  ('Other', 'other', 'Miscellaneous expenses');

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id),
  category_id UUID REFERENCES expense_categories(id),
  supplier_id UUID REFERENCES suppliers(id),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_reimbursable BOOLEAN DEFAULT false,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ENHANCE EXISTING TABLES ────────────────────────────────────────────

-- Add new status option to inquiries
ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_status_check;
ALTER TABLE inquiries ADD CONSTRAINT inquiries_status_check
  CHECK (status IN ('new', 'read', 'contacted', 'qualified', 'proposal', 'booked', 'lost', 'closed'));

-- Add assigned_to and booking_id to inquiries
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES admin_profiles(id);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id);
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;

-- Add budget column to inquiries
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS budget_range VARCHAR(100);

-- ─── RLS POLICIES FOR NEW TABLES ────────────────────────────────────────

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Admin full access to all new tables
CREATE POLICY "Admin full access to suppliers"
  ON suppliers FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "Admin full access to tours"
  ON tours FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

CREATE POLICY "Admin full access to bookings"
  ON bookings FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor', 'agent'))
  );

CREATE POLICY "Admin full access to transactions"
  ON transactions FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin'))
  );

CREATE POLICY "Admin full access to invoices"
  ON invoices FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin'))
  );

CREATE POLICY "Admin full access to expenses"
  ON expenses FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin'))
  );

-- Public can view active tours
CREATE POLICY "Public can view active tours"
  ON tours FOR SELECT USING (is_active = true);

-- Public can view tour availability
CREATE POLICY "Public can view tour availability"
  ON tour_availability FOR SELECT USING (is_available = true);

-- Fix: Add missing RLS policies for supplier_services
CREATE POLICY "Admin full access to supplier services"
  ON supplier_services FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
  );

-- Fix: Add missing RLS policies for booking_suppliers
CREATE POLICY "Admin full access to booking suppliers"
  ON booking_suppliers FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor', 'agent'))
  );

-- Public can view active services
CREATE POLICY "Public can view supplier services"
  ON supplier_services FOR SELECT USING (is_active = true);

-- ─── INDEXES ────────────────────────────────────────────────────────────

CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX idx_bookings_client ON bookings(client_email);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX idx_transactions_booking ON transactions(booking_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_invoices_booking ON invoices(booking_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_suppliers_category ON suppliers(category_id);
CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_tours_destination ON tours(destination);
CREATE INDEX idx_tours_category ON tours(category);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_booking_suppliers_booking ON booking_suppliers(booking_id);

-- ─── TRIGGERS ───────────────────────────────────────────────────────────

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tours_updated_at
  BEFORE UPDATE ON tours FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  ref TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SPLIT_PART(booking_reference, '-', 2) AS INTEGER)), 0) + 1
  INTO next_num FROM bookings;
  ref := 'TRP-' || LPAD(next_num::TEXT, 4, '0');
  NEW.booking_reference := ref;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_reference
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION generate_booking_reference();

-- Auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  year_prefix TEXT;
  next_num INTEGER;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(CAST(SPLIT_PART(invoice_number, '-', 3) AS INTEGER)), 0) + 1
  INTO next_num FROM invoices WHERE invoice_number LIKE 'INV-' || year_prefix || '-%';
  NEW.invoice_number := 'INV-' || year_prefix || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

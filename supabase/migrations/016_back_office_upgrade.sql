-- Kivara Luxury Travel Platform - Back Office Upgrade (10/10 buildout)
-- Adds: per-module RBAC permissions, CRM linkage (bookings/inquiries <-> guest_profiles),
--       guest communication timeline, supplier payouts, booking amendments,
--       transaction<->invoice reconciliation, blog SEO + scheduling, team tasks.
--
-- All additions are additive (IF NOT EXISTS) and safe to apply against a
-- populated production database.

-- ─── 1. RBAC: per-module permission overrides on admin_profiles ─────────
-- `permissions` is a JSONB map of module -> effective role ("admin" | "editor" | "agent" | false).
--   * A key with false denies access to that module outright.
--   * A missing key falls back to the user's base `role`.
-- Example: {"finance": "editor", "users": false} grants an admin's finance rights
--          to an editor while locking admin management to admins only.
ALTER TABLE admin_profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- ─── 2. Bookings <-> CRM linkage ────────────────────────────────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_profile_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL;

-- ─── 3. Inquiries: assignment, SLA, CRM linkage, conversion ─────────────
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS guest_profile_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES admin_profiles(id) ON DELETE SET NULL;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS response_count INTEGER DEFAULT 0;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS converted_to_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- Extend the inquiry pipeline with a "qualified" stage (the admin UI already
-- uses it, but the original CHECK constraint only allowed new/read/contacted/booked/closed).
ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_status_check;
ALTER TABLE inquiries ADD CONSTRAINT inquiries_status_check
  CHECK (status IN ('new', 'read', 'contacted', 'qualified', 'booked', 'closed'));

-- ─── 4. Guest communication timeline ────────────────────────────────────
CREATE TABLE IF NOT EXISTS guest_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_profile_id UUID NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'call', 'whatsapp', 'sms', 'meeting', 'note')),
  direction VARCHAR(10) NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  body TEXT,
  related_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  related_inquiry_id UUID REFERENCES inquiries(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. Supplier payouts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(10) DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'paid', 'failed', 'cancelled')),
  scheduled_date DATE,
  paid_date TIMESTAMPTZ,
  method VARCHAR(50),
  reference VARCHAR(255),
  notes TEXT,
  created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. Transaction <-> Invoice reconciliation ──────────────────────────
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- ─── 7. Booking amendment history ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  field VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  changed_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 8. Supplier banking details ────────────────────────────────────────
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bank_details TEXT;

-- ─── 9. Blog SEO + scheduled publishing ─────────────────────────────────
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS seo_title VARCHAR(200);
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- ─── 10. Team tasks ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  related_type VARCHAR(30),
  related_id UUID,
  priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes for the hot query paths ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_guest_profile ON bookings(guest_profile_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned ON inquiries(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inquiries_sla ON inquiries(sla_due_at) WHERE sla_due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guest_comms_guest ON guest_communications(guest_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_supplier ON supplier_payouts(supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_payouts_scheduled ON supplier_payouts(status, scheduled_date) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_amendments_booking ON booking_amendments(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id, status) WHERE assignee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date) WHERE status <> 'done';

-- ─── RLS for the new tables ─────────────────────────────────────────────
-- Staff helper mirrors the is_admin_user() pattern from migration 014 but
-- accepts every active staff role (admin / editor / agent). The admin API
-- uses the service-role client which bypasses RLS; these policies are
-- defence-in-depth so no anon/authenticated client can reach the tables.
CREATE OR REPLACE FUNCTION public.is_staff_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE id = auth.uid() AND is_active = true AND role IN ('admin', 'editor', 'agent')
  );
$$;

ALTER TABLE guest_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage guest communications"
  ON guest_communications FOR ALL USING (public.is_staff_user());

CREATE POLICY "Staff manage supplier payouts"
  ON supplier_payouts FOR ALL USING (public.is_staff_user());

CREATE POLICY "Staff manage booking amendments"
  ON booking_amendments FOR ALL USING (public.is_staff_user());

CREATE POLICY "Staff manage tasks"
  ON tasks FOR ALL USING (public.is_staff_user());

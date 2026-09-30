-- KIVARA — 029: RLS Gap Closure
--
-- Found during the AI-native system analysis: 44 tables exist but only 40 had
-- Row Level Security enabled. Four reference/config tables were readable by
-- ANY role holding the anon or authenticated key — including
-- `payment_methods` and `expense_categories`, which describe how Kivara moves
-- and categorises money.
--
-- Verified before applying: none of these four tables are read by any public
-- route (/api/data/*, /api/guest/*, /api/inquiry, /api/newsletter,
-- public-data.ts, use-public-data.ts). All references are in /api/admin/*
-- and src/lib/ai/*, both of which use the service-role client and therefore
-- bypass RLS. Locking them down cannot regress the public site.
--
-- `booking_statuses` additionally has no application readers at all; it is
-- purely an FK target for bookings.status. Enabling RLS on a referenced table
-- does not affect FK constraint checks, so the 40+ existing booking statuses
-- (including the staged_unsent / pending_human_review gate states added in
-- migration 028) continue to resolve normally.
--
-- is_staff_user() is defined in migration 016 and treats admin / editor / agent
-- as staff.

-- ─── booking_statuses ──────────────────────────────────────────────────────
ALTER TABLE public.booking_statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read booking statuses" ON public.booking_statuses;
CREATE POLICY "Staff read booking statuses"
  ON public.booking_statuses FOR SELECT USING (public.is_staff_user());

-- ─── expense_categories ────────────────────────────────────────────────────
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage expense categories" ON public.expense_categories;
CREATE POLICY "Staff manage expense categories"
  ON public.expense_categories FOR ALL USING (public.is_staff_user());

-- ─── payment_methods ───────────────────────────────────────────────────────
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage payment methods" ON public.payment_methods;
CREATE POLICY "Staff manage payment methods"
  ON public.payment_methods FOR ALL USING (public.is_staff_user());

-- ─── supplier_categories ───────────────────────────────────────────────────
ALTER TABLE public.supplier_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage supplier categories" ON public.supplier_categories;
CREATE POLICY "Staff manage supplier categories"
  ON public.supplier_categories FOR ALL USING (public.is_staff_user());

-- ─── Verification query (expect 44 rows, all rls = true) ───────────────────
-- SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
-- FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relkind = 'r'
-- ORDER BY c.relname;

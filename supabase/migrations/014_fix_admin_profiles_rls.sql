-- Trippa Luxury Travel Platform - Fix Admin Profiles RLS
-- The previous policy used a self-referencing subquery causing infinite recursion:
--   "infinite recursion detected in policy for relation 'admin_profiles'"
--
-- Fix: Use a SECURITY DEFINER function to break the recursion, and allow
--       users to SELECT their own admin_profiles row directly.

-- ─── Drop recursive policy ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin full access to admin profiles" ON admin_profiles;

-- ─── Non-recursive helper function ─────────────────────────────────────
-- Runs as the function owner (superuser/bypasses RLS) so it can query
-- admin_profiles without triggering the RLS policy again.
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ─── New policies ──────────────────────────────────────────────────────

-- 1. Any authenticated user can read their OWN admin profile row.
--    This is what requireAdmin() does: SELECT role WHERE id = $userId.
CREATE POLICY "Users can read own admin profile"
  ON admin_profiles FOR SELECT
  USING (id = auth.uid());

-- 2. Users with admin role can manage ALL admin_profiles rows.
--    Uses the SECURITY DEFINER function to avoid recursive policy trigger.
CREATE POLICY "Admin users can manage all profiles"
  ON admin_profiles FOR ALL
  USING (public.is_admin_user());

-- 3. Allow INSERT during sign-up / admin creation (needed for registration flow)
CREATE POLICY "Service can insert admin profiles"
  ON admin_profiles FOR INSERT
  WITH CHECK (true);

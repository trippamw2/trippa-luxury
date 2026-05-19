-- Trippa Luxury Travel Platform - RLS Policy Fixes
-- Adds missing admin policies for blog_posts, media_assets, newsletter_subscribers

-- ─── BLOG POSTS ──────────────────────────────────────────────────────────
-- Missing: Admin full access policy (only public SELECT exists)

CREATE POLICY "Admin full access to blog posts"
  ON blog_posts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'editor')
    )
  );

-- ─── MEDIA ASSETS ────────────────────────────────────────────────────────
-- Missing: Admin full access policy AND public SELECT for active images

CREATE POLICY "Admin full access to media assets"
  ON media_assets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Public can view media assets"
  ON media_assets FOR SELECT
  USING (type = 'image');

-- ─── NEWSLETTER SUBSCRIBERS ──────────────────────────────────────────────
-- Missing: Admin full access policy (only public INSERT exists)

CREATE POLICY "Admin full access to newsletter subscribers"
  ON newsletter_subscribers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin')
    )
  );

-- ─── ADMIN PROFILES ──────────────────────────────────────────────────────
-- Missing: Admin full access policy

CREATE POLICY "Admin full access to admin profiles"
  ON admin_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin')
    )
  );

-- Trippa Luxury Travel Platform - Platform Settings
-- Simple key-value store for admin-configurable settings

CREATE TABLE IF NOT EXISTS platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES admin_profiles(id)
);

-- Seed defaults
INSERT INTO platform_settings (key, value) VALUES
  ('site_name', 'Kivara'),
  ('whatsapp_number', '+27871234567'),
  ('contact_email', 'concierge@kivara.luxury'),
  ('default_currency', 'USD')
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'platform_settings'
    AND policyname = 'Admin full access to platform settings'
  ) THEN
    CREATE POLICY "Admin full access to platform settings"
      ON platform_settings FOR ALL
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

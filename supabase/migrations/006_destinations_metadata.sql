-- Trippa Luxury Travel Platform - Destinations Metadata
-- Lightweight table for destination-level metadata (descriptions, images, highlights)

CREATE TABLE IF NOT EXISTS destinations (
  slug VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  hero_image TEXT,
  highlights JSONB DEFAULT '[]',
  seasons JSONB DEFAULT '[]',       -- e.g. [{"name": "Peak", "months": "Jun-Oct"}, ...]
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed defaults from existing destinations
INSERT INTO destinations (slug, name, sort_order) VALUES
  ('lake-malawi', 'Lake Malawi', 1),
  ('south-luangwa', 'South Luangwa', 2),
  ('zanzibar', 'Zanzibar', 3)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view destinations"
  ON destinations FOR SELECT USING (true);

CREATE POLICY "Admin full access to destinations"
  ON destinations FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'editor')
    )
  );

CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON destinations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

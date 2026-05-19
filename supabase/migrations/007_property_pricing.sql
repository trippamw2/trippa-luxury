-- Trippa Luxury Travel Platform - Property Pricing
-- Stores per-property pricing rules for the pricing engine

CREATE TABLE IF NOT EXISTS property_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  base_rate DECIMAL(12,2),
  peak_surcharge DECIMAL(5,2) DEFAULT 25.00,
  low_season_discount DECIMAL(5,2) DEFAULT 20.00,
  smart_price DECIMAL(12,2),
  currency VARCHAR(10) DEFAULT 'USD',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE property_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to property pricing"
  ON property_pricing FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'editor')
    )
  );

CREATE TRIGGER update_property_pricing_updated_at
  BEFORE UPDATE ON property_pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

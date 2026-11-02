-- 045: Attribution columns for inquiries and leads.
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS attribution JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS attribution JSONB;

COMMENT ON COLUMN inquiries.attribution IS 'Sanitized UTM/referrer/landing-page capture from the public inquiry form.';
COMMENT ON COLUMN leads.attribution IS 'Attribution carried through from the originating inquiry.';
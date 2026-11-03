-- 052: Ensure the supplier compliance document bucket exists.
-- Uploads create the bucket lazily, but a missing bucket is a readiness gap:
-- the storage layer should be provisioned with the schema, not on first use.
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-docs', 'supplier-docs', false)
ON CONFLICT (id) DO NOTHING;

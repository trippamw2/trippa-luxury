-- Trippa Luxury Travel Platform - Curated Journey Collection
-- The `packages` table stores Kivara's curated journeys. Two new columns
-- support the curated portfolio:
--   * `excludes`    - JSONB companion to `inclusions` (what the journey does not cover)
--   * `collection`  - groups journeys into the four curated collections:
--                     romance, safari, beach-island, bespoke

-- ─── Add columns ────────────────────────────────────────────────────────
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS excludes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS collection VARCHAR(80) DEFAULT 'bespoke';

-- ─── Index for collection filtering ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_packages_collection ON packages (collection);

-- ─── Backfill existing rows into the Romance Collection ─────────────────
-- Pre-curation packages were all couple-focused journeys; the curated
-- constant set is the source of truth and will overwrite these on merge,
-- but a sensible default keeps the data coherent.
UPDATE packages
  SET collection = 'romance'
  WHERE collection = 'bespoke';
